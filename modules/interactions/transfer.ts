import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, TextChannel } from "discord.js";
import { AddToBank, AddToWallet, GetBank, GetWallet, RemoveFromBank, RemoveFromWallet } from "../okash/wallet";
import { EMOJI, GetEmoji } from "../../util/emoji";
import { BANK_ROBS } from "../okash/games/rob";
import { Achievements, GrantAchievement } from "../passive/achievement";
import { CheckGambleLock } from "../okash/games/_lock";


export async function HandleCommandTransfer(interaction: ChatInputCommandInteraction) {
    if (CheckGambleLock(interaction.user.id)) return interaction.reply({
        content: 'nah.'
    });

    const amount = interaction.options.getNumber('amount', true);
    const source = interaction.options.getString('source', true);

    if (amount.toString().includes('.')) return interaction.reply({
        content: `:x: Cannot move a non-whole amount of okash`,
        flags:[MessageFlags.Ephemeral]
    });

    if (amount == 0 && source != 'math') return interaction.reply({
        content: `:x: ${GetEmoji(EMOJI.OKASH)} OKA**0** is only a valid amount when using the "Set Wallet To" option.`,
        flags:[MessageFlags.Ephemeral]
    });

    await interaction.deferReply();

    const bank = GetBank(interaction.user.id);
    const wallet = GetWallet(interaction.user.id);
    
    switch (source) {
        case 'wallet':
            if (wallet < amount) return interaction.editReply({
                content: `:x: Sorry **${interaction.user.displayName}**, but you don't have enough okash in your wallet to move!`,
            });

            RemoveFromWallet(interaction.user.id, amount);
            AddToBank(interaction.user.id, amount);
            if (BANK_ROBS.has(interaction.user.id)) {
                const time = (new Date()).getTime()/1000;
                const robbery = BANK_ROBS.get(interaction.user.id)!;
                if (robbery.when + 60 > time) GrantAchievement(interaction.user, Achievements.STEAL_THEN_DEPOSIT, interaction.channel as TextChannel);
            }
            break;

        case 'bank':
            if (bank < amount) return interaction.editReply({
                content: `:x: Sorry **${interaction.user.displayName}**, but you don't have enough okash in your bank to move!`
            });
            RemoveFromBank(interaction.user.id, amount);
            AddToWallet(interaction.user.id, amount);
            break;

        case 'math':
            if (wallet < amount && bank < amount) return interaction.editReply({
                content: `:x: Sorry **${interaction.user.displayName}**, but you don't have enough okash in your wallet/bank to move!`
            });

            // if wallet is larger than amount, move to bank
            // eg. (w)15000 -> (a)5000 = -10000
            if (wallet > amount) {
                RemoveFromWallet(interaction.user.id, Math.abs(amount-wallet));
                AddToBank(interaction.user.id, Math.abs(amount-wallet));
            }
            // if wallet is smaller than amount, move from bank
            // eg. (w)5000 -> (a)15000 = +10000
            if (wallet < amount) {
                AddToWallet(interaction.user.id, Math.abs(amount-wallet));
                RemoveFromBank(interaction.user.id, Math.abs(amount-wallet));
            }

            return interaction.editReply({
                content: `${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}**, moved the amount to make your wallet ${GetEmoji(EMOJI.OKASH)} OKA**${amount}**!`
            });
    }

    interaction.editReply({
        content: `${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}**, moved ${GetEmoji(EMOJI.OKASH)} OKA**${amount}**!`
    });
}

export const MoveMoneySlashCommand = 
    new SlashCommandBuilder()
        .setName('move').setNameLocalization('ja', '動かす')
        .setDescription('Move okash between your wallet and bank').setDescriptionLocalization('ja', 'okashポケットから銀行へのokash動かします')
        .addNumberOption(option => option
            .setName('amount').setNameLocalization('ja', '高')
            .setDescription('How much to move').setDescriptionLocalization('ja', 'okashの分量を動かす')
            .setRequired(true)
            .setMinValue(0)
        )
        .addStringOption(option => option
            .setName('source').setDescriptionLocalization('ja', '行き先')
            .setDescription('How to move').setDescriptionLocalization('ja', 'どこからどこへのokash動かす')
            .setRequired(true)
            .addChoices(
                {name:'Wallet -> Bank', value:'wallet', name_localizations:{ja:'ポケット ➞ 銀行'}},
                {name:'Bank -> Wallet', value:'bank', name_localizations:{ja:'銀行 ➞ ポケット'}},
                {name:'Set Wallet To', value:'math', name_localizations:{ja:'ポケット・セット'}},
            )
        )