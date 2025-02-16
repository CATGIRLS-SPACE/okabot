import {Client, EmbedBuilder, Message, TextChannel} from "discord.js";
import {Logger} from "okayulogger";
import {BOT_MASTER, CAN_USE_SHORTHANDS, LISTENING, SetListening} from "../../index";
import {Achievements, GrantAchievement} from "./achievement";
import {AddToWallet, GetAllWallets, GetWallet, RemoveFromWallet} from "../okash/wallet";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {GetUserProfile, RestrictUser, UpdateUserProfile} from "../user/prefs";
import {SelfUpdate} from "../../util/updater";
import {ReleaseUserGame} from "../okash/games/roulette";


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

        await message.reply({
            content: `**${params[2]}**'s wallet is now ${GetEmoji(EMOJI.OKASH)} OKA**${GetWallet(params[2])}**.`
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

        await message.reply({
            content: `**${params[2]}**'s wallet is now ${GetEmoji(EMOJI.OKASH)} OKA**${GetWallet(params[2])}**.`
        });
    });

    // bans

    RegisterShorthand('oka restrict ', async (message: Message, params: string[]) => {
         if (params.length < 6) throw new Error("not enough parameters. usage: oka restrict [Snowflake | them] [expiry date] [abilities] [reason]");
         if (Number.isNaN(parseInt(params[2]))) throw new Error("invalid user ID in params[2]");

         // i could simplify this with "...params[]" probably but im lazy
         RestrictUser(message.client, params[2], params[3], params[4], params[5]);
    });

    RegisterShorthand('oka lift ', async (message: Message, params: string[]) => {
        if (Number.isNaN(parseInt(params[2]))) throw new Error("invalid user ID in params[2]");

        const profile = GetUserProfile(params[2]);
        if (!profile.okash_restriction) throw new Error(`no restriction exists in profile data for user ${params[2]}`);
        profile.okash_restriction.is_restricted = false;

        UpdateUserProfile(params[2], profile);

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

    RegisterShorthand('oka update', async (message: Message, params: string[]) => {
        SelfUpdate(message);
    });

    RegisterShorthand('oka rollback ', async (message: Message, params: string[]) => {
        SelfUpdate(message, params[2]);
    });

    RegisterShorthand('oka release ', async (message: Message, params: string[]) => {
        // for fixing the weird issue where roulette just doesn't release the user from the active games.
        if (Number.isNaN(parseInt(params[2]))) throw new Error("invalid user ID in params[2]");

        ReleaseUserGame(params[2]);
    });
}

export async function CheckForShorthand(message: Message) {
    if (!message.content.startsWith('oka ')) return;
    if (!CAN_USE_SHORTHANDS.includes(message.author.id) && message.author.id != BOT_MASTER) {
        await message.reply({
            content:'https://bot.lilycatgirl.dev/gif/nibuthrow.gif'
        });
        GrantAchievement(message.author, Achievements.SHORTHAND_NO, message.channel as TextChannel);
        return;
    }

    const regex = /"([^"]+)"|(\S+)/g;
    const params = [...message.content.matchAll(regex)].map(match => match[1] || match[2]);

    // if you can use shorthands but aren't the bot master, you aren't permitted to use them on yourself or the bot master
    if (CAN_USE_SHORTHANDS.includes(message.author.id) && message.author.id != BOT_MASTER) {
        if (params[2] == 'me' || params[2] == BOT_MASTER) return message.reply('https://bot.lilycatgirl.dev/gif/yuutahit.gif');
        if (params[2] == 'them' &&
            message.reference &&
            (message.channel as TextChannel).messages.cache.find(msg => msg.id == message.reference?.messageId)?.author.id == BOT_MASTER ||
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
            await message.react('❌');
            return await message.reply(`There was an error processing your shorthand. See here:\n\`${e}\`\n-# admin shorthands v2`);
        }
    }
}

// --