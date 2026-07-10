import {
    ApplicationIntegrationType,
    AttachmentBuilder,
    ChatInputCommandInteraction,
    InteractionContextType,
    MessageFlags,
    SlashCommandBuilder,
    Snowflake,
    User
} from "discord.js";
import {CheckForProfile, FLAG, GetUserProfile, UpdateUserProfile, USER_PROFILE} from "../user/prefs";
import {BASE_DIRNAME, CONFIG, DEV} from "../../index";
import {join} from "path";
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "fs";
import {createCanvas, loadImage} from "canvas";
import axios from 'axios';
import {CUSTOMIZATION_UNLOCKS} from "../okash/items";
import {GetUserDevStatus, GetUserSupportStatus, GetUserTesterStatus} from "../../util/users";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {item_sticker} from "../interactions/use";
import {CheckCompletionist} from "../passive/achievement";
import {spawn} from "child_process";
import {t} from "../i18n/translation";


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
    {name:{key:'level.names.kitten',en:'Kitten',ja:'子猫'},levels:5},
    {name:{key:'level.names.catgirl',en:'Catgirl',ja:'ネコ'},levels:5},
    {name:{key:'level.names.silver_bell_trainee',en:'Silver Bell Trainee',ja:'銀色のベル訓練生'},levels:10},
    {name:{key:'level.names.silver_bell_holder',en:'Silver Bell Holder',ja:'銀色のベル持ち'},levels:10},
    {name:{key:'level.names.gold_bell_trainee',en:'Gold Bell Trainee',ja:'金色のベル訓練生'},levels:10},
    {name:{key:'level.names.gold_bell_holder',en:'Gold Bell Holder',ja:'金色のベル持ち'},levels:10},
    {name:{key:'level.names.waitress_i',en:'Waitress First',ja:'ウェイトレス A'},levels:10},
    {name:{key:'level.names.waitress_ii',en:'Waitress Second',ja:'ウェイトレス B'},levels:10},
    {name:{key:'level.names.mainecoon',en:'Delivery Maine Coon',ja:'配達員のメインクーン'},levels:10},
    {name:{key:'level.names.americancurl',en:'Tea-Brewing American Curl',ja:'お茶のアメリカンカール'},levels:10},
    {name:{key:'level.names.munchkin',en:'Custard Munchkin',ja:'カスタードのマンチカン'},levels:10},
    {name:{key:'level.names.scottishfold',en:'Strawberry Polishing Scottish Fold',ja:'イチゴのスコティッシュフォールド'},levels:10},
    {name:{key:'level.names.blogger',en:'Blogger',ja:''},levels:25},
    {name:{key:'level.names.persian',en:'Chinchilla Persian',ja:''},levels:25},
    {name:{key:'level.names.mentor',en:'Bakery Mentor',ja:''},levels:25},
    {name:{key:'level.names.notsure',en:'I don\'t know what to call this level, but no one has this level yet, so I don\'t care yet',ja:''},levels:25},
];

// create appropriate level names on boot
const ROMAN_NUMERALS = [
    'I','II','III','IV','V','VI','VII','VIII','IX','X',
    'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX',
    'XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX',
]; // im lazy
export const LEVEL_NAMES_EN: Array<string> = [];
export const LEVEL_NAMES_JA: Array<string> = [];
export const LEVEL_NAMES_KEYS: Array<string> = [];
const ROMAN_NUMERAL_KEYS: Array<string> = [];

LEVEL_DICTIONARY.forEach(item => {
    for (let i = 1; i <= item.levels; i++) LEVEL_NAMES_EN.push(`${item.name.en} ${ROMAN_NUMERALS[i-1]}`);
    for (let i = 1; i <= item.levels; i++) LEVEL_NAMES_JA.push(`${item.name.ja} ${ROMAN_NUMERALS[i-1]}`);
    for (let i = 1; i <= item.levels; i++) {
        LEVEL_NAMES_KEYS.push(item.name.key);
        ROMAN_NUMERAL_KEYS.push(ROMAN_NUMERALS[i-1]);
    }
});

