import { Client, EmbedBuilder, Message, TextChannel } from "discord.js";
import { AddOneToInventory, AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { GEMS, ITEMS, ITEM_TYPE } from "../okash/items";
import { Logger } from "okayulogger";
import { GetUserProfile, RestrictUser, UpdateUserProfile } from "../user/prefs";
import { BASE_DIRNAME, client, DEV, LISTENING, SetListening } from "../..";
import { SelfUpdate } from "../../util/updater";
import { EMOJI, GetEmoji } from "../../util/emoji";
import { UpdateMarkets } from "../okash/stock";
import { join } from "path";
import { readdirSync } from "fs";
import { DoEarthquakeTest, SOCKET } from "../earthquakes/earthquakes";
import { Achievements, GrantAchievement } from "./achievement";

const L = new Logger('onMessage.ts');

export async function CheckAdminShorthands(message: Message) {
    try {
        if (message.author.id == "796201956255334452" || message.author.id == "502879264081707008") {
            if (message.content.startsWith('oka ') && 
                (message.content.includes('them') || 
                message.content.includes("796201956255334452")) && 
                (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id == "796201956255334452"
            ) {
                message.react('❌');
                return message.reply('https://tenor.com/view/anime-rikka-takanashi-yuuta-togashi-chuunibyou-demo-koi-ga-shitai-gif-23394441');
            }

            if (message.content.startsWith('oka dep ')) {
                const params = message.content.split(' ');
                if (params.length != 4) return message.react('❌');

                if (params[2] == 'me') params[2] = message.author.id;
                if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;

                if (Number.isNaN(parseInt(params[2]))) throw new Error('params[2] is NaN');

                let receiver_bank_amount = GetWallet(params[2]);
                receiver_bank_amount += parseInt(params[3]);
                AddToWallet(params[2], parseInt(params[3]));

                const user = client.users.cache.get(params[2]);

                const receiver_embed = new EmbedBuilder()
                    .setColor(0x9d60cc)
                    .setTitle(`You received some okash!`)
                    .addFields(
                        {name:'⬆️ Sender', value:'SYSTEM', inline: true},
                        {name:'⬇️ Receiver', value:''+user?.displayName, inline: true},
                    )
                    .setDescription(`okash Transfer of OKA${params[2]}.`);
                    
                try {
                    user?.send({
                        embeds:[receiver_embed]
                    });
                } catch (err) {
                    message.react('⚠️');
                }

                message.react('✅');
            }

            if (message.content.startsWith('oka depa ')) {
                const regex = /"([^"]+)"|(\S+)/g;
                const params = [...message.content.matchAll(regex)].map(match => match[1] || match[2]);

                if (Number.isNaN(parseInt(params[2]))) return message.react('❌');

                const wallet_dir = join(BASE_DIRNAME, 'money', 'wallet');

                readdirSync(wallet_dir).forEach(file => {
                    const user_id = file.split('.oka')[0];
                    const user = client.users.cache.get(user_id);

                    AddToWallet(user_id, parseInt(params[2]));

                    const receiver_embed = new EmbedBuilder()
                        .setColor(0x9d60cc)
                        .setTitle(`You received some okash!`)
                        .addFields(
                            {name:'⬆️ Sender', value:'SYSTEM', inline: true},
                            {name:'⬇️ Receiver', value:''+user?.displayName, inline: true},
                        )
                        .setDescription(`okash Transfer of OKA${params[2]}.`);

                    user?.send({
                        embeds:[receiver_embed]
                    });
                });

                message.react('✅');
            }

            if (message.content.startsWith('oka wd ')) {
                const params = message.content.split(' ');
                if (params.length != 4) return message.react('❌');

                if (params[2] == 'me') params[2] = message.author.id;
                if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;
                
                if (Number.isNaN(parseInt(params[2]))) throw new Error('params[2] is NaN');

                let receiver_bank_amount = GetWallet(params[2]);
                receiver_bank_amount -= parseInt(params[3]);
                RemoveFromWallet(params[2], parseInt(params[3]));

                message.react('✅');
                (message.channel as TextChannel).send(`<@!${params[2]}>, your new balance is OKA${receiver_bank_amount}.`);
            }

            if (message.content.startsWith('oka ig ')) {
                const params = message.content.split(' ');
                if (params.length != 4) return message.react('❌');

                if (params[2] == 'me') params[2] = message.author.id;
                if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;
                
                if (Number.isNaN(parseInt(params[2]))) throw new Error('params[2] is NaN');

                AddOneToInventory(params[2], ITEM_TYPE.GEM, parseInt(params[3]));

                message.react('✅');
                (message.channel as TextChannel).send(`<@!${params[2]}>, inserted one \`${params[3]}\` into your inventory.`);
            }

            if (message.content.startsWith('oka ii ')) {
                const params = message.content.split(' ');
                if (params.length != 4) return message.react('❌');

                if (params[2] == 'me') params[2] = message.author.id;
                if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;
                
                if (Number.isNaN(parseInt(params[2]))) throw new Error('params[2] is NaN');

                AddOneToInventory(params[2], ITEM_TYPE.ITEM, parseInt(params[3]));

                message.react('✅');
                (message.channel as TextChannel).send(`<@!${params[2]}>, inserted one \`${params[3]}\` into your inventory.`);
            }


            if (message.content.startsWith('oka w ')) {
                const params = message.content.split(' ');
                const original_param_2 = message.content.split(' ')[2];
                if (params.length < 4) return message.react('❌');

                if (params[2] == 'me') params[2] = message.author.id;
                if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;
                
                if (Number.isNaN(parseInt(params[2]))) throw new Error('params[2] is NaN');
                
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('Warning')
                    .setDescription('You have received a warning for your behavior with the bot. Continuing with this behavior may result in a ban.')
                    .addFields({
                        name:'Reason', value:''+message.content.split(original_param_2)[1]
                    });

                message.client.users.cache.find((user) => user.id == params[2])!.send({embeds:[embed]});

                message.react('✅');
            }

            // oka restrict them "1/2/34 12:34:00 PM" "abilities go here" "reason goes here"
            if (message.content.startsWith('oka restrict ')) {
                const regex = /"([^"]+)"|(\S+)/g;
                const params = [...message.content.matchAll(regex)].map(match => match[1] || match[2]);
                
                if (params.length < 6) return message.react('❌');

                if (params[2] == 'me') params[2] = message.author.id;
                if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;
                
                if (Number.isNaN(parseInt(params[2]))) throw new Error('params[2] is NaN');
                
                RestrictUser(message.client, params[2], params[3], params[4], params[5]);

                message.react('✅');
            }

            // oka lift <user_id | me | them>
            if (message.content.startsWith('oka lift')) {
                const regex = /"([^"]+)"|(\S+)/g;
                const params = [...message.content.matchAll(regex)].map(match => match[1] || match[2]);
                
                if (params.length < 3) return message.react('❌');

                if (params[2] == 'me') params[2] = message.author.id;
                if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;
                
                if (Number.isNaN(parseInt(params[2]))) throw new Error('params[2] is NaN');

                // update their account
                const profile = GetUserProfile(params[2]);
                profile.okash_restriction = {
                    is_restricted: false,
                    until: 0,
                    reason: 'unrestricted',
                    abilities: ''
                };
                UpdateUserProfile(params[2], profile);


                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Important Account Update')
                    .setDescription('Any previous restriction on okash features were manually lifted just now.')

                message.client.users.cache.find((user) => user.id == params[2])!.send({embeds:[embed]});

                message.react('✅');
            }

            // pausing/resuming of bot actions
            if (message.content == 'oka toggle') {
                SetListening(!LISTENING);

                message.reply({
                    content: LISTENING?
                    ':arrow_forward: resumed command handling':
                    ':pause_button: paused command handling'
                })

                message.react('✅');
            }

            // updating via message command
            if (message.content == 'oka update') {
                SelfUpdate(message);
            }

            if (message.content.startsWith('oka rollback ')) {
                const regex = /"([^"]+)"|(\S+)/g;
                const params = [...message.content.matchAll(regex)].map(match => match[1] || match[2]);
                SelfUpdate(message, params[2]);
            }

            // oka level <user> <+-amt>
            if (message.content.startsWith('oka level ')) {
                const regex = /"([^"]+)"|(\S+)/g;
                const params = [...message.content.matchAll(regex)].map(match => match[1] || match[2]);
                
                if (params.length < 4) return message.react('❌');

                if (params[2] == 'me') params[2] = message.author.id;
                if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;
                
                if (Number.isNaN(parseInt(params[2]))) throw new Error('params[2] is NaN');

                const profile = GetUserProfile(params[2]);
                const level_change = parseInt(params[3]);

                profile.level.level += level_change;

                UpdateUserProfile(params[2], profile);

                message.react('✅');
            }


            // DEV only ones
            if (message.content == 'oka stock update') {
                if (!DEV) {
                    message.react('❌');
                    return message.reply({
                        content:'Bot does not have the `use dev token` flag. This command is only available on devmode bots.'
                    });
                }

                UpdateMarkets(message.client);
                message.react('✅');
            }

            // DEV only ones
            if (message.content.startsWith('oka eq test')) {
                const data = message.content.split('oka eq test ')[1];

                // if (params.length != 4) {
                //     message.react('❌');
                //     console.log(params);
                //     return message.reply({
                //         content:`Malformed command. (params is ${params.length} long, it should only be four!!!)`
                //     });
                // }

                if (!DEV) {
                    message.react('❌');
                    return message.reply({
                        content:'Bot does not have the `use dev token` flag. This command is only available on devmode bots.'
                    });
                }

                DoEarthquakeTest(JSON.parse(data));
                
                message.react('✅');
            }
        }
    } catch (err) {
        message.reply({content:'error while parsing your command. check the params and try again.\n`' + err + '`'})
        console.error(err);
        return message.react('❌');
    }
}

