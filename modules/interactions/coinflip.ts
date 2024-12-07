import { ChatInputCommandInteraction } from "discord.js";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";

const ActiveFlips: Array<string> = [];

export async function HandleCommandCoinflip(interaction: ChatInputCommandInteraction) {
    if (ActiveFlips.indexOf(interaction.user.id) != -1) return interaction.reply({
        content: `:bangbang: Woah there, **${interaction.user.displayName}**! You can only flip one coin at a time!`
    });
    
    ActiveFlips.push(interaction.user.id);

    const wallet = GetWallet(interaction.user.id);
    const bet = interaction.options.getNumber('amount')!;

    // checks
    if (bet <= 0) return interaction.reply({content:`**${interaction.user.displayName}**, you cannot flip a that amount.`});
    if (wallet < bet) return interaction.reply({content:`**${interaction.user.displayName}**, you cannot flip more than you have in your wallet.`});

    RemoveFromWallet(interaction.user.id, bet);

    const win: boolean = Math.round(Math.random()) == 1;

    await interaction.reply({
        content: `<a:cfw:1314729112065282048> **${interaction.user.displayName}** flips a coin for ${bet}...`
    });

    const next_message = `<:cff:1314729249189400596> **${interaction.user.displayName}** flips a coin for ${bet}... and ${win?'won the bet, doubling the money! :smile_cat:':'lost the bet, forefeiting the money. :crying_cat_face:'}`;

    setTimeout(() => {
        interaction.editReply({
            content: next_message
        });

        ActiveFlips.splice(ActiveFlips.indexOf(interaction.user.id), 1);

        if (win)
            AddToWallet(interaction.user.id, bet*2);
    }, 3000);
}