import {
    ActivityType,
    ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
    Snowflake,
    TextChannel
} from "discord.js";
import {EMOJI, GetEmoji} from "../../../util/emoji";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../wallet";
import { AddXP } from "../../levels/onMessage";
import { Achievements, GrantAchievement } from "../../passive/achievement";
import {AddCasinoLoss, AddCasinoWin} from "../casinodb";
import {GetUserProfile} from "../../user/prefs";
import {DEV, SetActivity} from "../../../index";
import {DoRandomDrops} from "../../passive/onMessage";

async function Sleep(time_ms: number) {
    return new Promise(resolve => setTimeout(resolve, time_ms));
}

enum ROLLS {
    OKASH = 'OKASH',
    GRAPE = 'GRAPE',
    APPLE = 'APPLE',
    GEM   = 'GEM',
}
const ROLL_EMOJIS: {[key: string]: string} = {
    'OKASH': GetEmoji(EMOJI.OKASH),
    'GRAPE': ':grapes:', // <-- why do you have to be special? just "grape" wasn't enough for you?
    'APPLE': ':apple:',
    'GEM':   ':gem:'
}

// this is the array in which the slot thingy will spin
const ROLL_TABLE = [
    ROLLS.APPLE,
    ROLLS.APPLE,
    ROLLS.APPLE,
    ROLLS.APPLE,
    ROLLS.APPLE,
    ROLLS.GRAPE,
    ROLLS.GRAPE,
    ROLLS.GRAPE,
    ROLLS.GRAPE,
    ROLLS.GRAPE,
    ROLLS.OKASH,
    ROLLS.OKASH,
    ROLLS.OKASH,
    ROLLS.GEM
];

// A = apple, G = grape, O = okash, E = gem
const PAYOUT_TABLE: {[key: string]: number} = {
    'AAA':2,    // 3x apple
    'GGG':2,    // 3x grape
    'AAG':1.2,  // 2x apple 1x grape <-- must be in that order!
    'GGA':1.2,  // 2x grape 1x apple
    'AAO':1.5,  // 2x apple 1x okash
    'GGO':1.5,  // 2x grape 1x okash
    'AAE':2.5,
    'GGE':2.5,
    'OOA':5,    // 2x okash 1x apple
    'OOG':5,    // 2x okash 1x grape
    'AOO':5,    // 1x apple 2x okash
    'GOO':5,    // 1x grape 2x okash
    'OAO':5,    // you get the point
    'OGO':5,
    'OOE':5,
    'OEO':5,
    'EOO':5,
    'OOO':10,   // 3x okash
    'EEA':15,   // 2x gem 1x any other
    'EEG':15,
    'EEO':15,
    'EAE':15,
    'EGE':15,
    'EOE':15,
    'AEE':15,
    'GEE':15,
    'OEE':15,
    'EEE':50,   // 3x gem
}

const ACTIVE_GAMES = new Map<Snowflake, boolean>();

const USER_GAMES_TICK = new Map<Snowflake, number>(); // every 50 games or so we show a tiny plz help me pay for okabot message
const EN_MESSAGE = '-# Enjoying okabot? Please consider [supporting me](<https://ko-fi.com/okawaffles>).\n';
const JP_MESSAGE = '-# okabotが好きですか？[寄付](<https://ko-fi.com/okawaffles>)をご検討ください\n';

