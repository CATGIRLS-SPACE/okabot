import { ChatInputCommandInteraction, Locale, MessageFlags, SlashCommandBuilder } from "discord.js";
import { GetBank, GetWallet } from "../okash/wallet";
import { GetEmoji } from "../../util/emoji";


export async function HandleCommandOkash(interaction: ChatInputCommandInteraction) {
    // await interaction.deferReply();

    const wallet = GetWallet(interaction.user.id);
    const bank = GetBank(interaction.user.id);

    await interaction.reply({
        content: interaction.locale==Locale.Japanese?
                `${GetEmoji('okash')} **${interaction.user.displayName}**さん、ポケットにOKA**${wallet}**、銀行にOKA**${bank}**持ちです`:
                `${GetEmoji('okash')} **${interaction.user.displayName}**, you've got OKA**${wallet}** in your wallet and OKA**${bank}** in your bank.`,
        flags: [MessageFlags.SuppressNotifications]
    });
}


export const OkashSlashCommand = 
    new SlashCommandBuilder()
        .setName('okash').setNameLocalization('ja', 'okash')
        .setDescription('See how much okash you have on you').setDescriptionLocalization('ja', 'ポケットにと銀行にokash持ち見ます');