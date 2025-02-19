import {ChatInputCommandInteraction, SlashCommandBuilder, Snowflake} from "discord.js";
import {EMOJI, GetEmoji} from "../../../util/emoji";

async function Sleep(time_ms: number) {
    return new Promise(resolve => setTimeout(resolve, time_ms));
}

const ACTIVE_GAMES = new Map<Snowflake, boolean>();

export async function HandleCommandSlots(interaction: ChatInputCommandInteraction) {
    if (ACTIVE_GAMES.has(interaction.user.id) && ACTIVE_GAMES.get(interaction.user.id) == false) return interaction.reply({
        content: `:x: You can only use one slot machine at a time, **${interaction.user.displayName}**!`
    });

    const reply = await interaction.reply({
        content: `${GetEmoji(EMOJI.OKASH)} **__SLOTS__** ${GetEmoji(EMOJI.OKASH)}\n E1SPIN E2SPIN E3SPIN`
    });

    await Sleep(3000);

    reply.edit({
        content: `${GetEmoji(EMOJI.OKASH)} **__SLOTS__** ${GetEmoji(EMOJI.OKASH)}\n E1STOP E2SPIN E3SPIN`
    });

    await Sleep(1000);

    reply.edit({
        content: `${GetEmoji(EMOJI.OKASH)} **__SLOTS__** ${GetEmoji(EMOJI.OKASH)}\n E1STOP E2STOP E3SPIN`
    });

    await Sleep(1000);

    reply.edit({
        content: `${GetEmoji(EMOJI.OKASH)} **__SLOTS__** ${GetEmoji(EMOJI.OKASH)}\n E1STOP E2STOP E3STOP`
    });
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