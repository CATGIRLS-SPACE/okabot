import { ApplicationIntegrationType, ChatInputCommandInteraction, SlashCommandBuilder, Snowflake, TextChannel, User } from "discord.js"
import { GetUserProfile, UpdateUserProfile, USER_PROFILE } from "../user/prefs"
import { Channel } from "diagnostics_channel";


interface Achievement {
    name: string,
    description: string,
    class: 'okabot' | 'gamble' | 'fun' | 'okash' | 'noshow'
}

export enum Achievements {
    LEVEL_10 = 'level10', //
    LEVEL_20 = 'level20', //
    LEVEL_30 = 'level30', //
    LEVEL_40 = 'level40', //
    LEVEL_50 = 'level50', //
    LEVEL_60 = 'level60', //
    LEVEL_70 = 'level70', //
    LEVEL_80 = 'level80', //
    LEVEL_90 = 'level90', //
    LEVEL_100 = 'level100', //
    LEVEL_BEYOND = 'level_beyond', //
    LOW_COINFLIP = 'lowcf', //
    HIGH_COINFLIP = 'highcf', //
    WEIGHTED_COINFLIP = 'usewc', //
    BLACKJACK = 'get21', //
    NEW_CF_ALLTIME = 'newcf_alltime', //
    NEW_CF_DAILY = 'newcf_daily', //
    ROULETTE_ONE = 'land36', //
    ROULETTE_MULTI = 'landmulti', //
    BANK_MAX = 'maxbank', // in okash command
    NO_MONEY = 'gamble_gobroke', // in: coinflip, blackjack, roulette
    MAX_WIN = 'maxbetwin', // in: coinflip, blackjack, roulette
    DAILY = 'getdaily', //
    DAILY_7 = 'dailyweek', //
    DAILY_30 = 'dailymonth', //
    DAILY_61 = 'daily2month', //
    DAILY_100 = 'daily100', //
    DAILY_365 = 'dailyyear', //
    DAILY_SR = 'restorestreak', //
    ROB_HIGH = 'robmin25000', //
    ROB_FINED = 'robfined', //
    THANK_OKABOT = 'thankokabot', //
    PAY_USER = 'begenerous', //
    OKASH_DROP = 'okashdrop', //
    LOOTBOX_DROP = 'lootboxdrop', //
    SHORTHAND_NO = 'notadmin', //
    VOICE_XP = 'voicemin300xp', //
    ANGER_OKABOT = 'remindmetwice', //
    FAST_CLAIM_REMINDER = 'quickclaim' //
}

const ACHIEVEMENTS: {
    [key: string]: Achievement
} = {
    'level10': {name:'Level 10',description:'Get to level 10', class:'noshow'},
    'level20': {name:'Level 20',description:'Get to level 20', class:'noshow'},
    'level30': {name:'Level 30',description:'Get to level 30', class:'noshow'},
    'level40': {name:'Level 40',description:'Get to level 40', class:'noshow'},
    'level50': {name:'Level 50',description:'Get to level 50', class:'noshow'},
    'level60': {name:'Level 60',description:'Get to level 60', class:'noshow'},
    'level70': {name:'Level 70',description:'Get to level 70', class:'noshow'},
    'level80': {name:'Level 80',description:'Get to level 80', class:'noshow'},
    'level90': {name:'Level 90',description:'Get to level 90', class:'noshow'},
    'level100': {name:'Level 100',description:'Get to level 100', class:'noshow'},
    'level_beyond': {name:'BEYOND',description:'Get past level 100 to BEYOND', class:'noshow'},
    'lowcf': {name:'That\'s Low...',description:'Get a stupidly low coinflip float', class:'gamble'},
    'highcf': {name:'No Doubt',description:'Get a stupidly high coinflip float', class:'gamble'},
    'usewc': {name:'Backup Plan',description:'Equip a weighted coin', class:'gamble'},
    'get21': {name:'Blackjack!',description:'Win a game of blackjack by getting 21', class:'gamble'},
    'newcf_alltime': {name:'Making History',description:'Get a new highest/lowest coinflip float of all time', class:'gamble'},
    'newcf_daily': {name:'Making History... temporarily',description:'Get a new highest/lowest coinflip of the day', class:'gamble'},
    'land36': {name:'I Just Knew',description:'Bet on a single number in roulette and win', class:'gamble'},
    'landmulti': {name:'Lottery',description:'Bet on 2-7 numbers in roulette and win', class:'gamble'},
    'maxbank': {name:'Too Rich',description:'Fill your bank with the max amount of okash', class:'okash'},
    'gamble_gobroke': {name:'Gamble Irresponsibly',description:'Go broke via a gambling game', class:'okash'},
    'maxbetwin': {name:'High Risk, High Reward',description:'Win a gambling game that you bet the max allowed amount of okash on', class:'gamble'},
    'getdaily': {name:'The Beginning',description:'Get your daily reward for the first time', class:'okabot'},
    'dailyweek': {name:'New Habit',description:'Get your daily reward for a week straight', class:'okabot'},
    'dailymonth': {name:'Committed',description:'Get your daily reward for a month straight', class:'okabot'},
    'daily2month': {name:'Unforgetful',description:'Get your daily reward for two months straight', class:'okabot'},
    'daily100': {name:'One Hundred',description:'Get your daily reward for 100 days straight', class:'okabot'},
    'dailyyear': {name:'I Can\'t Stop!',description:'Get your daily reward for one year. Congrats!', class:'okabot'},
    'restorestreak': {name:'Oops, I Forgot',description:'Restore your daily streak with a streak restore', class:'okabot'},
    'robmin25000': {name:'Wallet Weight Loss',description:'Rob someone of at least 25000 okash', class:'fun'},
    'robfined': {name:'Uhhh... Oops?',description:'Get caught robbing someone and get fined', class:'fun'},
    'thankokabot': {name:'Nice List',description:'Thank okabot', class:'fun'},
    'begenerous': {name:'Generosity',description:'Pay a user some okash', class:'okash'},
    'okashdrop': {name:'What\'s This?',description:'Get lucky and find some okash', class:'fun'},
    'lootboxdrop': {name:'Ow, My Foot!',description:'Get lucky and trip over a lootbox', class:'fun'},
    'notadmin': {name:'Get Outta Here!',description:'Try and use a management shorthand without permission',class:'fun'},
    'voicemin300xp': {name:'Talkative',description:'Earn at least 300 XP from VC XP rewards',class:'fun'},
    'remindmetwice': {name:'I Get It!',description:'Annoy okabot by asking him to remind you of your daily reward twice',class:'fun'},
    'quickclaim': {name:'Quick Draw',description:'Claim your daily reward within one minute of okabot reminding you.',class:'okabot'},
}

