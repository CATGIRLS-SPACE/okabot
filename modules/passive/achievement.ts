import { ChatInputCommandInteraction, SlashCommandBuilder, Snowflake, TextChannel, User } from "discord.js"
import { GetUserProfile, UpdateUserProfile, USER_PROFILE } from "../user/prefs"
import { Channel } from "diagnostics_channel";


interface Achievement {
    name: string,
    description: string,
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
}

const ACHIEVEMENTS: {
    [key: string]: Achievement
} = {
    'level10': {name:'Level 10',description:'Get to level 10'},
    'level20': {name:'Level 20',description:'Get to level 20'},
    'level30': {name:'Level 30',description:'Get to level 30'},
    'level40': {name:'Level 40',description:'Get to level 40'},
    'level50': {name:'Level 50',description:'Get to level 50'},
    'level60': {name:'Level 60',description:'Get to level 60'},
    'level70': {name:'Level 70',description:'Get to level 70'},
    'level80': {name:'Level 80',description:'Get to level 80'},
    'level90': {name:'Level 90',description:'Get to level 90'},
    'level100': {name:'Level 100',description:'Get to level 100'},
    'level_beyond': {name:'BEYOND',description:'Get past level 100 to BEYOND'},
    'lowcf': {name:'That\'s Low...',description:'Get a stupidly low coinflip float'},
    'highcf': {name:'No Doubt',description:'Get a stupidly high coinflip float'},
    'usewc': {name:'Backup Plan',description:'Equip a weighted coin'},
    'get21': {name:'Blackjack!',description:'Win a game of blackjack by getting 21'},
    'newcf_alltime': {name:'Making History',description:'Get a new highest/lowest coinflip float of all time'},
    'newcf_daily': {name:'Making History... temporarily',description:'Get a new highest/lowest coinflip of the day'},
    'land36': {name:'I Just Knew',description:'Bet on a single number in roulette and win'},
    'landmutli': {name:'Lottery',description:'Bet on 2-7 numbers in roulette and win'},
    'maxbank': {name:'Too Rich',description:'Fill your bank with the max amount of okash'},
    'gamble_gobroke': {name:'Gamble Irresponsibly',description:'Go broke via a gambling game'},
    'maxbetwin': {name:'High Risk, High Reward',description:'Win a gambling game that you bet the max allowed amount of okash on'},
    'getdaily': {name:'The Beginning',description:'Get your daily reward for the first time'},
    'dailyweek': {name:'New Habit',description:'Get your daily reward for a week straight'},
    'dailymonth': {name:'Committed',description:'Get your daily reward for a month straight'},
    'daily2month': {name:'Unforgetful',description:'Get your daily reward for two months straight'},
    'daily100': {name:'One Hundred',description:'Get your daily reward for 100 days straight'},
    'dailyyear': {name:'I Can\'t Stop!',description:'Get your daily reward for one year. Congrats!'},
    'restorestreak': {name:'Oops, I Forgot',description:'Restore your daily streak with a streak restore'},
    'robmin25000': {name:'Wallet Weight Loss',description:'Rob someone of at least 25000 okash'},
    'robfined': {name:'Uhhh... Oops?',description:'Get caught robbing someone and get fined'},
    'thankokabot': {name:'Nice List',description:'Thank okabot'},
    'begenerous': {name:'Generosity',description:'Pay a user some okash'},
    'okashdrop': {name:'What\'s This?',description:'Get lucky and find some okash'},
    'lootboxdrop': {name:'Ow, My Foot!',description:'Get lucky and trip over a lootbox'},
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

const CHAR_UNFILLED = '░';
const CHAR_FILLED   = '█';
const PARTIAL_BLOCKS = ['░', '▒', '▒', '▒', '▒', '▓', '▓', '▓', '▓']; // Partial fill levels
function CreateProgressBar(profile: USER_PROFILE): string {
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
    const bar = CreateProgressBar(profile);

    if (profile.achievements.length == 0) return interaction.editReply({
        content:`**${interaction.user.displayName}**, you haven't unlocked any achievements yet!`
    });

    interaction.editReply({
        content:`**${interaction.user.displayName}**, you've got ${profile.achievements.length} / ${Object.keys(ACHIEVEMENTS).length} achievements.\n${bar}\nMost recent achievement: **${ACHIEVEMENTS[profile.achievements.at(-1)!].name}** - ${ACHIEVEMENTS[profile.achievements.at(-1)!].description}`
    });
}


export const AchievementsSlashCommand = new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('See your achievement progress');