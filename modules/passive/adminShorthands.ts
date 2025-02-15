import {Client, Message, TextChannel} from "discord.js";
import {Logger} from "okayulogger";


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
    L.info(`registered shorthand '${key}'`);
}

// --

export function RegisterAllShorthands() {
    // okash management
    RegisterShorthand('oka dep ', (message: Message, params: string[]) => {
        message.reply('hello world new dep command')
    });
}

export async function CheckForShorthand(message: Message) {
    const regex = /"([^"]+)"|(\S+)/g;
    const params = [...message.content.matchAll(regex)].map(match => match[1] || match[2]);
    if (params[2] == 'me') params[2] = message.author.id;
    if (params[2] == 'them') params[2] = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!.author.id;

    for (const key of Object.keys(Shorthands)) {
        try {
            if (message.content.startsWith(key)) Shorthands[key](message, params);
        } catch (e) {
            message.react('❌');
            await message.reply(`There was an error processing your shorthand. See here:\n${e}\n-# admin shorthands v2`);
        }
    }
}

// --