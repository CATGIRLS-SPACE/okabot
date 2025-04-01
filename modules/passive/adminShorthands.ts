import {Client, EmbedBuilder, Message, TextChannel} from "discord.js";
import {Logger} from "okayulogger";
import {
    BASE_DIRNAME,
    client, CONFIG,
    LISTENING,
    SetListening
} from "../../index";
import {Achievements, GrantAchievement} from "./achievement";
import {AddOneToInventory, AddToWallet, GetAllWallets, GetWallet, RemoveFromWallet} from "../okash/wallet";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {GetUserProfile, RestrictUser, UpdateUserProfile, USER_PROFILE} from "../user/prefs";
import {SelfUpdate} from "../../util/updater";
import {ReleaseUserGame} from "../okash/games/roulette";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { error } from "node:console";
import {ManualRelease} from "../okash/games/slots";
import {PassesActive} from "../okash/games/blackjack";
import { ITEM_NAMES } from "../interactions/pockets";
import {BoostsActive} from "./onMessage";
import {SOCKET, open_socket} from "../earthquakes/earthquakes";


interface ShorthandList {
    [key: string]: CallableFunction,
}

const Shorthands: ShorthandList = {};
const L = new Logger('admin shorthands');

/**
 * Register a shorthand command
 * @param key The text to be checked with "startsWith"
 * @param on_trigger The function to be called when the shorthand is triggered (with message, params passed)
 */
function RegisterShorthand(key: string, on_trigger: CallableFunction) {
    Shorthands[key] = on_trigger;
    // L.info(`registered shorthand '${key}'`);
}

function setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
            throw new Error(`Invalid path: ${keys[i]} does not exist`);
        }
        current = current[keys[i]];
    }

    const lastKey = keys[keys.length - 1];

    if (!(lastKey in current)) {
        throw new Error(`Invalid path: ${lastKey} does not exist`);
    }

    current[lastKey] = value;
}

// --

