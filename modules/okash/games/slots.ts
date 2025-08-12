import {
    ActivityType,
    ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
    Snowflake,
    TextChannel
} from "discord.js";
import {EMOJI, GetEmoji} from "../../../util/emoji";
import {AddToWallet, GetWallet, RemoveFromWallet} from "../wallet";
import {AddXP} from "../../levels/onMessage";
import {Achievements, GrantAchievement} from "../../passive/achievement";
import {AddCasinoLoss, AddCasinoWin} from "../casinodb";
import {GetUserProfile} from "../../user/prefs";
import {DoRandomDrops} from "../../passive/onMessage";
import {LANG_GAMES, LangGetAutoTranslatedString, LangGetFormattedString} from "../../../util/language";
import {CheckGambleLock, SetGambleLock} from "./_lock";
import {DEV} from "../../../index";

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
    'GRAPE': GetEmoji(EMOJI.SLOTS_GRAPE),
    'APPLE': GetEmoji(EMOJI.SLOTS_APPLE),
    'GEM':   GetEmoji(EMOJI.SLOTS_GEM)
}

// this is the array in which the slot thingy will spin
const ROLL_TABLE = [
    ROLLS.APPLE,
    ROLLS.APPLE,
    ROLLS.APPLE,
    ROLLS.APPLE,
    ROLLS.APPLE,
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
    ROLLS.GRAPE,
    ROLLS.GRAPE,
    ROLLS.GRAPE,
    ROLLS.GRAPE,
    ROLLS.GRAPE,
    ROLLS.OKASH,
    ROLLS.OKASH,
    ROLLS.OKASH,
    ROLLS.OKASH,
    ROLLS.OKASH,
    ROLLS.GEM
];

// A = apple, G = grape, O = okash, E = gem
const PAYOUT_TABLE: {[key: string]: number} = {
    // 2x fruit + fruit
    'AAG': 0.25,
    'GAA': 0.25,
    'GGA': 0.25,
    'AGG': 0.25,
    // 2x fruit + okash
    'AAO': 1.2,
    'OAA': 1.2,
    'GGO': 1.2,
    'OGG': 1.2,
    // 2x fruit + gem
    'AAE': 2,
    'EAA': 2,
    'GGE': 2,
    'EGG': 2,
    // 3x fruit
    'AAA': 2,
    'GGG': 2,
    // 2x okash + fruit
    'OOA': 3,
    'AOO': 3,
    'OOG': 3,
    'GOO': 3,
    // 2x okash + gem
    'OOE': 5,
    'EOO': 5,
    // 3x okash
    'OOO': 10,
    // 2x gem + fruit
    'EEA': 8,
    'AEE': 8,
    'EEG': 8,
    'GEE': 8,
    // 2x gem + okash
    'EEO': 10,
    'OEE': 10,
    // and of course, the lovely shiny!
    'EEE': 50
}

const ACTIVE_GAMES = new Map<Snowflake, boolean>();

const WIN_STREAKS = new Map<Snowflake, number>();

const USER_GAMES_TICK = new Map<Snowflake, number>(); // every 50 games or so we show a tiny plz help me pay for okabot message

