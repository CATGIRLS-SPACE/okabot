import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GetUserProfile, UpdateUserProfile, USER_PROFILE } from "../user/prefs";


const CHAR_UNFILLED = '░';
const CHAR_FILLED   = '█';

export function CalculateTargetXP(level: number): number {
    return Math.floor(((level*level) * 4) + (15*level) + 81); // start at 100
}

function CreateLevelBar(profile: USER_PROFILE): string {
    let bar = '**[**';
    const needed_xp = CalculateTargetXP(profile.level.level);
    const target_chars = 20;
    const filled_chars = Math.round((profile.level.current_xp/needed_xp) * target_chars);
    const unfilled_chars = target_chars - filled_chars;

    for (let i = 0; i < filled_chars; i++)
        bar += CHAR_FILLED;

    for (let i = 0; i < unfilled_chars; i++)
        bar += CHAR_UNFILLED;
    
    bar += '**]**';

    return bar;
}


export function HandleCommandLevel(interaction: ChatInputCommandInteraction) {
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
    const bar = CreateLevelBar(profile);

    if (user_to_get.id != interaction.user.id) return interaction.reply({
            content:`**${user_to_get.displayName}** is currently at level **${profile.level.level}**.\n${bar} **${profile.level.current_xp}XP** / **${target_xp}XP**`,
            flags: [MessageFlags.SuppressNotifications]
    });

    interaction.reply({
        content:`**${interaction.user.displayName}**, you're currently at level **${profile.level.level}**. You need **${target_xp-profile.level.current_xp}XP** to level up.\n${bar} **${profile.level.current_xp}XP** / **${target_xp}XP**\n\nYou can earn XP by chatting in the server.\n-# XP Gain is limited to between 3-10xp for each message, with a cooldown of 30s.`,
        flags: [MessageFlags.SuppressNotifications]
    });
}

export function CalculateOkashReward(level: number): number {
    return 100 * level + 500;
}