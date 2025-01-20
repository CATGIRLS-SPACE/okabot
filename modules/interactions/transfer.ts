import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { AddToBank, AddToWallet, GetBank, GetWallet, RemoveFromBank, RemoveFromWallet } from "../okash/wallet";
import { EMOJI, GetEmoji } from "../../util/emoji";


export async function HandleCommandTransfer(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    
    const amount = interaction.options.getNumber('amount', true);
    const source = interaction.options.getString('source', true);

    if (amount.toString().includes('.')) return interaction.editReply({
        content: `:x: Cannot move a non-whole amount of okash`
    })
    
    switch (source) {
        case 'wallet':
            const wallet = GetWallet(interaction.user.id);
            if (wallet < amount) return interaction.editReply({
                content: `:x: Sorry **${interaction.user.displayName}**, but you don't have enough okash in your wallet to move!`
            });
            RemoveFromWallet(interaction.user.id, amount);
            AddToBank(interaction.user.id, amount);
            break;

        case 'bank':
            const bank = GetBank(interaction.user.id);
            if (bank < amount) return interaction.editReply({
                content: `:x: Sorry **${interaction.user.displayName}**, but you don't have enough okash in your bank to move!`
            });
            RemoveFromBank(interaction.user.id, amount);
            AddToWallet(interaction.user.id, amount);
            break;
    }

    interaction.editReply({
        content: `${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}**, moved ${GetEmoji(EMOJI.OKASH)} OKA**${amount}**!`
    });
}

export const MoveMoneySlashCommand = 
    new SlashCommandBuilder()
        .setName('move').setNameLocalization('ja', '動く')
        .setDescription('Move okash between your wallet and bank').setDescriptionLocalization('ja', 'okashポケットから銀行へのokash動かします')
        .addNumberOption(option => option
            .setName('amount').setNameLocalization('ja', '高')
            .setDescription('How much to move').setDescriptionLocalization('ja', 'okashの分量を動く')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option => option
            .setName('source').setDescriptionLocalization('ja', '行き先')
            .setDescription('Which way to move').setDescriptionLocalization('ja', 'どこからどこへのokash動く')
            .setRequired(true)
            .addChoices(
                {name:'Wallet -> Bank', value:'wallet', name_localizations:{ja:'ポケット ➞ 銀行'}},
                {name:'Bank -> Wallet', value:'bank', name_localizations:{ja:'銀行 ➞ ポケット'}},
            )
        )