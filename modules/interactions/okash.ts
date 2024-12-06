import { ChatInputCommandInteraction } from "discord.js";
import { GetBank, GetWallet } from "../okash/wallet";


export async function HandleCommandOkash(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const wallet = GetWallet(interaction.user.id);
    const bank = GetBank(interaction.user.id);

    await interaction.editReply({
        content: `:yen: **${interaction.user.username}**, you've got OKA${wallet} in your wallet and OKA${bank} in your bank.`
    });
}