export async function DoRandomOkashRolls(message: Message) {
    // random cash rolls for each message
    // 1 in 500 seems decent enough for 1-1000 i think...
    const small_roll = Math.floor(Math.random() * 500);
    // L.info(`small roll: ${small_roll}`);
    if (small_roll == 250) {
        L.info('trigger small reward');
        const find_money_msg = await message.reply(':grey_question: ...oh? what\'s this..?');
        return setTimeout(() => {
            const found_amount = Math.floor(Math.random() * 1000);

            AddToWallet(message.author.id, found_amount);
            GrantAchievement(message.author, Achievements.OKASH_DROP, message.channel as TextChannel);

            find_money_msg.edit(`:scream_cat: **${message.author.username}**! You found OKA${found_amount}!`);
        }, 3000);
    }

    // 1 in 2500 for a BIG payout
    // arbitrary number 1561 cuz why not!
    const big_roll = Math.floor(Math.random() * 2500);
    // L.info(`big roll: ${big_roll}`);
    if (big_roll == 1561) {
        L.info('trigger big reward');
        const find_money_msg = await message.reply(':question: ...oh? what\'s this..?');
        return setTimeout(() => {
            let max = 10000;
            let min = 5000;
            const found_amount = Math.floor(Math.random() * (max - min) + min);

            AddToWallet(message.author.id, found_amount);
            GrantAchievement(message.author, Achievements.OKASH_DROP, message.channel as TextChannel);

            find_money_msg.edit(`:scream_cat: **${message.author.username}**, holy beans!! You found ${GetEmoji(EMOJI.OKASH)} OKA**${found_amount}**!`);
        }, 3000);
    }
}

