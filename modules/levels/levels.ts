import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    Locale,
    MessageFlags,
    SlashCommandBuilder,
    Snowflake, User
} from "discord.js";
import { CheckForProfile, GetUserProfile, UpdateUserProfile, USER_PROFILE } from "../user/prefs";
import {BASE_DIRNAME, CONFIG, DEV} from "../../index";
import { join, resolve } from "path";
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { CanvasRenderingContext2D, createCanvas, loadImage } from "canvas";


const BAR_COLORS: {
    [key: string]: {bg:string,fg:string}
} = {
    'OKABOT':{bg:'#44384d',fg:'#9d60cc'},
    'RED':{bg:'#4d3838',fg:'#cc6060'},
    'BLUE':{bg:'#3a384d',fg:'#6072cc'},
    'GREEN':{bg:'#384d38',fg:'#60cc6b'},
    'PINK':{bg:'#4d384b',fg:'#cc60aa'},
};

const LEVEL_DICTIONARY = [
    {name:{en:'Kitten',ja:'子猫'},levels:5},
    {name:{en:'Catgirl',ja:'ネコ'},levels:5},
    {name:{en:'Silver Bell Trainee',ja:'銀色のベル訓練生'},levels:10},
    {name:{en:'Silver Bell Holder',ja:'銀色のベル持ち'},levels:10},
    {name:{en:'Gold Bell Trainee',ja:'金色のベル訓練生'},levels:10},
    {name:{en:'Gold Bell Holder',ja:'金色のベル持ち'},levels:10},
    {name:{en:'Waitress First',ja:'ウェイトレス A'},levels:10},
    {name:{en:'Waitress Second',ja:'ウェイトレス B'},levels:10},
    {name:{en:'Delivery Maine Coon',ja:'配達員のメインクーン'},levels:10},
    {name:{en:'Tea-Brewing American Curl',ja:'お茶のアメリカンカール'},levels:10},
    {name:{en:'Custard Munchkin',ja:'カスタードのマンチカン'},levels:10},
    {name:{en:'Strawberry Polishing Scottish Fold',ja:'イチゴのスコティッシュフォールド'},levels:10},
    {name:{en:'Blogger',ja:''},levels:25},
    {name:{en:'Chinchilla Persian',ja:''},levels:25},
    {name:{en:'Bakery Mentor',ja:''},levels:25},
    {name:{en:'I don\'t know what to call this level, but no one has this level yet, so I don\'t care yet',ja:''},levels:25},
];

// create appropriate level names on boot
const ROMAN_NUMERALS = [
    'I','II','III','IV','V','VI','VII','VIII','IX','X',
    'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX',
    'XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX',
]; // im lazy
export const LEVEL_NAMES_EN: Array<string> = [];
export const LEVEL_NAMES_JA: Array<string> = [];

LEVEL_DICTIONARY.forEach(item => {
    for (let i = 1; i <= item.levels; i++) LEVEL_NAMES_EN.push(`${item.name.en} ${ROMAN_NUMERALS[i-1]}`);
    for (let i = 1; i <= item.levels; i++) LEVEL_NAMES_JA.push(`${item.name.ja} ${ROMAN_NUMERALS[i-1]}`);
});


// for legacy bar

const CHAR_UNFILLED = '░';
const CHAR_FILLED   = '█';
const PARTIAL_BLOCKS = ['░', '▒', '▒', '▒', '▒', '▓', '▓', '▓', '▓']; // Partial fill levels

export function CalculateTargetXP(level: number, prestige: number = 0): number {
    const base = prestige * 3600;
    const amount = Math.floor(100+(35*(level-1)));
    return amount<100?100:amount; // start at 100
}

