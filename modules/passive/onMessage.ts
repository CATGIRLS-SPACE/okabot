import {Message, Snowflake, TextChannel, User} from "discord.js";
import {AddOneToInventory, AddToWallet} from "../okash/wallet";
import {ITEMS} from "../okash/items";
import {Logger} from "okayulogger";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {Achievements, GrantAchievement} from "./achievement";
import {client} from "../../index";

const L = new Logger('onMessage.ts');

async function Sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const BoostsActive = new Map<Snowflake, number>();

export async function DoRandomDrops(message: Message, author?: User) {
    const time = Math.round(new Date().getTime() / 1000);
    const boost_active = (BoostsActive.has(message.author.id) && BoostsActive.get(message.author.id)! > time);

    if (author) message.author = author;

    // usually 1 in 500 chance, boost is 1 in 300 <-- these are old, ignore them
    const small_roll = boost_active?Math.floor(Math.random() * 150):Math.floor(Math.random() * 250);
    // usually 1 in 2500, boost is 1 in 1500 <-- these are old, ignore them
    const large_roll = boost_active?Math.floor(Math.random() * 400):Math.floor(Math.random() * 800);
    // usually 1 in 5000, boost is 1 in 1700 <-- low so that incentive is high <-- these are old, ignore them
    const ex_roll = boost_active?Math.floor(Math.random() * 700):Math.floor(Math.random() * 2000);

    switch (small_roll) {
        case 127:
            // you cannot earn okash drops with a boost on since they use the same roll variable
            if (boost_active) break;
            L.info('trigger small reward');
            const found_amount = Math.ceil(Math.random() * 1000);
            const sr_reply = await message.reply(":grey_question: Hey, something's on the ground...");
            await Sleep(3000);
            await sr_reply.edit(`:scream_cat: Hey, something's on the ground... and it was ${GetEmoji(EMOJI.OKASH)} OKA**${found_amount}**!`);
            GrantAchievement(message.author, Achievements.OKASH_DROP, message.channel as TextChannel);
            AddToWallet(message.author.id, found_amount);
            break;

        case 97:
            L.info('trigger common lootbox');
            const cl_reply = await message.reply(':anger: Ow..!?');
            await Sleep(3000);
            await cl_reply.edit(':anger: Ow..!? Why was there a :package: **Common Lootbox** there!?');
            GrantAchievement(message.author, Achievements.LOOTBOX_DROP, message.channel as TextChannel);
            AddOneToInventory(message.author.id, ITEMS.LOOTBOX_COMMON);
            break;

        default:
            break;
    }

    switch (large_roll) {
        case 382:
            if (boost_active) break;
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
            await cl_reply.edit(':anger: Ow..!? Why was there a :package: **Rare Lootbox** there!?');
            GrantAchievement(message.author, Achievements.LOOTBOX_DROP, message.channel as TextChannel);
            AddOneToInventory(message.author.id, ITEMS.LOOTBOX_RARE);
            break;

        default:
            break;
    }

    if (ex_roll == 679) { // im like yea she's fine, wonder when she'll be mine
        L.info('trigger ex lootbox');
        const cl_reply = await message.reply(':anger: Ow..!?');
        await Sleep(3000);
        await cl_reply.edit(':anger: Ow..!? That :package: :sparkle: **EX Lootbox** :sparkle: is so shiny, it hurts my eyes!!');
        GrantAchievement(message.author, Achievements.LOOTBOX_DROP, message.channel as TextChannel);
        AddOneToInventory(message.author.id, ITEMS.LOOTBOX_EX);
    }
}