/**
 * Check if the user has the achievement already, and if not, award it to them.
 * @param user User to give it to
 * @param achievement The achievement to give
 * @param channel The channel to send the announcement to
 */
export function GrantAchievement(user: User, achievement: Achievements, channel: TextChannel) {
    const profile = GetUserProfile(user.id);

    if (profile.achievements.indexOf(achievement) != -1) {
        console.log(`user ${user.username} already has achievement ${achievement}`);
        return;
    }

    profile.achievements.push(achievement);

    const a = ACHIEVEMENTS[achievement];

    channel.send({
        content: `:trophy: Congrats, **${user.displayName}**! You've unlocked the achievement **${a.name}**!\n-# ${a.description}`
    });

    UpdateUserProfile(user.id, profile);
}

function CreateProgressBar(profile: USER_PROFILE): string {
    const CHAR_UNFILLED = '░';
    const CHAR_FILLED   = '█';
    const PARTIAL_BLOCKS = ['░', '▒', '▒', '▒', '▒', '▓', '▓', '▓', '▓']; // Partial fill levels
    let bar = '**[**';
    const needed_xp = Object.keys(ACHIEVEMENTS).length;
    const target_chars = 20;
    const progress_ratio = profile.achievements.length / needed_xp;
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

export async function HandleCommandAchievements(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const profile = GetUserProfile(interaction.user.id);
    const sub = interaction.options.getString('page', true);

    if (sub == 'bar') {
        const bar = CreateProgressBar(profile);
        
        if (profile.achievements.length == 0) return interaction.editReply({
            content:`**${interaction.user.displayName}**, you haven't unlocked any achievements yet!`
        });
        
        return interaction.editReply({
            content:`**${interaction.user.displayName}**, you've got ${profile.achievements.length} / ${Object.keys(ACHIEVEMENTS).length} achievements.\n${bar}\nMost recent achievement: **${ACHIEVEMENTS[profile.achievements.at(-1)!].name}** - ${ACHIEVEMENTS[profile.achievements.at(-1)!].description}`
        });
    }

    let list = `## Achievements\n`;
    let selected_achievements = [];
    const keys = Object.keys(ACHIEVEMENTS);
    // filter out only the ones from that page
    for (const i in keys) {
        if (ACHIEVEMENTS[keys[i]].class == sub) selected_achievements.push({a:ACHIEVEMENTS[keys[i]],key:keys[i]});
    }

    for (const i in selected_achievements) {
        const locked = profile.achievements.indexOf(<Achievements> selected_achievements[i].key) == -1;
        let line = locked?'🔒 ':'🔓 ';
        line += locked?`${selected_achievements[i].a.name} - ???`:`**${selected_achievements[i].a.name}** - ${selected_achievements[i].a.description}`
        
        list += `${line}\n`;
    }

    interaction.editReply({
        content: list
    });
}


export const AchievementsSlashCommand = new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('See your achievement progress')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .addStringOption(option => option
        .setName('page')
        .setDescription('Which page of achievements to show')
        .setChoices(
            {name:'Progress Bar', value:'bar'},
            // specific categories
            {name:'okabot', value:'okabot'},
            {name:'Gambling', value:'gamble'},
            {name:'Fun', value:'fun'},
            {name:'okash', value:'okash'},
        )
        .setRequired(true)
    );