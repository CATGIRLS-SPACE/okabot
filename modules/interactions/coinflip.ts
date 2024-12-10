import { ChatInputCommandInteraction } from "discord.js";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { FLAG, GetUserProfile, UpdateUserProfile } from "../user/prefs";

const ActiveFlips: Array<string> = [];

const WIN_CHANCE = 0.5;
const WEIGHTED_WIN_CHANCE = 0.3; // decrease it because this is actually the loss chance i guess
const USE_CUSTOMIZATION = false;

export async function HandleCommandCoinflip(interaction: ChatInputCommandInteraction) {
    if (ActiveFlips.indexOf(interaction.user.id) != -1) return interaction.reply({
        content: `:bangbang: Woah there, **${interaction.user.displayName}**! You can only flip one coin at a time!`
    });

    const wallet = GetWallet(interaction.user.id);
    const bet = interaction.options.getNumber('amount')!;
    const side = interaction.options.getString('side');

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
    let win: boolean = false; 

    // .5 is always inclusive bc idgaf
    if (side == 'heads') win = rolled >= (weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE);
    else if (side == 'tails') win = rolled <= (weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE);
    else win = rolled >= (weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE);
        
        
    let first_message = `**${interaction.user.displayName}** flips a coin for OKA**${bet}**...`
    let next_message = `**${interaction.user.displayName}** flips a coin for OKA**${bet}**... and ${win?'won the bet, doubling the money! <:cat_money:1315862405607067648>':'lost the bet, losing the money. :crying_cat_face:'}\n-# ${rolled} (must be ${(side=='heads'||!side)?'>=':'<='} ${weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE} to win)`;

    // toggle for customization of messages (this could potentially be a bad idea but i hope not cuz its cool)
    if (USE_CUSTOMIZATION) {
        const prefs = GetUserProfile(interaction.user.id);
        first_message = prefs.customization.messages.coinflip_first
            .replaceAll('{user}', `**${interaction.user.displayName}**`)
            .replaceAll('{amount}', `OKA**${bet}**`);

        next_message = (win?prefs.customization.messages.coinflip_win:prefs.customization.messages.coinflip_loss)
            .replaceAll('{user}', `**${interaction.user.displayName}**`)
            .replaceAll('{amount}', `OKA**${bet}**`);
    }


    // get rid of weighted coin after one use
    if (weighted_coin_equipped) {
        prefs.flags.splice(prefs.flags.indexOf(FLAG.WEIGHTED_COIN_EQUIPPED), 1);
        UpdateUserProfile(interaction.user.id, prefs);
    }

    await interaction.reply({
        content: `${emoji_waiting} ${first_message}`
    });

    setTimeout(() => {
        interaction.editReply({
            content: `${emoji_finish} ${next_message}`
        });

        ActiveFlips.splice(ActiveFlips.indexOf(interaction.user.id), 1);

        if (win)
            AddToWallet(interaction.user.id, bet*2);
    }, 3000);
}