export async function HandleCommandSlots(interaction: ChatInputCommandInteraction) {
    if (ACTIVE_GAMES.has(interaction.user.id) && ACTIVE_GAMES.get(interaction.user.id) == true) return interaction.reply({
        content: `:x: You can only use one slot machine at a time, **${interaction.user.displayName}**!`
    });

    if (DEV) ROLL_EMOJIS['OKASH'] = GetEmoji(EMOJI.OKASH);

    const bet = Math.floor(interaction.options.getNumber('bet', true));

    if (GetWallet(interaction.user.id, false) < bet) return interaction.reply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have enough in your wallet!`
    });

    ACTIVE_GAMES.set(interaction.user.id, true);

    let show_consider = false;
    const consider_message = interaction.okabot.locale=='ja'?JP_MESSAGE:EN_MESSAGE;
    if (USER_GAMES_TICK.has(interaction.user.id) && USER_GAMES_TICK.get(interaction.user.id) == 50) {
        USER_GAMES_TICK.set(interaction.user.id, 0);
        show_consider = true;
    } else {
        const current_tick = USER_GAMES_TICK.has(interaction.user.id)?USER_GAMES_TICK.get(interaction.user.id)!:49;
        USER_GAMES_TICK.set(interaction.user.id, current_tick + 1);
    }

    RemoveFromWallet(interaction.user.id, bet, false);
    const profile = GetUserProfile(interaction.user.id);

    const roll_first  = ROLL_TABLE[Math.round(Math.random() * (ROLL_TABLE.length - 1))];
    const roll_second = ROLL_TABLE[Math.round(Math.random() * (ROLL_TABLE.length - 1))];
    const roll_third  = ROLL_TABLE[Math.round(Math.random() * (ROLL_TABLE.length - 1))];
    const rolling_emoji = GetEmoji(EMOJI.SLOTS_ROLLING)
    const rolls = [roll_first, roll_second, roll_third];

    SetActivity('slots', ActivityType.Playing);

    const reply = await interaction.reply({
        content: `${show_consider?consider_message:''}🎰 **__SLOTS__** 🎰\n**${interaction.user.displayName}** bets ${GetEmoji(EMOJI.OKASH)} OKA**${bet}**...\n${rolling_emoji} ${rolling_emoji} ${rolling_emoji}`,
        flags: [MessageFlags.SuppressNotifications]
    });

    const reply_as_message = await reply.fetch();

    await Sleep(3000);

    reply.edit({
        content: `${show_consider?consider_message:''}🎰 **__SLOTS__** 🎰\n**${interaction.user.displayName}** bets ${GetEmoji(EMOJI.OKASH)} OKA**${bet}**...\n ${ROLL_EMOJIS[roll_first]} ${rolling_emoji} ${rolling_emoji}`
    });

    await Sleep(1000);

    reply.edit({
        content: `${show_consider?consider_message:''}🎰 **__SLOTS__** 🎰\n**${interaction.user.displayName}** bets ${GetEmoji(EMOJI.OKASH)} OKA**${bet}**...\n ${ROLL_EMOJIS[roll_first]} ${ROLL_EMOJIS[roll_second]} ${rolling_emoji}`
    });

    await Sleep(1000);

    const multiplier = GetMultiplier(rolls);
    const earned_okash = Math.floor(bet * multiplier);
    const earned_xp = {
        0: 5,
        1.2: 10,
        1.5: 15,
        2: 20,
        2.5: 25,
        5: 30,
        10: 50,
        15: 100,
        50: 250
    }[multiplier];

    AddToWallet(interaction.user.id, earned_okash);
    AddXP(interaction.user.id, interaction.channel as TextChannel, earned_xp);

    if (multiplier == 0 && GetWallet(interaction.user.id, true) == 0) GrantAchievement(interaction.user, Achievements.NO_MONEY, interaction.channel as TextChannel);

    if (multiplier == 0) AddCasinoLoss(interaction.user.id, bet, 'slots');
    else AddCasinoWin(interaction.user.id, bet * multiplier, 'slots');

    if (bet == 25_000 && multiplier>0) GrantAchievement(interaction.user, Achievements.MAX_WIN, interaction.channel as TextChannel);
    if (multiplier == 50) GrantAchievement(interaction.user, Achievements.SLOTS_GEMS, interaction.channel as TextChannel);

    const result = multiplier>0?
        `and wins ${GetEmoji(EMOJI.OKASH)} OKA**${earned_okash}**! **(+${earned_xp}XP)** ${GetEmoji(EMOJI.CAT_MONEY_EYES)}`:
        `and loses ${profile.customization.global.pronouns.possessive} money! **(+5XP)** :crying_cat_face:`;

    reply.edit({
        content: `${show_consider?consider_message:''}🎰 **__SLOTS__** 🎰\n**${interaction.user.displayName}** bets ${GetEmoji(EMOJI.OKASH)} OKA**${bet}**...\n${ROLL_EMOJIS[roll_first]} ${ROLL_EMOJIS[roll_second]} ${ROLL_EMOJIS[roll_third]}\n\n`+result
    });

    DoRandomDrops(reply_as_message, interaction.user);

    ACTIVE_GAMES.delete(interaction.user.id);
}

export function ManualRelease(user_id: Snowflake) {
    ACTIVE_GAMES.set(user_id, false);
    ACTIVE_GAMES.delete(user_id);
}

// this is some horrendous way to get the multiplier
function GetMultiplier(rolls: Array<ROLLS>): number {
    // all gems = best
    const L = {
        'OKASH':'O',
        'GRAPE':'G',
        'APPLE':'A',
        'GEM':  'E'
    };

    const reward = PAYOUT_TABLE[`${L[rolls[0]]}${L[rolls[1]]}${L[rolls[2]]}`];

    return reward || 0;
}

export const SlotsSlashCommand = new SlashCommandBuilder()
    .setName("slots")
    .setDescription("Play a game of slots")
    .addNumberOption(option => option
        .setName("bet")
        .setDescription("how much okash to bet")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(25_000)
    );