export function RegisterAllShorthands() {
    // okash management
    RegisterShorthand('oka dep ', async (message: Message, params: string[]) => {
        // Deposit okash into an account
        // e.g. "oka dep <ID/them/me> <amount>
        if (Number.isNaN(parseInt(params[2]))) throw new Error("invalid user ID in params[2]");
        const amount = parseInt(params[3]);
        if (Number.isNaN(amount) || amount < 1) throw new Error("params[3] must be a positive integer. usage: oka dep [Snowflake | 'them' | 'me'] [positive integer]");
        AddToWallet(params[2], amount);

        const user = client.users.cache.get(params[2]);

        await message.reply({
            content: `**${user?.username || params[2]}**'s wallet is now ${GetEmoji(EMOJI.OKASH)} OKA**${GetWallet(params[2])}**.`
        });
    });

    RegisterShorthand('oka depall ', async (message: Message, params: string[]) => {
        // Deposit okash into all registered accounts
        // e.g. "oka depa <amount>
        const amount = parseInt(params[2]);
        if (Number.isNaN(amount) || amount < 1) throw new Error("params[2] must be a positive integer. usage: `oka depall [positive integer]`");

        let count = 0;
        GetAllWallets().forEach((wallet) => {
            AddToWallet(wallet.user_id, amount);
            count++;
        });

        await message.reply({
            content: `Added ${GetEmoji(EMOJI.OKASH)} OKA**${amount}** to **${count}** accounts.`
        });
    });

    RegisterShorthand('oka wd ', async (message: Message, params: string[]) => {
        // Withdraw (remove) okash from a user's account
        // e.g. "oka wd <ID/them/me> <amount>
        if (Number.isNaN(parseInt(params[2]))) throw new Error("invalid user ID in params[2]");
        const amount = parseInt(params[3]);
        if (Number.isNaN(amount) || amount < 1) throw new Error("params[3] must be a positive integer. usage: `oka wd [Snowflake | 'them' | 'me'] [positive integer]`");
        RemoveFromWallet(params[2], amount);

        const user = client.users.cache.get(params[2]);

        await message.reply({
            content: `**${user?.username || params[2]}**'s wallet is now ${GetEmoji(EMOJI.OKASH)} OKA**${GetWallet(params[2])}**.`
        });
    });

    // user profile management
    RegisterShorthand('oka mod ', async (message: Message, params: string[]) => {
        if (params[3] == 'daily') {
            const daily_data = JSON.parse(readFileSync(join(BASE_DIRNAME, 'money', 'daily', params[2]+'.oka'), 'utf-8'));

            if (!daily_data) throw new Error(`could not find daily data for ${params[2]}`);

            const types: {[key: string]: 'number' | 'string' | 'boolean'} = {
                'last_get.time': 'number',
                'streak.count': 'number',
                'streak.last_count': 'number',
                'streak.restored': 'boolean',
                'streak.double_claimed': 'boolean'
            };

            if (!types[params[4]]) throw new Error(`property ${params[4]} does not exist!`);

            switch (types[params[4]]) {
                case 'number':
                    let value = parseInt(params[5]);
                    if (Number.isNaN(value)) throw new Error(`invalid value '${params[5]}' for type '${types[params[5]]}'`);
                    daily_data[params[4].split('.')[0]][params[4].split('.')[1]] = value;
                    break;

                case 'boolean':
                    if (params[5] != 'true' && params[5] != 'false') throw new Error(`invalid value '${params[5]}' for type '${types[params[5]]}'`);
                    const v: {[key:string]:boolean} = {'true':true,'false':false};
                    daily_data[params[4].split('.')[0]][params[4].split('.')[1]] = v[params[5]];
                    break;

                default:
                    break;
            }

            writeFileSync(join(BASE_DIRNAME, 'money', 'daily', params[2]+'.oka'), JSON.stringify(daily_data), 'utf-8');

            return message.reply(`Modified daily info of ${params[2]} successfully.`);
        }

        // this is gonna be big...
        if (params[3].startsWith('profile')) {
            const user_data = JSON.parse(readFileSync(join(BASE_DIRNAME, 'profiles', params[2]+'.oka'), 'utf-8'));
            if (!user_data) throw new Error(`could not find profile data for ${params[2]}`);

            if (params[3] == 'profile.property') {
                setNestedProperty(user_data, params[4], params[5]);

                UpdateUserProfile(params[2], user_data);

                return message.reply(`Modified profile.property info of ${params[2]} to be "${params[4]}=${params[5]}" successfully.`);
            }

            if (params[3] == 'profile.array') {
                // ex params 4-6 = flags add 0
                const types: {[key: string]: 'number' | 'string' | 'boolean'} = {
                    'customization.unlocked': 'number',
                    'achievements': 'string',
                    'flags': 'number'
                }

                if (!types[params[4]]) throw new Error(`property ${params[4]} does not exist!`);

                switch(types[params[4]]) {
                    case 'number':
                        let value = parseInt(params[6]);
                        if (Number.isNaN(value)) throw new Error(`invalid value '${params[6]}' for type '${types[params[4]]}'`);
                        if (params[5] == 'add') {
                            if (params[4].includes('.')) user_data[params[4].split('.')[0]][params[4].split('.')[1]].push(value);
                            else user_data[params[4]].push(value);
                        } else if (params[5] == 'rem') {
                            if (params[4].includes('.')) user_data[params[4].split('.')[0]][params[4].split('.')[1]]
                                .splice(user_data[params[4].split('.')[0]][params[4].split('.')[1]].indexOf(value, 1));
                            else user_data[params[4]]
                                .splice(user_data[params[4]].indexOf(value, 1));
                        }
                        break;

                    case 'string':
                        if (params[5] == 'add') {
                            if (params[4].includes('.')) user_data[params[4].split('.')[0]][params[4].split('.')[1]].push(params[6]);
                            else user_data[params[4]].push(params[6]);
                        } else if (params[5] == 'rem') {
                            if (params[4].includes('.')) user_data[params[4].split('.')[0]][params[4].split('.')[1]]
                                .splice(user_data[params[4].split('.')[0]][params[4].split('.')[1]].indexOf(params[6], 1));
                            else user_data[params[4]]
                                .splice(user_data[params[4]].indexOf(params[6], 1));
                        }
                        break;

                    default:
                        break;
                }
            }

            writeFileSync(join(BASE_DIRNAME, 'profiles', params[2]+'.oka'), JSON.stringify(user_data), 'utf-8');

            return message.reply(`Modified profile.array info of ${params[2]} successfully.`);
        }

        // not daily or anything else
        throw new Error('invalid user db entry to modify. usage: "oka mod [Snowflake | them | me] [daily | profile] [property] [value]"');
    });

    // items
    RegisterShorthand('oka insert', async (message: Message, params: string[]) => {
        if (params.length < 4) throw new Error("not enough parameters. usage: oka insert [Snowflake | them | me] [itemID] [count?]");
        if (Number.isNaN(parseInt(params[2]))) throw new Error("invalid user ID in params[2]");
        if (Number.isNaN(parseInt(params[3]))) throw new Error('invalid item ID');
        if (params.length > 4 && Number.isNaN(parseInt(params[4]))) throw new Error("invalid number at params[4]");

        const user = client.users.cache.get(params[2]);

        if (params[4]) {
            for (let i = 0; i < parseInt(params[4]); i++) {
                AddOneToInventory(params[2], parseInt(params[3]));
            }
            return message.reply(`:inbox_tray: Inserted ${params[4]} **${ITEM_NAMES[parseInt(params[3])].name}**(s) into **${user?.displayName}**'s pockets`);
        } else AddOneToInventory(params[2], parseInt(params[3]));

        message.reply(`:inbox_tray: Inserted one **${ITEM_NAMES[parseInt(params[3])].name}** into **${user?.displayName}**'s pockets`);
    });

    // bans

    RegisterShorthand('oka rs ', async (message: Message, params: string[]) => {
         if (params.length < 5) throw new Error("not enough parameters. usage: oka rs [Snowflake | them] [expiry date] [reason]");
         if (Number.isNaN(parseInt(params[2]))) throw new Error("invalid user ID in params[2]");

         const user = client.users.cache.get(params[2]);

         // i could simplify this with "...params[]" probably but im lazy
         RestrictUser(message.client, params[2], params[3], params[4]);

         message.reply(`Enabled the restriction flag for **${user?.username || params[2]}**`);
    });

    RegisterShorthand('oka lift ', async (message: Message, params: string[]) => {
        if (Number.isNaN(parseInt(params[2]))) throw new Error("invalid user ID in params[2]");

        const profile = GetUserProfile(params[2]);
        if (!profile.restriction) throw new Error(`no restriction exists in profile data for user ${params[2]}`);
        profile.restriction.active = false;

        UpdateUserProfile(params[2], profile);

        const user = client.users.cache.get(params[2]);

        message.reply(`Disabled the restriction flag for **${user?.username || params[2]}**`);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Important Account Update')
            .setDescription('Any previous restriction on okash features were manually lifted just now.')

        message.client.users.cache.find((user) => user.id == params[2])!.send({embeds:[embed]});
    });

    // maintenance

    RegisterShorthand('oka toggle', async (message: Message, params: string[]) => {
        SetListening(!LISTENING);
        await message.reply({
            content:LISTENING?`Okaaaay, I'll start listening to commands now!`:`Okaaaay, I'll hold off on command handling for now.`
        });
    });

    RegisterShorthand('oka kill', async (message: Message, params: string[]) => {
        process.exit();
    });

    RegisterShorthand('oka update', async (message: Message, params: string[]) => {
        // check if anyone has an active casino pass
        const time = new Date().getTime()/1000;
        const passes: {[key: string]: number} = {};
        for (let entry of PassesActive.entries()) {
            if (entry[1] > time) passes[entry[0]] = entry[1];
        }
        for (let entry of BoostsActive.entries()) {
            if (!passes[entry[0]] && entry[1] > time) passes[entry[0]] = entry[1];
        }

        if (Object.keys(passes).length != 0) {
            await message.react('⚠️');

            let msg = ':warning: There are casino passes/drop boosts active! If you restart, the passes will be deleted!\n';
            Object.keys(passes).forEach(key => {
                msg += `**${key}** - Expires <t:${passes[key]}:R>\n`
            });
            msg += '\nYou can forcibly update with `oka update force`.'

            await message.reply(msg);
            if (!message.content.includes('force')) throw new Error('WARN'); // prevents the ':x:' reaction
        }

        SelfUpdate(message);
    });

    RegisterShorthand('oka rollback ', async (message: Message, params: string[]) => {
        SelfUpdate(message, params[2]);
    });

    RegisterShorthand('oka release ', async (message: Message, params: string[]) => {
        // for fixing the weird issue where roulette just doesn't release the user from the active games.
        if (Number.isNaN(parseInt(params[2]))) throw new Error("invalid user ID in params[2]");

        ReleaseUserGame(params[2]);
        ManualRelease(params[2]);
    });

    // debugging
    RegisterShorthand('oka induce rejection crash', async () => {
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                reject('!debug rejection');
            }, 500);
        });
    });

    // dmdata management
    RegisterShorthand('oka dmdata connect', async (message: Message) => {
        message.channel.send({
            content: `attempting...`
        });
        open_socket(SOCKET, message.channel);
    });

    RegisterShorthand('oka dmdata disconnect', async (message: Message) => {
        message.channel.send({
            content: `terminating. okabot will try and reconnect automatically.`
        });
        SOCKET.CloseSocket();
    });
}

