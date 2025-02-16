import {Message, TextChannel} from "discord.js";
import {AddOneToInventory, AddToWallet} from "../okash/wallet";
import {ITEMS} from "../okash/items";
import {Logger} from "okayulogger";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {Achievements, GrantAchievement} from "./achievement";

const L = new Logger('onMessage.ts');

async function Sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function DoRandomDrops(message: Message) {
    const small_roll = Math.floor(Math.random() * 500);
    const large_roll = Math.floor(Math.random() * 2500);
    const ex_roll = Math.floor(Math.random() * 5000);

    switch (small_roll) {
        case 250:
            L.info('trigger small reward');
            const found_amount = Math.ceil(Math.random() * 1000);
            const sr_reply = await message.reply(":grey_question: Hey, something's on the ground...");
            await Sleep(3000);
            await sr_reply.edit(`:scream_cat: Hey, something's on the ground... and it was ${GetEmoji(EMOJI.OKASH)} OKA**${found_amount}**!`);
            GrantAchievement(message.author, Achievements.OKASH_DROP, message.channel as TextChannel);
            AddToWallet(message.author.id, found_amount);
            break;

        case 306:
            L.info('trigger common lootbox');
            const cl_reply = await message.reply(':anger: Ow..!?');
            await Sleep(3000);
            await cl_reply.reply(':anger: Ow..!? Why was there a :package: **Common Lootbox** there!?');
            GrantAchievement(message.author, Achievements.LOOTBOX_DROP, message.channel as TextChannel);
            AddOneToInventory(message.author.id, ITEMS.LOOTBOX_COMMON);
            break;

        default:
            break;
    }

    switch (large_roll) {
        case 1561:
            L.info('trigger large reward');
            const found_amount = Math.ceil(Math.random() * 5000) + 5000; // 5000-10000
            const sr_reply = await message.reply(":question: Hey, something's on the ground...");
            await Sleep(3000);
            await sr_reply.edit(`:scream_cat: Hey, something's on the ground... and it was ${GetEmoji(EMOJI.OKASH)} OKA**${found_amount}**!`);
            GrantAchievement(message.author, Achievements.OKASH_DROP, message.channel as TextChannel);
            AddToWallet(message.author.id, found_amount);
            break;

        case 37:
            L.info('trigger rare lootbox');
            const cl_reply = await message.reply(':anger: Ow..!?');
            await Sleep(3000);
            await cl_reply.reply(':anger: Ow..!? Why was there a :package: **Rare Lootbox** there!?');
            GrantAchievement(message.author, Achievements.LOOTBOX_DROP, message.channel as TextChannel);
            AddOneToInventory(message.author.id, ITEMS.LOOTBOX_COMMON);
            break;

        default:
            break;
    }
}