export async function HandleCommandSlots(interaction: ChatInputCommandInteraction) {
    if (!DEV) return interaction.reply({
        content: ':crying_cat_face: Slots is currently disabled, sorry...' 
    });

    if (CheckGambleLock(interaction.user.id)) return interaction.reply({
        content: `:x: You can only use one slot machine at a time, **${interaction.user.displayName}**!`
    });

    if (!WIN_STREAKS.has(interaction.user.id)) WIN_STREAKS.set(interaction.user.id, 0);

    if (DEV) ROLL_EMOJIS['OKASH'] = GetEmoji(EMOJI.OKASH);

    const bet = Math.floor(interaction.options.getNumber('bet', true));

    if (GetWallet(interaction.user.id, false) < bet) return interaction.reply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have enough in your wallet!`
    });

    SetGambleLock(interaction.user.id, true)

    let show_consider = false;
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

    const reply = await interaction.reply({
        content: `${show_consider?await LangGetAutoTranslatedString(LANG_GAMES.SLOTS_DONATE, interaction.okabot.translateable_locale):''}${await LangGetAutoTranslatedString(LANG_GAMES.SLOTS_INITIAL, interaction.okabot.translateable_locale, interaction.user.displayName, bet)}\n${rolling_emoji} ${rolling_emoji} ${rolling_emoji}`,
        flags: [MessageFlags.SuppressNotifications]
    });

    const reply_as_message = await reply.fetch();

    await Sleep(3000);

    reply.edit({
        content: `${show_consider?await LangGetAutoTranslatedString(LANG_GAMES.SLOTS_DONATE, interaction.okabot.translateable_locale):''}${await LangGetAutoTranslatedString(LANG_GAMES.SLOTS_INITIAL, interaction.okabot.translateable_locale, interaction.user.displayName, bet)}\n ${ROLL_EMOJIS[roll_first]} ${rolling_emoji} ${rolling_emoji}`
    });

    await Sleep(1000);

    reply.edit({
        content: `${show_consider?await LangGetAutoTranslatedString(LANG_GAMES.SLOTS_DONATE, interaction.okabot.translateable_locale):''}${await LangGetAutoTranslatedString(LANG_GAMES.SLOTS_INITIAL, interaction.okabot.translateable_locale, interaction.user.displayName, bet)}\n ${ROLL_EMOJIS[roll_first]} ${ROLL_EMOJIS[roll_second]} ${rolling_emoji}`
    });

    await Sleep(1000);

    const multiplier = GetMultiplier(rolls);
    const earned_okash = Math.floor(bet * multiplier);
    const earned_xp = {
        0: 5,
        1.1: 10,
        1.2: 15,
        2: 20,
        3: 25,
        5: 30,
        8: 50,
        10: 100,
        50: 250
    }[multiplier]!;

    AddToWallet(interaction.user.id, earned_okash);
    AddXP(interaction.user.id, interaction.channel as TextChannel, earned_xp);

    if (multiplier == 0 && GetWallet(interaction.user.id, true) == 0) GrantAchievement(interaction.user, Achievements.NO_MONEY, interaction.channel as TextChannel);

    if (multiplier == 0) AddCasinoLoss(interaction.user.id, bet, 'slots');
    else AddCasinoWin(interaction.user.id, bet * multiplier, 'slots');

    if (bet == 25_000 && multiplier>0) GrantAchievement(interaction.user, Achievements.MAX_WIN, interaction.channel as TextChannel);
    if (multiplier == 50) GrantAchievement(interaction.user, Achievements.SLOTS_GEMS, interaction.channel as TextChannel);

    let streak = WIN_STREAKS.get(interaction.user.id) || 0;
    if (multiplier > 0) streak++; else streak = 0;
    WIN_STREAKS.set(interaction.user.id, streak);
    console.log(`Slots winstreak is now ${streak}.`);
    const streak_part = await LangGetAutoTranslatedString(LANG_GAMES.ANY_WIN_STREAK, interaction.okabot.translateable_locale, streak);

    const result = multiplier>0?
        await LangGetAutoTranslatedString(LANG_GAMES.SLOTS_WIN, interaction.okabot.translateable_locale, earned_okash, earned_xp):
        await LangGetAutoTranslatedString(LANG_GAMES.SLOTS_LOSS, interaction.okabot.translateable_locale, profile.customization.global.pronouns.possessive, interaction.user.displayName);

    reply.edit({
        content: `${show_consider?await LangGetAutoTranslatedString(LANG_GAMES.SLOTS_DONATE, interaction.okabot.translateable_locale):''}${await LangGetAutoTranslatedString(LANG_GAMES.SLOTS_INITIAL, interaction.okabot.translateable_locale, interaction.user.displayName, bet)}\n${ROLL_EMOJIS[roll_first]} ${ROLL_EMOJIS[roll_second]} ${ROLL_EMOJIS[roll_third]}\n\n${result}\n${streak>1?streak_part:''}`
    });

    if (streak == 2) GrantAchievement(interaction.user, Achievements.STREAK_2, interaction.client.channels.cache.get(interaction.channelId) as TextChannel);
    if (streak == 5) GrantAchievement(interaction.user, Achievements.STREAK_5, interaction.client.channels.cache.get(interaction.channelId) as TextChannel);
    if (streak == 10) GrantAchievement(interaction.user, Achievements.STREAK_10, interaction.client.channels.cache.get(interaction.channelId) as TextChannel);
    if (streak == 25) GrantAchievement(interaction.user, Achievements.STREAK_25, interaction.client.channels.cache.get(interaction.channelId) as TextChannel);

    DoRandomDrops(reply_as_message, interaction.user);

    // ACTIVE_GAMES.delete(interaction.user.id);
    SetGambleLock(interaction.user.id, false);
}

export function ManualRelease(user_id: Snowflake) {
    SetGambleLock(user_id, false);
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
        .setMaxValue(5_000)
    );
