import {ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, Snowflake, TextChannel} from "discord.js";
import {EMOJI, GetEmoji} from "../../../util/emoji";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../wallet";
import { AddXP } from "../../levels/onMessage";
import { Achievements, GrantAchievement } from "../../passive/achievement";
import {AddCasinoLoss, AddCasinoWin} from "../casinodb";
import {GetUserProfile} from "../../user/prefs";

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

const ACTIVE_GAMES = new Map<Snowflake, boolean>();

export async function HandleCommandSlots(interaction: ChatInputCommandInteraction) {
    if (ACTIVE_GAMES.has(interaction.user.id) && ACTIVE_GAMES.get(interaction.user.id) == true) return interaction.reply({
        content: `:x: You can only use one slot machine at a time, **${interaction.user.displayName}**!`
    });

    ACTIVE_GAMES.set(interaction.user.id, true);

    const bet = Math.floor(interaction.options.getNumber('bet', true));

    if (GetWallet(interaction.user.id, false) < bet) return interaction.reply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have enough in your wallet!`
    });

    RemoveFromWallet(interaction.user.id, bet, false);
    const profile = GetUserProfile(interaction.user.id);

    const roll_first  = ROLL_TABLE[Math.round(Math.random() * (ROLL_TABLE.length - 1))];
    const roll_second = ROLL_TABLE[Math.round(Math.random() * (ROLL_TABLE.length - 1))];
    const roll_third  = ROLL_TABLE[Math.round(Math.random() * (ROLL_TABLE.length - 1))];
    const rolling_emoji = GetEmoji(EMOJI.SLOTS_ROLLING)
    const rolls = [roll_first, roll_second, roll_third];

    const reply = await interaction.reply({
        content: `🎰 **__SLOTS__** 🎰\n**${interaction.user.displayName}** bets ${GetEmoji(EMOJI.OKASH)} OKA**${bet}**...\n${rolling_emoji} ${rolling_emoji} ${rolling_emoji}`,
        flags: [MessageFlags.SuppressNotifications]
    });

    await Sleep(3000);

    reply.edit({
        content: `🎰 **__SLOTS__** 🎰\n**${interaction.user.displayName}** bets ${GetEmoji(EMOJI.OKASH)} OKA**${bet}**...\n ${ROLL_EMOJIS[roll_first]} ${rolling_emoji} ${rolling_emoji}`
    });

    await Sleep(1000);

    reply.edit({
        content: `🎰 **__SLOTS__** 🎰\n**${interaction.user.displayName}** bets ${GetEmoji(EMOJI.OKASH)} OKA**${bet}**...\n ${ROLL_EMOJIS[roll_first]} ${ROLL_EMOJIS[roll_second]} ${rolling_emoji}`
    });

    await Sleep(1000);

    const multiplier = GetMultiplier(rolls);
    const earned_okash = Math.floor(bet * multiplier);
    const earned_xp = {
        0: 5,
        2.5: 15,
        5: 30,
        10: 50
    }[multiplier];

    AddToWallet(interaction.user.id, earned_okash);
    AddXP(interaction.user.id, interaction.channel as TextChannel, earned_xp);

    if (multiplier == 0 && GetWallet(interaction.user.id, true) == 0) GrantAchievement(interaction.user, Achievements.NO_MONEY, interaction.channel as TextChannel);

    if (multiplier == 0) AddCasinoLoss(interaction.user.id, bet, 'slots');
    else AddCasinoWin(interaction.user.id, bet * multiplier, 'slots');

    if (bet == 25_000 && multiplier>0) GrantAchievement(interaction.user, Achievements.MAX_WIN, interaction.channel as TextChannel);
    if (multiplier == 10) GrantAchievement(interaction.user, Achievements.SLOTS_GEMS, interaction.channel as TextChannel);

    const result = multiplier>0?
        `${GetEmoji(EMOJI.CAT_MONEY_EYES)} and wins ${GetEmoji(EMOJI.OKASH)} OKA**${earned_okash}**! **(+${earned_xp}XP)**`:
        `:crying_cat_face: and loses ${profile.customization.pronoun.possessive} money! **(+5XP)**`;

    reply.edit({
        content: `🎰 **__SLOTS__** 🎰\n**${interaction.user.displayName}** bets ${GetEmoji(EMOJI.OKASH)} OKA**${bet}**...\n${ROLL_EMOJIS[roll_first]} ${ROLL_EMOJIS[roll_second]} ${ROLL_EMOJIS[roll_third]}\n\n`+result
    });

    ACTIVE_GAMES.delete(interaction.user.id);
}

export function ManualRelease(user_id: Snowflake) {
    ACTIVE_GAMES.set(user_id, false);
    ACTIVE_GAMES.delete(user_id);
}

// this is some horrendous way to get the multiplier
function GetMultiplier(rolls: Array<string>): number {
    // all gems = best
    if (
        rolls[0] == ROLLS.GEM &&
        rolls[1] == ROLLS.GEM &&
        rolls[2] == ROLLS.GEM
    ) return 10;

    // all okash = better
    if (
        rolls[0] == ROLLS.OKASH &&
        rolls[1] == ROLLS.OKASH &&
        rolls[2] == ROLLS.OKASH
    ) return 5;

    // all grapes or apples = standard 2.5x
    if (
        rolls[0] == ROLLS.GRAPE &&
        rolls[1] == ROLLS.GRAPE &&
        rolls[2] == ROLLS.GRAPE
    ) return 2.5;
    if (
        rolls[0] == ROLLS.APPLE &&
        rolls[1] == ROLLS.APPLE &&
        rolls[2] == ROLLS.APPLE
    ) return 2.5;

    // nothing good
    return 0;
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