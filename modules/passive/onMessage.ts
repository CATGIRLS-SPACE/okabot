import {ChatInputCommandInteraction, Message, Snowflake, TextChannel, User} from "discord.js";
import {AddOneToInventory, AddToWallet} from "../okash/wallet";
import {ITEMS} from "../okash/items";
import {Logger} from "okayulogger";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {Achievements, GrantAchievement} from "./achievement";
import {client, GetLastLocale} from "../../index";
import {LangGetAutoTranslatedString, LangGetAutoTranslatedStringRaw} from "../../util/language";

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
    const small_roll = boost_active?Math.floor(Math.random() * 150):Math.floor(Math.random() * 1000);
    // const small_roll: number = 97; // for testing only
    // usually 1 in 2500, boost is 1 in 1500 <-- these are old, ignore them
    const large_roll = boost_active?Math.floor(Math.random() * 400):Math.floor(Math.random() * 2500);
    // usually 1 in 5000, boost is 1 in 1700 <-- low so that incentive is high <-- these are old, ignore them
    const ex_roll = boost_active?Math.floor(Math.random() * 700):Math.floor(Math.random() * 5000);

    switch (small_roll) {
        case 127:
            // you cannot earn okash drops with a boost on since they use the same roll variable
            if (boost_active) break;
            L.info('trigger small reward');
            const found_amount = Math.ceil(Math.random() * 1000);
            const sr_reply = await message.reply(await LangGetAutoTranslatedStringRaw("<:grey_question:0> Hey, something's on the ground...", GetLastLocale(message.author.id)));
            await Sleep(3000);
            await sr_reply.edit(await LangGetAutoTranslatedStringRaw(`<:scream_cat:0> Hey, something\'s on the ground... and it was ${GetEmoji(EMOJI.OKASH)} OKA**${found_amount}**!`, GetLastLocale(message.author.id)));
            GrantAchievement(message.author, Achievements.OKASH_DROP, message.channel as TextChannel);
            AddToWallet(message.author.id, found_amount);
            break;

        case 97:
            L.info('trigger common lootbox');
            const cl_reply = await message.reply(await LangGetAutoTranslatedStringRaw('<:anger:0> Ow..!?', GetLastLocale(message.author.id)));
            await Sleep(3000);
            await cl_reply.edit(await LangGetAutoTranslatedStringRaw('<:anger:0> Ow..!? Why was there a <:package:0> **Common Lootbox** there!?', GetLastLocale(message.author.id)));
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
            const sr_reply = await message.reply(await LangGetAutoTranslatedStringRaw("<:question:0> Hey, something's on the ground...", GetLastLocale(message.author.id)));
            await Sleep(3000);
            await sr_reply.edit(await LangGetAutoTranslatedStringRaw(`<:scream_cat:0> Hey, something's on the ground... and it was ${GetEmoji(EMOJI.OKASH)} OKA**${found_amount}**!`, GetLastLocale(message.author.id)));
            GrantAchievement(message.author, Achievements.OKASH_DROP, message.channel as TextChannel);
            AddToWallet(message.author.id, found_amount);
            break;

        case 37:
            L.info('trigger rare lootbox');
            const cl_reply = await message.reply(await LangGetAutoTranslatedStringRaw('<:anger:0> Ow..!?', GetLastLocale(message.author.id)));
            await Sleep(3000);
            await cl_reply.edit(await LangGetAutoTranslatedStringRaw('<:anger:0> Ow..!? Why was there a <:package:0> **Rare Lootbox** there!?', GetLastLocale(message.author.id)));
            GrantAchievement(message.author, Achievements.LOOTBOX_DROP, message.channel as TextChannel);
            AddOneToInventory(message.author.id, ITEMS.LOOTBOX_RARE);
            break;

        default:
            break;
    }

    if (ex_roll == 679) { // im like yea she's fine, wonder when she'll be mine
        L.info('trigger ex lootbox');
        const cl_reply = await message.reply(await LangGetAutoTranslatedStringRaw('<:anger:0> Ow..!?', GetLastLocale(message.author.id)));
        await Sleep(3000);
        await cl_reply.edit(await LangGetAutoTranslatedStringRaw('<:anger:0> Ow..!? That <:package:0> :sparkle: **EX Lootbox** :sparkle: is so shiny, it hurts my eyes!!', GetLastLocale(message.author.id)));
        GrantAchievement(message.author, Achievements.LOOTBOX_DROP, message.channel as TextChannel);
        AddOneToInventory(message.author.id, ITEMS.LOOTBOX_EX);
    }
}

// only used for the blue achievement but might expand to more later
export async function DoPresenceChecks(interaction: ChatInputCommandInteraction) {
    if (interaction.channel?.isDMBased()) return;

    const member = await interaction.guild!.members.fetch(interaction.user);
    if (!member) return L.debug('member is undefined');
    
    const presences = member.presence?.activities;
    if (!presences) return;
    
    // console.log(presences);

    presences?.forEach(presence => {
        if (presence.name == 'Blue Archive') GrantAchievement(interaction.user, Achievements.BLUE, interaction.channel as TextChannel);
    });
}