export async function DoRandomLootboxRolls(message: Message) {
    // Roll for lootbox drop
    const common_lootbox_roll = Math.floor(Math.random() * 250);  // Roll between 0 and 249
    // L.info(`Rolled number: ${common_lootbox_roll}`);
    const lootbox_trigger = 13; // The number that triggers a lootbox

    if (common_lootbox_roll == lootbox_trigger) {
        L.info('Lootbox triggered!');

        const find_lootbox_message = await message.reply(`:anger: ouch! what the...?`);

        return setTimeout(() => {
            // Add lootbox to inventory for later opening            
            AddOneToInventory(message.author.id, ITEM_TYPE.ITEM, ITEMS.RANDOM_DROP_COMMON);
            GrantAchievement(message.author, Achievements.LOOTBOX_DROP, message.channel as TextChannel);

            find_lootbox_message.edit(`:scream_cat: **${message.author.username}**! You tripped over a lootbox!`);
        }, 3000);
    }
        
    // Roll for lootbox drop
    const rare_lootbox_roll = Math.floor(Math.random() * 1000);  // Roll between 0 and 999 (because they were too common?!)
    // L.info(`Rolled number: ${rare_lootbox_roll}`);
    const rare_lootbox_trigger = 37; // The number that triggers a lootbox

    if (rare_lootbox_roll == rare_lootbox_trigger) {
        L.info('Lootbox triggered!');
        const find_lootbox_message = await message.reply(`:anger: ouchies! what was that...?`);
        return setTimeout(() => {
            // Add lootbox to inventory for later opening            
            AddOneToInventory(message.author.id, ITEM_TYPE.ITEM, ITEMS.RANDOM_DROP_RARE);
            GrantAchievement(message.author, Achievements.LOOTBOX_DROP, message.channel as TextChannel);

            find_lootbox_message.edit(`:scream_cat: **${message.author.username}**, woah!! You fell over a rare lootbox!`);
        }, 3000);
    }
}
