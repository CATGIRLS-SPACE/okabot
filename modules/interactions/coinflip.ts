import { ChatInputCommandInteraction } from "discord.js";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";

const ActiveFlips: Array<string> = [];

export async function HandleCommandCoinflip(interaction: ChatInputCommandInteraction) {
    if (ActiveFlips.indexOf(interaction.user.id) != -1) return interaction.reply({
        content: `:bangbang: Woah there, **${interaction.user.displayName}**! You can only flip one coin at a time!`
    });

    const wallet = GetWallet(interaction.user.id);
    const bet = interaction.options.getNumber('amount')!;

    // checks
    if (bet <= 0) return interaction.reply({content:`:x: **${interaction.user.displayName}**, you cannot flip a that amount.`});
    if (wallet < bet) return interaction.reply({content:`:crying_cat_face: **${interaction.user.displayName}**, you cannot flip more than you have in your wallet.`});

    ActiveFlips.push(interaction.user.id);
    RemoveFromWallet(interaction.user.id, bet);

    
    const rolled = Math.random();
    const win: boolean = rolled >= 0.5;

    await interaction.reply({
        content: `<a:cfw:1314729112065282048> **${interaction.user.displayName}** flips a coin for ${bet}...`
    });

    const next_message = `<:cff:1314729249189400596> **${interaction.user.displayName}** flips a coin for ${bet}... and ${win?'won the bet, doubling the money! :smile_cat:':'lost the bet, losing the money. :crying_cat_face:'}\n-# ${rolled} (must be >= 0.5 to win)`;

    setTimeout(() => {
        interaction.editReply({
            content: next_message
        });

        ActiveFlips.splice(ActiveFlips.indexOf(interaction.user.id), 1);

        if (win)
            AddToWallet(interaction.user.id, bet*2);
    }, 3000);
}