export async function CheckForShorthand(message: Message) {
    if (!message.content.startsWith('oka ')) return;
    if (!CONFIG.permitted_to_use_shorthands.includes(message.author.id) && message.author.id != CONFIG.bot_master) {
        await message.reply({
            content:'https://bot.lilycatgirl.dev/gif/nibuthrow.gif'
        });
        GrantAchievement(message.author, Achievements.SHORTHAND_NO, message.channel as TextChannel);
        return;
    }

    const regex = /"([^"]+)"|(\S+)/g;
    const params = [...message.content.matchAll(regex)].map(match => match[1] || match[2]);

    // if you can use shorthands but aren't the bot master, you aren't permitted to use them on yourself or the bot master
    if (CONFIG.permitted_to_use_shorthands.includes(message.author.id) && message.author.id != CONFIG.bot_master) {
        if (params[2] == 'me' || params[2] == CONFIG.bot_master) return message.reply('https://bot.lilycatgirl.dev/gif/yuutahit.gif');
        if (params[2] == 'them' &&
            message.reference &&
            (message.channel as TextChannel).messages.cache.find(msg => msg.id == message.reference?.messageId)?.author.id == CONFIG.bot_master ||
            (message.channel as TextChannel).messages.cache.find(msg => msg.id == message.reference?.messageId)?.author.id == message.author.id
        ) return message.reply('https://bot.lilycatgirl.dev/gif/yuutahit.gif');
    }

    if (params[2] == 'me') params[2] = message.author.id;
    if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;

    for (const key of Object.keys(Shorthands)) {
        try {
            if (message.content.startsWith(key)) {
                await Shorthands[key](message, params);
                await message.react('✅');
            }
        } catch (e) {
            // if ((e as string).includes('WARN')) return;
            await message.react('❌');

            if ((e as string).startsWith && (e as string).startsWith('!')) throw new Error(e as string);

            return await message.reply(`There was an error processing your shorthand. See here:\n\`${e}\`\n-# admin shorthands v2`);
        }
    }
}

// --