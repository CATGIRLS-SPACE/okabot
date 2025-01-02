import { AttachmentBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GetUserProfile, UpdateUserProfile, USER_PROFILE } from "../user/prefs";
import { BASE_DIRNAME } from "../..";
import { join, resolve } from "path";
import { createWriteStream, existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { createCanvas, loadImage } from "canvas";


const CHAR_UNFILLED = '░';
const CHAR_FILLED   = '█';
const PARTIAL_BLOCKS = ['░', '▒', '▒', '▒', '▒', '▓', '▓', '▓', '▓']; // Partial fill levels

export function CalculateTargetXP(level: number): number {
    return Math.floor(((level*level) * 4) + (15*level) + 81); // start at 100
}

function CreateLevelBar(profile: USER_PROFILE): string {
    let bar = '**[**';
    const needed_xp = CalculateTargetXP(profile.level.level);
    const target_chars = 20;
    const progress_ratio = profile.level.current_xp / needed_xp;
    const total_filled_chars = progress_ratio * target_chars;
    const filled_full = Math.floor(total_filled_chars); // Full blocks
    const partial_fill = Math.round((total_filled_chars - filled_full) * 8); // Partial fill (0-8)
    const unfilled_chars = target_chars - filled_full - 1;

    // Add full blocks
    for (let i = 0; i < filled_full; i++) {
        bar += CHAR_FILLED;
    }

    // Add a partial block if applicable
    if (partial_fill > 0) {
        bar += PARTIAL_BLOCKS[partial_fill];
    }

    // Add unfilled blocks
    for (let i = 0; i < unfilled_chars; i++) {
        bar += CHAR_UNFILLED;
    }

    bar += '**]**';

    return bar;
}

import * as client from 'https';

async function generateLevelBanner(interaction: ChatInputCommandInteraction, profile: USER_PROFILE) {
    const width = 600; // Banner width
    const height = 150; // Banner height
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background color
    ctx.fillStyle = '#2b2d42';
    ctx.fillRect(0, 0, width, height);

    // why do we have to force fetch the user? idk, it's dumb
    const banner_url = await interaction.client.users.fetch(interaction.user.id, {force: true}).then(user => user.bannerURL({extension:'png', size:1024})); // 1024x361
    if (banner_url) {
        const banner_buffer = await fetchImage(banner_url);
        const banner_img = await loadImage(banner_buffer);
        ctx.drawImage(banner_img, (600-1024)/2, (150-361)/2);
        // darken with a slightly-transparent rectangle
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, width, height);
    }

    // User profile photo because we're gangsta like that
    const pfp_url = interaction.user.avatarURL({extension:'png', size:128})!;
    const pfp_buffer = await fetchImage(pfp_url);
    const pfp_img = await loadImage(pfp_buffer);
    ctx.drawImage(pfp_img, 560-66, 20, 80, 80);
    

    // User Name
    ctx.font = "28px azuki_font, Arial, 'Segoe UI Emoji'";
    ctx.fillStyle = '#edf2f4';
    ctx.fillText(`🐾✨ ${interaction.user.displayName} ✨🐾`, 20, 42);

    // Level
    ctx.font = "24px azuki_font, Arial, 'Segoe UI Emoji'";
    ctx.fillStyle = '#8d99ae';
    ctx.fillText(`🌠 Level ${profile.level.level}`, 20, 90);

    // XP Bar Background
    const barX = 20;
    const barY = 110;
    const barWidth = 560;
    const barHeight = 25;
    ctx.fillStyle = '#44384d';
    ctx.roundRect(barX, barY, barWidth, barHeight, 8);
    ctx.fill();

    // XP Bar Progress
    const progressRatio = profile.level.current_xp / CalculateTargetXP(profile.level.level);
    ctx.fillStyle = '#9d60cc';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progressRatio, barHeight, 8);
    ctx.fill();

    // XP Text
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#edf2f4';
    ctx.textAlign = 'left';
    ctx.fillText(`${profile.level.current_xp} XP`, barX + 10, barY + 19);
    ctx.textAlign = 'right';
    ctx.fillText(`${CalculateTargetXP(profile.level.level)} XP`, barWidth + 10, barY + 19);

    // Save the image
    const buffer = canvas.toBuffer('image/png');
    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
    writeFileSync(join(BASE_DIRNAME, 'temp', 'level-banner.png'), buffer);
}


export async function HandleCommandLevel(interaction: ChatInputCommandInteraction) {
    const user_to_get = interaction.options.getUser('user') || interaction.user;

    const profile = GetUserProfile(user_to_get.id);

    if (!profile.level) {
        profile.level = {
            level: 1,
            current_xp: 0
        }
        UpdateUserProfile(user_to_get.id, profile);
    }

    const target_xp = CalculateTargetXP(profile.level.level);

    if (user_to_get.id != interaction.user.id) return interaction.reply({
            content:`**${user_to_get.displayName}** is currently at level **${profile.level.level}**.\n${CreateLevelBar(profile)} **${profile.level.current_xp}XP** / **${target_xp}XP**`,
            flags: [MessageFlags.SuppressNotifications]
    });

    await generateLevelBanner(interaction, profile);
    const image = new AttachmentBuilder(join(BASE_DIRNAME, 'temp', 'level-banner.png'));
    interaction.reply({
        content:`-# XP Gain is limited to between 3-10xp for each message, with a cooldown of 30s.`,
        flags: [MessageFlags.SuppressNotifications],
        files: [image]
    });
}

export function CalculateOkashReward(level: number): number {
    return Math.floor((100 * level + 500) / 5);
}

export function Dangerous_WipeAllLevels() {
    const PROFILES_DIR = join(BASE_DIRNAME, 'profiles');

    readdirSync(PROFILES_DIR).forEach(file => {
        const user_id = file.split('.oka')[0];
        console.log(`${user_id} ...`);
        const profile = GetUserProfile(user_id);
        profile.level = {
            current_xp: 0,
            level: 1
        };
        UpdateUserProfile(user_id, profile);
        console.log(`Wiped level data in file ${file}`);
    });
}


import axios from 'axios';

async function fetchImage(url: string) {
    const response = await axios.get(url, {responseType: 'arraybuffer'});
    return Buffer.from(response.data, 'binary');   
}