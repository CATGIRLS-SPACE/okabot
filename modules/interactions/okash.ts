import { ChatInputCommandInteraction, Locale, MessageFlags, SlashCommandBuilder, TextChannel } from "discord.js";
import { GetBank, GetWallet } from "../okash/wallet";
import {EMOJI, GetEmoji} from "../../util/emoji";
import { Achievements, GrantAchievement } from "../passive/achievement";
import {GetCurrentFines} from "../okash/games/rob";


export async function HandleCommandOkash(interaction: ChatInputCommandInteraction) {
    // await interaction.deferReply();

    const bank = GetBank(interaction.user.id);

    if (bank >= 1_000_000) GrantAchievement(interaction.user, Achievements.CAPITALISM, interaction.channel as TextChannel);

    const wallet = GetWallet(interaction.user.id);

    await interaction.reply({
        content: interaction.locale==Locale.Japanese?
                `${GetEmoji('okash')} **${interaction.user.displayName}**さん、ポケットにOKA**${wallet}**、銀行にOKA**${bank}**持ちです`:
                `${GetEmoji('okash')} **${interaction.user.displayName}**, you've got OKA**${wallet}** in your wallet and OKA**${bank}** in your bank.\nThere is currently ${GetEmoji(EMOJI.OKASH)} OKA**${GetCurrentFines()}** in fines at the bank.`,
        flags: [MessageFlags.SuppressNotifications]
    });
}


export const OkashSlashCommand = 
    new SlashCommandBuilder()
        .setName('okash').setNameLocalization('ja', 'okash')
        .setDescription('See how much okash you have on you').setDescriptionLocalization('ja', 'ポケットにと銀行にokash持ち見ます');