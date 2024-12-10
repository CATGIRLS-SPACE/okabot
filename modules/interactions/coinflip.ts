import { ChatInputCommandInteraction } from "discord.js";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { FLAG, GetUserProfile, UpdateUserProfile } from "../user/prefs";

const ActiveFlips: Array<string> = [];

const WIN_CHANCE = 0.5;
const WEIGHTED_WIN_CHANCE = 0.3; // decrease it because this is actually the loss chance i guess

export async function HandleCommandCoinflip(interaction: ChatInputCommandInteraction) {
    if (ActiveFlips.indexOf(interaction.user.id) != -1) return interaction.reply({
        content: `:bangbang: Woah there, **${interaction.user.displayName}**! You can only flip one coin at a time!`
    });

    const wallet = GetWallet(interaction.user.id);
    const bet = interaction.options.getNumber('amount')!;

    // checks
    if (bet <= 0) return interaction.reply({content:`:x: **${interaction.user.displayName}**, you cannot flip that amount.`});
    if (wallet < bet) return interaction.reply({content:`:crying_cat_face: **${interaction.user.displayName}**, you cannot flip more than you have in your wallet.`});

    // don't let the user do multiple coinflips and take the money immediately
    ActiveFlips.push(interaction.user.id);
    RemoveFromWallet(interaction.user.id, bet);

    // check if user has weighted coin
    const prefs = GetUserProfile(interaction.user.id);
    const weighted_coin_equipped = (prefs.flags.indexOf(FLAG.WEIGHTED_COIN_EQUIPPED) != -1);
    const emoji_waiting = weighted_coin_equipped?'<a:cfw_green:1315842708090392606>':'<a:cfw:1314729112065282048>';
    const emoji_finish = weighted_coin_equipped?'<:cff_green:1315843280776462356>':'<:cff:1314729249189400596>';
    
    // set probabilities and decide outcome
    const rolled = Math.random();
    const win: boolean = rolled >= (weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE);

    // get rid of weighted coin after one use
    if (weighted_coin_equipped) {
        prefs.flags.splice(prefs.flags.indexOf(FLAG.WEIGHTED_COIN_EQUIPPED), 1);
        UpdateUserProfile(interaction.user.id, prefs);
    }

    await interaction.reply({
        content: `${emoji_waiting} **${interaction.user.displayName}** flips a coin for OKA**${bet}**...`
    });

    const next_message = `${emoji_finish} **${interaction.user.displayName}** flips a coin for OKA**${bet}**... and ${win?'won the bet, doubling the money! <:cat_money:1315862405607067648>':'lost the bet, losing the money. :crying_cat_face:'}\n-# ${rolled} (must be >= ${weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE} to win)`;

    setTimeout(() => {
        interaction.editReply({
            content: next_message
        });

        ActiveFlips.splice(ActiveFlips.indexOf(interaction.user.id), 1);

        if (win)
            AddToWallet(interaction.user.id, bet*2);
    }, 3000);
}
