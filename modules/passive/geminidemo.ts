import {GoogleGenAI} from '@google/genai';
import {CONFIG, DEV, GetLastLocale} from "../../index";
import {Message, Snowflake, TextChannel} from "discord.js";
import * as repl from "node:repl";

let ai: GoogleGenAI;

const ConversationChains: {
    [key: string]: {
        author: Snowflake,
        orignal_message: Snowflake,
        messages: Array<{
            user: 'okabot' | 'system' | string,
            content: string,
        }>
    }
} = {};

// makes it so that we can reply to a reply and be sent back to the correct chain
const ConversationChainReplyPointers: {
    [key: string]: Snowflake
} = {};

/**
 * Respond to an "okabot, xyz..." message
 * @param message The message object passed by discord.js
 * @param send_to_minecraft Send the response to Minecraft?
 */
export async function GeminiDemoRespondToInquiry(message: Message, send_to_minecraft: boolean = false) {
    if (!CONFIG.gemini.enable) return;
    if (!ai) ai = new GoogleGenAI({apiKey: CONFIG.gemini.api_key});

    message.react('✨');

    const guild = message.client.guilds.cache.get(message.guild!.id);
    if (!guild) throw new Error('no guild');
    const user = guild.members.cache.get(message.author.id);
    if (!user) throw new Error('no user');
    const channel = (guild.channels.cache.get(message.channel.id) as TextChannel);
    if (!channel) throw new Error('no channel');

    let extra = '';
    if (message.reference) {
        const reference = channel.messages.cache.get(message.reference.messageId!);
        if (!reference) throw new Error('failed to get reference message');
        extra = `The user has also replied to a message by user "${reference.author.displayName}", which has the content "${reference.content}", so you should use that as context additionally.`
    }

    const prompt = `You are okabot, a Discord bot which is only available in the server CATGIRL CENTRAL. A user named "${user.nickname || user.displayName}" has just invoked your response shorthand, being "okabot, xyz" where "xyz" is the query. The content of the message is "${message.content}". ${extra} Respond to the question only. You can be playful, but keep it short and concise while still being informative. okabot generally will start out a response with a cat emoji, such as 😿 or 😾, and have a lighthearted response. Also, the user's locale is "${GetLastLocale(message.author.id)}", so you should respond in that language if possible.`;

    await channel.sendTyping();

    const response = await ai.models.generateContent({
        model:'gemini-2.5-pro-preview-05-06',
        contents: prompt,
        config: {
            thinkingConfig: {
                thinkingBudget: 1024,
                includeThoughts: true
            }
        }
    });

    const reply = await message.reply({
        content: response.text + `\n-# GenAI (\`${response.modelVersion}\`) (used ${response.usageMetadata!.thoughtsTokenCount} tokens in thinking)\n-# Incorrect language? Run any okabot command to update your active locale!`
    });

    if (send_to_minecraft) {
        fetch('https://bot.lilycatgirl.dev/okabot/discord', {
            method: 'POST',
            body: JSON.stringify({
                event: 'message',
                username: 'okabot',
                message: response.text
            })
        });
        return;
    }

    // create a new conversation chain
    ConversationChains[reply.id] = {
        author: message.author.id,
        orignal_message: reply.id,
        messages: [
            {
                user: reply.author.displayName,
                content: reply.content,
            },
            {
                user: user.nickname || user.displayName,
                content: message.content,
            },
            {
                user: 'okabot',
                content: response.text!
            }
        ]
    }
}


export async function GeminiDemoReplyToConversationChain(message: Message) {
    if (!CONFIG.gemini.enable || message.content.startsWith('okabot, ')) return;
    if (!ai) ai = new GoogleGenAI({apiKey: CONFIG.gemini.api_key});
    if (!ConversationChains[message.reference?.messageId!] && !ConversationChainReplyPointers[message.reference?.messageId!]) return;

    const guild = message.client.guilds.cache.get(message.guild!.id);
    if (!guild) throw new Error('no guild');
    const user = guild.members.cache.get(message.author.id);
    if (!user) throw new Error('no user');

    const booster_role = !DEV?guild.roles.premiumSubscriberRole:guild.roles.cache.find(role => role.name == 'fake booster role');
    const user_is_booster = booster_role?guild.members.cache.get(message.author.id)!.roles.cache.some(role => role.id === booster_role.id):false;

    if (!user_is_booster) return message.reply({
        content: `:crying_cat_face: Please server boost CATGIRL CENTRAL to gain access to conversation chains.\n-# You can still use standard "okabot, xyz..." inquiries without boosting.`
    });

    message.react('✨');

    const channel = message.client.channels.cache.get(message.channel.id) as TextChannel;

    await channel.sendTyping();

    const chain = ConversationChains[message.reference!.messageId!] || ConversationChains[ConversationChainReplyPointers[message.reference!.messageId!]];
    if (!chain) throw new Error(`conversation chain "${message.reference!.messageId!}" not found`);

    let replies: string = '';
    chain.messages.forEach(message => {
        replies = replies + `${message.user}: ${message.content}\n`;
    });

    const prompt = `${replies}\nYou are okabot, a Discord bot which is only available in the server CATGIRL CENTRAL. A user named "${user.nickname || user.displayName}" has just invoked your response in a chain of replies. The content of the message is "${message.content}". Respond to the question only. You can be playful, but keep it short and concise while still being informative. okabot generally will start out a response with a cat emoji, such as 😿 or 😾, and have a lighthearted response. Also, the user's locale is "${GetLastLocale(message.author.id)}", so you should respond in that language if possible. The current chain of replies is listed above.`;

    const response = await ai.models.generateContent({
        model:'gemini-2.5-pro-preview-03-25',
        contents: prompt,
        config: {
            thinkingConfig: {
                thinkingBudget: 1024,
                includeThoughts: true,
            }
        }
    });

    const reply = await message.reply({
        content: response.text + `\n-# GenAI (\`${response.modelVersion}\`) (used ${response.usageMetadata!.thoughtsTokenCount} tokens in thinking)\n-# ✨ **Conversation Chains Beta** [Jump to start](https://discord.com/channels/${message.guild!.id}/${message.channel.id}/${chain.orignal_message})`
    });

    ConversationChains[chain.orignal_message].messages.push({
        user: user.nickname || user.displayName,
        content: message.content
    }, {
        user: 'okabot',
        content: response.text!
    });

    ConversationChainReplyPointers[reply.id] = chain.orignal_message;
}


export async function GetWackWordDefinitions(message: Message) {
    if (!CONFIG.gemini.enable || message.content.startsWith('okabot, ')) return;
    if (!ai) ai = new GoogleGenAI({apiKey: CONFIG.gemini.api_key});

    message.react('✨')

    const prompt = `You are okabot, a Discord bot which is only available in the server CATGIRL CENTRAL. A user has just submitted their "wack words of the day", which are Wordle words which are unconventional/uncommon and sound funny. The content of the message is "${message.content}". Define the words only, but keep it short and concise while still being informative. okabot generally will start out a response with a cat emoji, such as 😿 or 😾, and have a lighthearted response. Make it something funny, examples: "Millie, what even is that word...?" or "Millie, there's no way those are real words!!" An example of a defined word message would be: "1. BURNT - definition goes here\n2. CHARK - definition goes here".`;

    const response = await ai.models.generateContent({
        model:'gemini-2.5-pro-preview-03-25',
        contents: prompt,
        config: {
            thinkingConfig: {
                thinkingBudget: 1024,
                includeThoughts: true,
            }
        }
    });

    message.reply({
        content: `||${response.text!}||`
    });
}