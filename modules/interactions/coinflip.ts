import { ChatInputCommandInteraction } from "discord.js";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { CheckOkashRestriction, FLAG, GetUserProfile, OKASH_ABILITY, UpdateUserProfile } from "../user/prefs";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { BASE_DIRNAME } from "../..";
import { join } from "path";
import { getRandomValues } from "crypto";

const ActiveFlips: Array<string> = [];

const USE_CUSTOMIZATION = false;
const WIN_CHANCE = 0.5;
const WEIGHTED_WIN_CHANCE = 0.3;

const COIN_EMOJIS_FLIP: {
    [key: number]: string
} = {
    0:'<a:cfw:1314729112065282048>',
    1:'<a:cfw_red:1316187589413306379>',
    2:'<a:cfw_dblue:1316187541417758811>',
    3:'<a:cfw_blue:1316187516319039508>',
    4:'<a:cfw_pink:1316173461118255145>',
    5:'<a:cfw_purple:1316175061966782555>',
    16:'<a:cfw_dgreen:1316187567988801566>',
    17:'<a:cfw_rainbow:1316224255511367710>'
}
const COIN_EMOJIS_DONE: {
    [key: number]: string
} = {
    0:'<:cff:1314729249189400596>',
    1:'<:cff_red:1316187598791905280>',
    2:'<:cff_dblue:1316187532349935728>',
    3:'<:cff_blue:1316187504067739699>',
    4:'<:cff_pink:1316173446803226665>',
    5:'<:cff_purple:1316175038042472491>',
    16:'<:cff_dgreen:1316187558375456859>',
    17:'<a:cff_rainbow:1316224243855261776>',
}

interface coin_floats {
    coinflip:{
        high: {
            value: number,
            user_id: string
        },
        low: {
            value: number,
            user_id: string
        }
    }
}

export async function HandleCommandCoinflip(interaction: ChatInputCommandInteraction) {
    const has_restriction = await CheckOkashRestriction(interaction, OKASH_ABILITY.GAMBLE);
    if (has_restriction) return;

    const stats_file = join(BASE_DIRNAME, 'stats.oka');

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
    const emoji_waiting = weighted_coin_equipped?'<a:cfw_green:1315842708090392606>':COIN_EMOJIS_FLIP[prefs.customization.coin_color];
    const emoji_finish = weighted_coin_equipped?'<:cff_green:1315843280776462356>':COIN_EMOJIS_DONE[prefs.customization.coin_color];
    
    // set probabilities and decide outcome
    const rolled = Math.random();
    let win: boolean = false; 

    // .5 is always inclusive bc idgaf
    if (side == 'heads') win = rolled >= (weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE);
    else if (side == 'tails') win = rolled <= (weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE);
    else win = rolled >= (weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE);
        
        
    let first_message = `**${interaction.user.displayName}** flips a coin for OKA**${bet}** on **${side || 'heads'}**...`
    let next_message = `**${interaction.user.displayName}** flips a coin for OKA**${bet}** on **${side || 'heads'}**... and ${win?'won the bet, doubling the money! <:cat_money:1315862405607067648>':'lost the bet, losing the money. :crying_cat_face:'}\n-# ${rolled} (must be ${(side=='heads'||!side)?'>=':'<='} ${weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE} to win)`;

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

    await interaction.reply({
        content: `${emoji_waiting} ${first_message}`
    });

    if (rolled >= 0.5 && rolled < 0.50001) {
        setTimeout(() => {
            // win regardless, it landed on the side!!!
            next_message = `${first_message} and lands it on the side:interrobang: They now get 5x their bet, earning <:okash:1315058783889657928> OKA**${bet*5}**\n-# Roll was ${rolled} | If a weighted coin was equipped, it has not been used.`;
            
            ActiveFlips.splice(ActiveFlips.indexOf(interaction.user.id), 1);
            AddToWallet(interaction.user.id, bet*5);
            
            interaction.editReply({
                content: `${emoji_finish} ${next_message}`
            });
        }, 3000);

        return;
    }

    // get rid of weighted coin after one use
    if (weighted_coin_equipped) {
        prefs.flags.splice(prefs.flags.indexOf(FLAG.WEIGHTED_COIN_EQUIPPED), 1);
        UpdateUserProfile(interaction.user.id, prefs);
    }

    setTimeout(() => {
        const stats: coin_floats = JSON.parse(readFileSync(stats_file, 'utf-8'));

        let new_float = '';

        if (stats.coinflip.high.value < rolled) { 
            new_float += `\n**NEW HIGHEST ROLL:** \`${rolled}\` is the highest float someone has rolled on okabot!`;
            stats.coinflip.high.value = rolled;
            stats.coinflip.high.user_id = interaction.user.id;
        }
        if (stats.coinflip.low.value > rolled) {
            new_float += `\n**NEW LOWEST ROLL:** \`${rolled}\` is the lowest float someone has rolled on okabot!`;
            stats.coinflip.low.value = rolled;
            stats.coinflip.low.user_id = interaction.user.id;
        }

        interaction.editReply({
            content: `${emoji_finish} ${next_message}${new_float}`
        });
        
        writeFileSync(stats_file, JSON.stringify(stats), 'utf-8');

        ActiveFlips.splice(ActiveFlips.indexOf(interaction.user.id), 1);

        if (win)
            AddToWallet(interaction.user.id, bet*2);
    }, 3000);
}
