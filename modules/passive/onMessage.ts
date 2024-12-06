import { Message, TextChannel } from "discord.js";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";


export async function CheckAdminShorthands(message: Message) {
    if (message.author.id == "796201956255334452") {
        if (message.content.startsWith('oka dep ')) {
            const params = message.content.split(' ');
            if (params.length != 4) return message.react('❌');

            let receiver_bank_amount = GetWallet(params[2]);
            receiver_bank_amount += parseInt(params[3]);
            AddToWallet(params[2], parseInt(params[3]));

            message.react('✅');
            (message.channel as TextChannel).send(`<@!${params[2]}>, your new balance is OKA${receiver_bank_amount}.`);
        }
        if (message.content.startsWith('oka wd ')) {
            const params = message.content.split(' ');
            if (params.length != 4) return message.react('❌');
            
            let receiver_bank_amount = GetWallet(params[2]);
            receiver_bank_amount -= parseInt(params[3]);
            RemoveFromWallet(params[2], parseInt(params[3]));
            
            message.react('✅');
            (message.channel as TextChannel).send(`<@!${params[2]}>, your new balance is OKA${receiver_bank_amount}.`);
        }
    }
}

export async function DoRandomOkashRolls(message: Message) {
    // random cash rolls for each message
    // 1 in 500 seems decent enough for 1-1000 i think...
    const small_roll = Math.floor(Math.random() * 500);
    console.log('small roll: ' + small_roll);
    if (small_roll == 250) {
        console.log('trigger small reward');
        const find_money_msg = await message.reply(':grey_question: ...oh? what\'s this..?');
        return setTimeout(() => {
            const found_amount = Math.floor(Math.random() * 1000);

            AddToWallet(message.author.id, found_amount);

            find_money_msg.edit(`:scream_cat: **${message.author.username}**! You found OKA${found_amount}!`);
        }, 3000);
    }

    // 1 in 2500 for a BIG payout
    // arbitrary number 1561 cuz why not!
    const big_roll = Math.floor(Math.random() * 2500);
    console.log(`big roll: ${big_roll}`);
    if (big_roll == 1561) {
        console.log('trigger big reward');
        const find_money_msg = await message.reply(':question: ...oh? what\'s this..?');
        return setTimeout(() => {
            let max = 10000;
            let min = 5000;
            const found_amount = Math.floor(Math.random() * (max - min) + min);

            AddToWallet(message.author.id, found_amount);

            find_money_msg.edit(`:scream_cat: **${message.author.username}**, holy beans!! You found OKA${found_amount}!`);
        }, 3000);
    }
}