function CreateLevelBar(profile: USER_PROFILE): string {
    let bar = '**[**';
    const needed_xp = CalculateTargetXP(profile.leveling.level, 0);
    const target_chars = 20;
    const progress_ratio = profile.leveling.current_xp / needed_xp;
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

// -- new things --

export enum STICKER {
    CHERRY_BLOSSOM,
    OKASH,
    TRANS_FLAG,
    APPLE,
    GRAPE,
    GEM,
    CAT_MONEY_EYES,
    CAT_RAISED,
    CAT_SUNGLASSES,
    SHOP_VOUCHER,
    COIN,
    COIN_BLUE,
    COIN_DBLUE,
    COIN_DGREEN,
    COIN_WEIGHTED,
    COIN_PINK,
    COIN_PURPLE,
    COIN_RED,
}

export interface BannerSticker {
    sticker: STICKER,
    position_x: number,
    position_y: number,
    other_data?: string
}

const COOLDOWNS = new Map<Snowflake, number>();

export async function generateLevelBanner(interaction: ChatInputCommandInteraction, profile: USER_PROFILE, override_user_with?: User | undefined, preview_sticker?: BannerSticker): Promise<boolean | undefined> {
    const d = new Date();
    if (d.getTime()/1000 < (COOLDOWNS.get(interaction.user.id) || 0) && !DEV && !preview_sticker) {
        interaction.reply({
            content: `:hourglass: Slow down, **${interaction.user.displayName}**! You *just* ran this command!`
        });
        return true;
    }

    COOLDOWNS.set(interaction.user.id, Math.round(d.getTime()/1000) + 30);

    if (!interaction.replied) await interaction.deferReply();
    if (override_user_with) interaction.user = override_user_with;

    const supporter = GetUserSupportStatus(interaction.user.id);
    const user_is_booster = supporter == 'booster';
    const dev_status = GetUserDevStatus(interaction.user.id);
    const tester_status = GetUserTesterStatus(interaction.user.id);

    // if (profile.leveling.level > 100) profile.leveling.prestige = 1;

    let LEVEL_NAMES = {'en-US':LEVEL_NAMES_EN,'en-GB':LEVEL_NAMES_EN,'ja':LEVEL_NAMES_JA}[interaction.okabot.translateable_locale];
    let LEVEL_NAME;
    if (!LEVEL_NAMES) LEVEL_NAME = await LangGetAutoTranslatedStringRaw(LEVEL_NAMES_EN[profile.leveling.level - 1], interaction.okabot.translateable_locale);
    else LEVEL_NAME = LEVEL_NAMES[profile.leveling.level - 1];

    const width = 600; // Banner width
    const height = 150; // Banner height
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    let bar_color = BAR_COLORS['OKABOT']; // default
    let num_color = '#fff';
    if (profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED)) bar_color = BAR_COLORS['RED'];
    if (profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE)) bar_color = BAR_COLORS['BLUE'];
    if (profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN)) bar_color = BAR_COLORS['GREEN'];
    if (profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK)) bar_color = BAR_COLORS['PINK'];

    if (profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM)) {
        bar_color = {
            bg: profile.customization.level_banner.hex_bg,
            fg: profile.customization.level_banner.hex_fg,
        };
        num_color = profile.customization.level_banner.hex_num;
    }

    // Background color
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#271e2e');
    gradient.addColorStop(1, '#3c3245');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // why do we have to force fetch the user? idk, it's dumb
    let banner_url = await interaction.client.users.fetch(interaction.user.id, {force: true}).then(user => user.bannerURL({extension:'png', size:1024})); // 1024x361
    if (!override_user_with && profile.customization.level_bg_override != '') {
        banner_url = profile.customization.level_bg_override;
        console.log(`profile banner override is selected: ${banner_url}`)
    }
    // if the user has a banner + unlocked the user banner ability
    if (banner_url && profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_USER)) {
        const banner_buffer = await fetchImage(banner_url);
        const banner_img = await loadImage(banner_buffer);
        // ctx.drawImage(banner_img, (600-1024)/2, (150-361)/2);
        console.log('before:', banner_img.width, banner_img.height);
        let new_width = 600;
        let new_height = banner_img.height * (600/banner_img.width); // i cant anymore
        console.log('after:', new_width, new_height);
        ctx.drawImage(banner_img, 0, Math.round((height-new_height)/2), new_width, Math.round(new_height));
        // darken with a slightly-transparent rectangle
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, width, height);
    }

    // User profile photo because we're gangsta like that
    const pfp_url = interaction.user.avatarURL({extension:'png', size:128})!;
    const pfp_buffer = await fetchImage(pfp_url);
    const pfp_img = await loadImage(pfp_buffer);
    ctx.save();
    ctx.beginPath();
    // level bar ends at x=580
    ctx.roundRect(580-90, 15, 90, 90, 12);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(pfp_img, 580-90, 15, 90, 90);
    ctx.restore();
    ctx.fillStyle = '#ffffff00';
    ctx.fill();
    // labels
    let offset_width = 0; // so that we can display the booster tag no matter what
    if (CONFIG.permitted_to_use_shorthands.includes(interaction.user.id)) {
        ctx.fillStyle = '#f56e6eff';
        ctx.beginPath();
        ctx.roundRect(20, 52, 90, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffffff';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#ffffffff';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('MODERATOR', offset_width + 26, 68);
        offset_width += 97;
    }
    if (dev_status != 'none') {
        ctx.fillStyle = dev_status=='contributor'?'#6eeaf5':'#6ef5b6';
        ctx.beginPath();
        ctx.roundRect(offset_width + 20, 52, 88, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1b3b2c';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#1b3b2c';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('DEVELOPER', offset_width + 26, 68);
        offset_width += 95;
    }
    // bugtest
    if (tester_status == 'cgc-beta') {
        ctx.fillStyle = '#876ef5';
        ctx.beginPath();
        ctx.roundRect(offset_width + 20, 52, 62, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1b1630';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#1b1630';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('LEGACY', offset_width + 26, 68);
        offset_width += 72-5;
    }
    if (tester_status == 'public') {
        ctx.fillStyle = '#876ef5';
        ctx.beginPath();
        ctx.roundRect(offset_width + 20, 52, 62, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1b1630';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#1b1630';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('TESTER', offset_width + 26, 68);
        offset_width += 72-5;
    }
    if (supporter == 'ko-fi') {
        ctx.fillStyle = '#fa9de4';
        ctx.beginPath();
        ctx.roundRect(offset_width + 20, 52, 73, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#422a3d';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#422a3d';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('DONATOR', offset_width + 26, 68);
        offset_width += 83-5;
    }
    if (supporter == 'granted') {
        ctx.fillStyle = '#9dfab4ff';
        ctx.beginPath();
        ctx.roundRect(offset_width + 20, 52, 64, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#2a422cff';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#2a422cff';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('SPECIAL', offset_width + 26, 68);
        offset_width += 74-5;
    }
    if (user_is_booster) {
        ctx.fillStyle = '#fa9de4';
        ctx.beginPath();
        ctx.roundRect(offset_width + 20, 52, 73, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#422a3d';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#422a3d';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('BOOSTER', offset_width + 26, 68);
        offset_width += 63-5;
    }
    if (DEV || CheckCompletionist(interaction.user.id)) {
        ctx.fillStyle = '#82cf93ff';
        ctx.beginPath();
        ctx.roundRect(offset_width + 20, 52, 79, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#2a422fff';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#253829ff';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('COMPLETE', offset_width + 26, 68);
    }
    

    // User Name
    ctx.font = "28px azuki_font, Arial, 'Segoe UI Emoji'";
    // background
    ctx.fillStyle = '#3d3d3d';
    ctx.fillText(`✨ ${interaction.user.displayName} ✨`, 19, 43);
    // foreground
    ctx.fillStyle = user_is_booster?'#f5a6ff':'#edf2f4';
    ctx.fillText(`✨ ${interaction.user.displayName} ✨`, 16, 40);

    // Level
    ctx.font = interaction.okabot.translateable_locale=='ru'?"20px Arial, 'Segoe UI Emoji'":"20px azuki_font, Arial, 'Segoe UI Emoji'";
    // bg
    ctx.fillStyle = '#3d3d3d';
    ctx.fillText(`🌠 ${LEVEL_NAME} (${profile.leveling.level})`, 23, 103);
    // fg
    ctx.fillStyle = '#f0c4ff';
    ctx.fillText(`🌠 ${LEVEL_NAME} (${profile.leveling.level})`, 20, 100);

    // XP Bar Background
    const barX = 20;
    const barY = 110;
    const barWidth = 560;
    const barHeight = 25;
    ctx.fillStyle = bar_color.bg;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 8);
    ctx.fill();

    // XP Bar Progress
    const progressRatio = profile.leveling.current_xp / CalculateTargetXP(profile.leveling.level, 0);
    if (progressRatio * barWidth > 16) {
        ctx.fillStyle = bar_color.fg;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth * progressRatio, barHeight, 8);
        ctx.fill();
    }

    // XP Text
    ctx.font = '16px azuki_font, bold Arial';
    ctx.fillStyle = num_color;
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.floor(profile.leveling.current_xp)} XP`, barX + 10, barY + 19);
    ctx.textAlign = 'right';
    ctx.fillText(`${CalculateTargetXP(profile.leveling.level, 0)} XP`, barWidth + 10, barY + 19);

    const stickers = [
        "cherry-blossom.png",
        "okash.png",
        "transgender_flag.png",
        "apple.png",
        "grapes.png",
        "gem.png",
        "cat_money_eyes.png",
        "cat_raised.png",
        "emoji-mashup.png",
        "Shop voucher.png",
        "cff.png",
        "cff_blue.gif",
        "cff_dblue.gif",
        "cff_dgreen.gif",
        "cff_green.gif",
        "cff_pink.gif",
        "cff_purple.gif",
        "cff_red.gif",
    ];

    for (const sticker of profile.customization.stickers) {
        const sticker_img = await loadImage(readFileSync(join(BASE_DIRNAME, 'assets', 'art', stickers[sticker.sticker])));
        ctx.drawImage(sticker_img, sticker.position_x, sticker.position_y, 50, sticker.sticker==9?26:50);
    }
    if (preview_sticker) {
        const sticker_img = await loadImage(readFileSync(join(BASE_DIRNAME, 'assets', 'art', stickers[preview_sticker.sticker])));
        ctx.drawImage(sticker_img, preview_sticker.position_x, preview_sticker.position_y, 50, preview_sticker.sticker==9?26:50);
    }

    // sticker demo
    // const sticker = await loadImage(readFileSync(join(BASE_DIRNAME, 'assets', 'art', 'okash.png')));
    // ctx.drawImage(sticker, width-150, height-100, 64, 64);
    

    // Save the image
    const buffer = canvas.toBuffer('image/png');
    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
    writeFileSync(join(BASE_DIRNAME, 'temp', 'level-banner.png'), buffer);
}


export async function HandleCommandLevel(interaction: ChatInputCommandInteraction) {
    const user_to_get = interaction.options.getUser('user') || interaction.user;

    if (!CheckForProfile(user_to_get.id)) return interaction.reply({
        content:':x: That user doesn\'t exist.'
    });

    const profile = GetUserProfile(user_to_get.id);

    if (interaction.options.getSubcommand(true) == 'background') {
        if (!profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_USER)) return interaction.reply({
            content:':crying_cat_face: Sorry, but you need to buy the User Banner Level Background customization before you can use this!',
            flags: [MessageFlags.SuppressNotifications]
        });

        profile.customization.level_bg_override = interaction.options.getString('link') || '';
        UpdateUserProfile(interaction.user.id, profile);

        return interaction.reply({
            content:`${GetEmoji(EMOJI.CAT_SUNGLASSES)} Updated your profile accordingly!`,
            flags: [MessageFlags.SuppressNotifications]
        });
    }

    if (interaction.options.getSubcommand(true) == 'sticker') return item_sticker(interaction);

    if (!profile.leveling) {
        profile.leveling = {
            level: 1,
            current_xp: 0
        }
        UpdateUserProfile(user_to_get.id, profile);
    }

    const return_out = await generateLevelBanner(interaction, profile, user_to_get!=interaction.user?user_to_get:undefined);
    if (return_out) return;
    const image = new AttachmentBuilder(join(BASE_DIRNAME, 'temp', 'level-banner.png'));
    interaction.editReply({
        content: `-# XP Gain is limited to between 3-10xp for each message, with a cooldown of 30s.`,
        files: [image]
    });
}

export function CalculateOkashReward(level: number): number {
    return Math.floor((500 * level + 500) * 3/5);
}

export function Dangerous_WipeAllLevels() {
    const PROFILES_DIR = join(BASE_DIRNAME, 'profiles');

    readdirSync(PROFILES_DIR).forEach(file => {
        const user_id = file.split('.oka')[0];
        console.log(`${user_id} ...`);
        const profile = GetUserProfile(user_id);
        profile.leveling = {
            current_xp: 0,
            level: 1
        };
        UpdateUserProfile(user_id, profile);
        console.log(`Wiped level data in file ${file}`);
    });
}


import axios from 'axios';
import { CUSTOMIZATION_UNLOCKS } from "../okash/items";
import {LangGetAutoTranslatedString, LangGetAutoTranslatedStringRaw} from "../../util/language";
import {GetUserDevStatus, GetUserSupportStatus, GetUserTesterStatus} from "../../util/users";
import { EMOJI, GetEmoji } from "../../util/emoji";
import { item_sticker } from "../interactions/use";
import { CheckCompletionist } from "../passive/achievement";

export async function fetchImage(url: string) {
    const response = await axios.get(url, {responseType: 'arraybuffer'});
    return Buffer.from(response.data, 'binary');   
}




export const LevelSlashCommand = new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Commands related to your profile')
    .addSubcommand(sc => sc
        .setName('level')
        .setDescription('Show your okabot profile banner')
        .addUserOption(option => option
            .setName('user')
            .setDescription('Get another user\'s profile info')
            .setRequired(false))
        )
    .addSubcommand(sc => sc
        .setName('background')
        .setDescription('Set an alternative background for the User Banner Level Background unlock.')
        .addStringOption(option => option
            .setName('link')
            .setDescription('The link to the image, preferrably 1024x361. Leave blank to disable.')
            .setRequired(false)
        )
    ).addSubcommand(sc => sc
        .setName('sticker')
        .setDescription('Add a sticker to your level banner.')
        .addNumberOption(option => option
            .setName('x-pos')
            .setDescription('How many pixels right to put the sticker.')
            .setRequired(true)
            .setMinValue(0).setMaxValue(600)
        )
        .addNumberOption(option => option
            .setName('y-pos')
            .setDescription('How many pixels down to put the sticker.')
            .setRequired(true)
            .setMinValue(0).setMaxValue(150)
        )
    );