export function CalculateTargetXP(level: number): number {
    const amount = Math.floor(100+(35*(level-1)));
    return Math.max(100, amount); // start at 100
}

export function CalculateTargetXPV2(level: number): number {
    return Math.floor(100 + 20 * level + 0.5 * level * level);
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
            content: await t('system.errors.command.rate_limit', interaction.okabot.translateable_locale, {
                user: interaction.user.displayName
            })
        });
        return true;
    }

    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));

    COOLDOWNS.set(interaction.user.id, Math.round(d.getTime()/1000) + 30);

    if (!interaction.replied) await interaction.deferReply();
    if (override_user_with) interaction.user = override_user_with;

    const supporter = GetUserSupportStatus(interaction.user.id);
    const user_is_booster = supporter == 'booster';
    const dev_status = GetUserDevStatus(interaction.user.id);
    const tester_status = GetUserTesterStatus(interaction.user.id);

    let trigger_splatoon = false;

    if (profile.flags.includes(FLAG.TRIGGER_SPLATOON_EASTER_EGG) && interaction.okabot.translateable_locale.includes('en')) {
        trigger_splatoon = true;
        profile.flags.splice(profile.flags.indexOf(FLAG.TRIGGER_SPLATOON_EASTER_EGG), 1);
        UpdateUserProfile(interaction.user.id, profile);
    }

    const LEVEL_NAME = `${await t(LEVEL_NAMES_KEYS[profile.leveling.level - 1], interaction.okabot.translateable_locale)}`;

    const USER_TITLE = await t(`achievements.${profile.customization.level_banner.selected_title}.title`, interaction.okabot.translateable_locale);

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

    let banner_url = await interaction.client.users.fetch(interaction.user.id, {force: true}).then(user => user.bannerURL({extension:'png', size:1024})); // 1024x361
    let IS_GIF_BANNER = false;
    
    if (banner_url == null) {
        let resp = await fetch(`https://usrbg.is-hardly.online/usrbg/v2/${interaction.user.id}`, {method: 'HEAD'});
        if (!resp.ok) banner_url = null;
        // user has a USRBG banner
        banner_url = `https://usrbg.is-hardly.online/usrbg/v2/${interaction.user.id}`;
        resp = await fetch(`https://usrbg.is-hardly.online/usrbg/v2/${interaction.user.id}`);
        // weird way to check if it's a gif but it works i suppose?
        const text = await resp.text();
        if(text.startsWith('GIF')) banner_url = `https://usrbg.is-hardly.online/usrbg/v2/${interaction.user.id}?.gif`;
    }
    let custom_banner_failed = false;

    // Background color
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#271e2e');
    gradient.addColorStop(1, '#3c3245');
    ctx.fillStyle = gradient;

    // why do we have to force fetch the user? idk, it's dumb
    if (profile.customization.level_bg_override != '') {
        banner_url = profile.customization.level_bg_override;
        console.log(`profile banner override is selected: ${banner_url}`)
    }
    // if the user has a banner + unlocked the user banner ability
    if (banner_url && profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_USER)) {
        let banner_buffer: Buffer;

        banner_buffer = await fetchImage(banner_url).catch(() => custom_banner_failed = true) as Buffer;

        if (!custom_banner_failed) {
            if (banner_url.split('?')[0].endsWith('.gif')) {
                // don't draw anymore and rather we will save it and invoke the python script
                writeFileSync(join(BASE_DIRNAME, 'temp', `banner-${interaction.user.id}.gif`), banner_buffer);
                IS_GIF_BANNER = true;
            } else {
                const banner_img = await loadImage(banner_buffer);
                ctx.drawImage(banner_img, (600-1024)/2, (150-361)/2);
                console.log('before:', banner_img.width, banner_img.height);
                const new_width = 600;
                const new_height = banner_img.height * (600/banner_img.width); // i cant anymore
                console.log('after:', new_width, new_height);
                ctx.drawImage(banner_img, 0, Math.round((height-new_height)/2), new_width, Math.round(new_height));
            }
        } else {
            console.error('Banner is too big, ignoring!');
            const banner_img = await loadImage(join(BASE_DIRNAME, 'assets', 'art', 'banner-failed.png'));
            ctx.drawImage(banner_img, 0, 0);
        }

        // darken with a slightly-transparent rectangle
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, width, height);
    }
    else ctx.fillRect(0, 0, width, height);

    // User profile photo because we're gangsta like that <- why did i ever write this?
    const pfp_url = interaction.user.avatarURL({extension:'png', size:128})!;
    const pfp_buffer = await fetchImage(pfp_url);
    const pfp_img = await loadImage(pfp_buffer);
    ctx.save();
    ctx.beginPath();
    // level bar ends at x=580
    ctx.roundRect(20, 15, 90, 90, 12);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(pfp_img, 20, 15, 90, 90);
    ctx.restore();
    ctx.fillStyle = '#ffffff00';
    ctx.fill();
    const PFP_OFFSET = 20 + 90;
    // labels
    let offset_width = PFP_OFFSET + 10; // so that we can display the booster tag no matter what
    if (CONFIG.permitted_to_use_shorthands.includes(interaction.user.id)) {
        ctx.fillStyle = '#f56e6e66';
        ctx.beginPath();
        ctx.roundRect(offset_width, 52, 90, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffffff';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#ffffffff';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('MODERATOR', offset_width + 6, 68);
        offset_width += 97;
    }
    if (dev_status != 'none') {
        ctx.fillStyle = dev_status=='contributor'?'#6eeaf5bb':'#6ef5b6bb';
        ctx.beginPath();
        ctx.roundRect(offset_width, 52, 88, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1b3b2c';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#1b3b2c';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('DEVELOPER', offset_width + 6, 68);
        offset_width += 95;
    }
    // bugtest
    if (tester_status == 'cgc-beta') {
        ctx.fillStyle = '#876ef5bb';
        ctx.beginPath();
        ctx.roundRect(offset_width, 52, 62, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1b1630';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#1b1630';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('LEGACY', offset_width + 6, 68);
        offset_width += 72-5;
    }
    if (tester_status == 'public') {
        ctx.fillStyle = '#876ef5bb';
        ctx.beginPath();
        ctx.roundRect(offset_width, 52, 62, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1b1630';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#1b1630';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('TESTER', offset_width + 6, 68);
        offset_width += 72-5;
    }
    if (supporter == 'ko-fi') {
        ctx.fillStyle = '#fa9de4bb';
        ctx.beginPath();
        ctx.roundRect(offset_width, 52, 73, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#422a3d';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#422a3d';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('DONATOR', offset_width + 6, 68);
        offset_width += 83-5;
    }
    if (supporter == 'granted') {
        ctx.fillStyle = '#9dfab4bb';
        ctx.beginPath();
        ctx.roundRect(offset_width, 52, 64, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#2a422cff';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#2a422cff';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('SPECIAL', offset_width + 6, 68);
        // offset_width += 94-5;
        offset_width += 73-5;
    }
    if (user_is_booster) {
        ctx.fillStyle = '#fa9de4bb';
        ctx.beginPath();
        ctx.roundRect(offset_width, 52, 73, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#422a3d';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#422a3d';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('BOOSTER', offset_width + 6, 68);
        offset_width += 83-5;
    }
    if (DEV || CheckCompletionist(interaction.user.id)) {
        ctx.fillStyle = '#82cf93bb';
        ctx.beginPath();
        ctx.roundRect(offset_width, 52, 59, 23, 6);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#2a422fff';
        ctx.stroke();
        ctx.closePath();
        ctx.fillStyle = '#253829ff';
        ctx.font = 'bold italic 12px Arial'
        ctx.fillText('CLEAR!', offset_width + 6, 68);
        offset_width += 69-5;
    }
    

    // User Name
    ctx.font = "28px azuki_font, Arial, 'Segoe UI Emoji'";
    // background
    ctx.fillStyle = '#3d3d3d';
    ctx.fillText(`✨ ${interaction.user.displayName} ✨`, PFP_OFFSET + 9, 43);
    // foreground
    ctx.fillStyle = user_is_booster?'#f5a6ff':'#edf2f4';
    ctx.fillText(`✨ ${interaction.user.displayName} ✨`, PFP_OFFSET + 6, 40);

    // Level
    ctx.font = "20px azuki_font, Arial, 'Segoe UI Emoji'";
    if (trigger_splatoon) ctx.font = "16px 'Splatoon - Square Script'";
    // bg
    ctx.fillStyle = '#3d3d3d';
    ctx.fillText(`🌠 ${LEVEL_NAME} ${ROMAN_NUMERAL_KEYS[profile.leveling.level - 1]} (${profile.leveling.level})`, PFP_OFFSET + 9, 103);
    // fg
    ctx.fillStyle = '#f0c4ff';
    ctx.fillText(`🌠 ${LEVEL_NAME} ${ROMAN_NUMERAL_KEYS[profile.leveling.level - 1]} (${profile.leveling.level})`, PFP_OFFSET + 6, 100);

    // User title
    ctx.font = "24px azuki_font, Arial, 'Segoe UI Emoji'";
    if (trigger_splatoon) ctx.font = "20px 'Splatoon - Square Script'";
    // bg
    if (!profile.flags.includes(FLAG.NOT_ALLOWED_TO_UNLOCK_ACHIEVEMENTS)) {
        ctx.fillStyle = '#3d3d3d';
        ctx.fillText(USER_TITLE, 23 + 3, 132);
        // fg
        ctx.fillStyle = '#ffffffff';
        ctx.fillText(USER_TITLE, 23, 129);
    }

    // XP Bar Background
    // const barX = 20;
    const barX = 0;
    // const barY = 110;
    const barY = height-10;
    // const barWidth = 560;
    const barWidth = width;
    // const barHeight = 25;
    const barHeight = 10;
    ctx.fillStyle = bar_color.bg;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 8);
    ctx.fill();

    // XP Bar Progress
    const progressRatio = profile.leveling.current_xp / CalculateTargetXPV2(profile.leveling.level);
    if (progressRatio * barWidth > 16) {
        ctx.fillStyle = bar_color.fg;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth * progressRatio, barHeight, 8);
        ctx.fill();
    }

    // XP Text
    ctx.font = '16px azuki_font, bold Arial';
    if (trigger_splatoon) ctx.font = "12px 'Splatoon - Square Script'";
    ctx.fillStyle = num_color;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.floor(profile.leveling.current_xp)} XP of ${CalculateTargetXPV2(profile.leveling.level)} XP`, width - 10, height - 20);

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
        ctx.drawImage(sticker_img, sticker.position_x, sticker.position_y, 50, 50);
    }
    if (preview_sticker) {
        const sticker_img = await loadImage(readFileSync(join(BASE_DIRNAME, 'assets', 'art', stickers[preview_sticker.sticker])));
        ctx.drawImage(sticker_img, preview_sticker.position_x, preview_sticker.position_y, 50, 50);
    }

    // sticker demo
    // const sticker = await loadImage(readFileSync(join(BASE_DIRNAME, 'assets', 'art', 'okash.png')));
    // ctx.drawImage(sticker, width-150, height-100, 64, 64);
    

    // Save the image
    if (IS_GIF_BANNER) {
        const buffer = canvas.toBuffer('image/png');
        writeFileSync(join(BASE_DIRNAME, 'temp', `level-banner-${interaction.user.id}.png`), buffer);
        await new Promise(resolve => {
            const child = spawn('python3', [
                join(BASE_DIRNAME, 'python', 'gifs.py'), 
                join(BASE_DIRNAME, 'temp', `banner-${interaction.user.id}.gif`),
                join(BASE_DIRNAME, 'temp', `level-banner-${interaction.user.id}.png`),
                join(BASE_DIRNAME, 'temp', `level-banner-${interaction.user.id}.gif`)
            ]);
            child.on('close', resolve);
        });
    } else {
        const buffer = canvas.toBuffer('image/png');

        // if the .gif one exists we have to delete it so that the main function
        // doesn't pick .gif over .png
        if (existsSync(join(BASE_DIRNAME, 'temp', `level-banner-${interaction.user.id}.gif`)))
            rmSync(join(BASE_DIRNAME, 'temp', `level-banner-${interaction.user.id}.gif`));

        writeFileSync(join(BASE_DIRNAME, 'temp', `level-banner-${interaction.user.id}.png`), buffer);
    }
}


export async function HandleCommandLevel(interaction: ChatInputCommandInteraction) {
    const user_to_get = interaction.options.getUser('user') || interaction.user;

    if (!CheckForProfile(user_to_get.id)) return interaction.reply({
        content: await t('system.errors.user.nonexistent', interaction.okabot.translateable_locale)
    });

    const profile = GetUserProfile(user_to_get.id);

    if (interaction.options.getSubcommand(true) == 'background') {
        if (!profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_USER)) return interaction.reply({
            content: await t('level.custom_link.needs_ublb', interaction.okabot.translateable_locale),
            flags: [MessageFlags.SuppressNotifications]
        });

        if (!interaction.options.getString('link')) {            
            profile.customization.level_bg_override = '';
            UpdateUserProfile(interaction.user.id, profile);
        } else {
            let link = interaction.options.getString('link')!;
            if (
                !(link.startsWith('http://') || link.startsWith('https://')) || 
                link.includes(' ') ||
                !(link.endsWith('.png') || link.endsWith('.jpg') || link.endsWith('.jpeg') || link.endsWith('.gif'))
            ) return interaction.reply({
                content: await t('level.custom_link.bad_link', interaction.okabot.translateable_locale),
                flags: [MessageFlags.SuppressNotifications]
            });

            profile.customization.level_bg_override = link;
            UpdateUserProfile(interaction.user.id, profile);
        }

        return interaction.reply({
            content: await t('level.custom_link.on_set', interaction.okabot.translateable_locale, {
                cat_sunglasses: GetEmoji(EMOJI.CAT_SUNGLASSES)
            }),
            flags: [MessageFlags.SuppressNotifications]
        });
    }

    if (interaction.options.getSubcommand(true) == 'sticker') return item_sticker(interaction);

    if (!profile.leveling) {
        profile.leveling = {
            level: 1,
            current_xp: 0,
            total_xp: 0,
        }
        UpdateUserProfile(user_to_get.id, profile);
    }

    let banner_url = await interaction.client.users.fetch(user_to_get.id, {force: true}).then(user => user.bannerURL({extension:'png', size:1024})); // 1024x361
    let resp = await fetch(`https://usrbg.is-hardly.online/usrbg/v2/${user_to_get.id}`, {method: 'HEAD'});
    console.log(banner_url, resp.ok);
    const is_USRBG = !banner_url && resp.ok;

    const return_out = await generateLevelBanner(interaction, profile, user_to_get!=interaction.user?user_to_get:undefined);
    if (return_out) return;
    let image;

    if (existsSync(join(BASE_DIRNAME, 'temp', `level-banner-${interaction.user.id}.gif`)))
        image = new AttachmentBuilder(join(BASE_DIRNAME, 'temp', `level-banner-${interaction.user.id}.gif`));
    else
        image = new AttachmentBuilder(join(BASE_DIRNAME, 'temp', `level-banner-${interaction.user.id}.png`));

    let content = await t('level.xp_gain', interaction.okabot.translateable_locale);
    if (is_USRBG) content += '\n' + await t('level.banner_usrbg', interaction.okabot.translateable_locale);

    interaction.editReply({
        content,
        files: [image]
    });
}

export function CalculateOkashReward(level: number): number {
    return Math.floor((500 * level + 500) * 3/5);
}


export async function fetchImage(url: string) {
    const response = await axios.get(url, {responseType: 'arraybuffer', maxContentLength: 1024 * 1024 * 5}); // should limit to 5MB
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
    ).setContexts(InteractionContextType.Guild).setIntegrationTypes(ApplicationIntegrationType.GuildInstall);
