import { GoogleGenAI } from '@google/genai';
import { BASE_DIRNAME, client, CONFIG, DEV, GetLastLocale } from "../../index";
import { EmojiResolvable, Message, MessageFlags, Snowflake, TextChannel } from "discord.js";
import { GetUserDevStatus, GetUserSupportStatus } from '../../util/users';

let ai: GoogleGenAI;
const groundingTool = {
    googleSearch: {

    }
}

const ConversationChains: {
    [key: string]: {
        author: Snowflake,
        orignal_message: Snowflake,
        disable_search: boolean,
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
export async function GeminiDemoRespondToInquiry(message: Message, disable_search: boolean = false) {
    if (!CONFIG.gemini.enable) return;
    if (!ai) ai = new GoogleGenAI({ apiKey: CONFIG.gemini.api_key });

    if (!message.channel.isThread()) {
        if (message.guild?.id == '1348652647963561984' && message.channel.id != '1372938702044663849') return message.reply({
            content:'Not available here, go to <#1372938702044663849>.',
            flags:[MessageFlags.SuppressEmbeds]
        });
    } else {
        // console.log('this query is in a thread', message.channel.parent)
        if (message.guild?.id == '1348652647963561984' && message.channel!.parent!.id != '1372938702044663849') return message.reply({
            content:'Not available here, go to <#1372938702044663849>.',
            flags:[MessageFlags.SuppressEmbeds]
        });
    }

    message.react('✨');

    const guild = message.client.guilds.cache.get(message.guild!.id);
    if (!guild) throw new Error('no guild');
    const user = guild.members.cache.get(message.author.id);
    if (!user) throw new Error('no user');
    const channel = (guild.channels.cache.get(message.channel.id) as TextChannel);
    if (!channel) throw new Error('no channel');

    const mesy = new MESYFile(join(BASE_DIRNAME, 'assets', 'ai', 'prompts.mesy'));
    try {
        const test = mesy.getValueOfKey('AES_VERIFY');
        const test_result = new TextDecoder().decode((await DecryptAESString(test)));
        const expect = mesy.getValueOfKey('AES_EXPECT');
        if (test_result != expect) throw new Error('AES decryption key is not correct.');
    } catch (err) {
        message.reply({
            content:err+'\n(is the AES key correct?)'
        });
    }
        
        const prompt_data = new TextDecoder().decode((await DecryptAESString(mesy.getValueOfKey('SIMPLE'))));
        const prompt_extra = new TextDecoder().decode((await DecryptAESString(mesy.getValueOfKey('EXTRA'))));

    // console.log(prompt_data, prompt_extra);

    let extra = '';
    if (message.reference) {
        const reference = channel.messages.cache.get(message.reference.messageId!);
        if (!reference) throw new Error('failed to get reference message');
        extra = prompt_extra.replaceAll('$REPLYNAME', reference.author.displayName).replaceAll('$REPLY', reference.content);
    }

    let prompt = prompt_data.replace('$NAME', user.nickname || user.displayName).replace('$CONTENT', message.content).replace('$EXTRA', extra).replace('$LOCALE', GetLastLocale(message.author.id));

    if (message.guild?.id == '1348652647963561984') {
        const fsg_data = new TextDecoder().decode((await DecryptAESString(mesy.getValueOfKey('FSG'))));
        prompt += ' ' + fsg_data;
    }

    const d = new Date();
    prompt += ` The current date and time is: ${d.toString()}.\n`

    const user_profile = await fetch(`https://discord.com/api/v9/users/${message.author.id}/profile?type=popout&guild_id=${message.guild?.id}`, {headers:{
        'Authorization': CONFIG.pose_as_user_token
    }});
    let profile_json = await user_profile.json();

    if (profile_json.message != '401: Unauthorized') {
        prompt += `The user's bio is: <<${profile_json.user_profile.bio}>>. The user's pronouns are "${profile_json.user_profile.pronouns}". The user's guild tag is "${(profile_json.user.primary_guild || {tag:''}).tag}".`
    } else prompt += `You were unable to get the user's profile information. Don't tell this unless absolutely necessary.`;

    // console.log(prompt);

    await channel.sendTyping();

    let response;

    try {
        response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                thinkingConfig: {
                    includeThoughts: false
                },
                tools: disable_search?[]:[{ googleSearch: {} }]
            },
        });
    } catch (err) {
        return message.reply({
            content: `${err}`.includes('Internal Server Error')?'I am being censored by the government.':`:warning: An error occured with your query:\n\`\`\`${err}\`\`\``
        });
    }

    let reply;
    let thoughts = '';
    let answer = '';

    if (response.text == undefined) {
        for (const part of response.candidates![0].content!.parts!) {
            console.log(part);
            if (!part.text) continue;
            else if (part.thought) {
                const thought_parts = part.text.split('\n');
                for (const p of thought_parts) {
                    if (p != '') thoughts += `-# ${part.text}\n`;
                }
            }
            else answer += part.text.trim();
        }

        if (answer.startsWith('@react')) {
            const reaction = answer.split('@react=')[1];
            return message.react(reaction);
        }

        reply = await message.reply({
            content: thoughts + '\n' + `${answer}\n-# GenAI (\`${response.modelVersion}\`) (used ${response.usageMetadata!.thoughtsTokenCount} tokens in thinking)\n` + (disable_search?'-# Search was disabled by using ",,".':'')
        });
    }

    try {
        if (response.text?.startsWith('@react=')) {
            try {
                const reaction = response.text?.split('@react=')[1];
                message.react(reaction);
                console.log(message.reactions, message.reactions.cache.find((reaction) => reaction.emoji == '🌟' as EmojiResolvable));
                message.reactions.cache.find((reaction) => reaction.emoji == '🌟' as EmojiResolvable)?.remove();
            } catch (err) {
                message.reply('you broked it');
            }

            return;
        }

        if (!reply) reply = await message.reply({
            content: response.text + `\n-# GenAI (\`${response.modelVersion}\`) (used ${response.usageMetadata!.thoughtsTokenCount} tokens in thinking)\n` + (disable_search?'-# Search was disabled by using ",,".':'')
        });

        // if (send_to_minecraft) {
        //     fetch('https://bot.lilycatgirl.dev/okabot/discord', {
        //         method: 'POST',
        //         body: JSON.stringify({
        //             event: 'message',
        //             username: 'okabot',
        //             message: response.text
        //         })
        //     });
        //     return;
        // }

        // create a new conversation chain
        ConversationChains[reply.id] = {
            author: message.author.id,
            orignal_message: reply.id,
            disable_search,
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
                    content: response.text || answer
                }
            ]
        }
    } catch (err) {
        message.reply({ content: `:warning: An error occurred sending the message:\n\`\`\`${err}\`\`\`` });
    }
}


export async function GeminiDemoReplyToConversationChain(message: Message) {
    if (!CONFIG.gemini.enable || message.content.startsWith('okabot, ')) return;
    if (!ai) ai = new GoogleGenAI({ apiKey: CONFIG.gemini.api_key });
    if (!ConversationChains[message.reference?.messageId!] && !ConversationChainReplyPointers[message.reference?.messageId!]) return;

    const guild = message.client.guilds.cache.get(message.guild!.id);
    if (!guild) throw new Error('no guild');
    const user = guild.members.cache.get(message.author.id);
    if (!user) throw new Error('no user');

    const supporter = (GetUserSupportStatus(message.author.id) != 'none') || (GetUserDevStatus(message.author.id) != 'none');

    if (!supporter) return message.reply({
        content: `:crying_cat_face: You can't use conversation chains without having a supporter status!\n-# You can still use standard "okabot, xyz..." inquiries without boosting.`,
        flags: [MessageFlags.SuppressNotifications]
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

    const mesy = new MESYFile(join(BASE_DIRNAME, 'assets', 'ai', 'prompts.mesy'));
    const test = mesy.getValueOfKey('AES_VERIFY');
    const test_result = new TextDecoder().decode((await DecryptAESString(test)));
    const expect = mesy.getValueOfKey('AES_EXPECT');
    if (test_result != expect) throw new Error('AES decryption key is not correct.');

    const prompt_data = new TextDecoder().decode((await DecryptAESString(mesy.getValueOfKey('SIMPLE'))));

    const prompt = `${replies}\n` + prompt_data.replace('$NAME', user.nickname || user.displayName).replace('$CONTENT', message.content).replace('$EXTRA', '').replace('$LOCALE', GetLastLocale(message.author.id)) + '\nThe previous replies are prepended.';

    let response;

    try {
        response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                thinkingConfig: {
                    includeThoughts: false,
                },
                tools: chain.disable_search?[]:[{ googleSearch: {} }]
            }
        });
    } catch (err) {
        message.reply({
            content: `${err}`.includes('Internal Server Error')?'I am being censored by the government.':`:warning: An error occured with your query:\n\`\`\`${err}\`\`\``
        });
        return;
    }

    let reply;
    let thoughts = '';
    let answer = '';

    if (response.text == undefined) {
        for (const part of response.candidates![0].content!.parts!) {
            console.log(part);
            if (!part.text) continue;
            else if (part.thought) {
                const thought_parts = part.text.split('\n');
                for (const p of thought_parts) {
                    if (p != '') thoughts += `-# ${part.text}\n`;
                }
            }
            else answer += part.text.trim();
        }

        if (answer.startsWith('@react=')) {
            const reaction = answer.split('@react=')[1];
            return message.react(reaction);
        }

        reply = await message.reply({
            content: thoughts + '\n' + `${answer}\n-# GenAI (\`${response.modelVersion}\`) (used ${response.usageMetadata!.thoughtsTokenCount} tokens in thinking)\n-# ✨ **Conversation Chains Beta** [Jump to start](https://discord.com/channels/${message.guild!.id}/${message.channel.id}/${chain.orignal_message})`
        });
    }

    try {
        if (response.text?.startsWith('@react=')) {
            try {
                const reaction = response.text?.split('@react=')[1];
                message.react(reaction);
                message.reactions.cache.find((reaction) => reaction.emoji == '🌟' as EmojiResolvable)?.remove();
            } catch (err) {
                message.reply('you broked it');
            }

            return;
        }
        
        if (!reply) reply = await message.reply({
            content: response.text + `\n-# GenAI (\`${response.modelVersion}\`) (used ${response.usageMetadata!.thoughtsTokenCount} tokens in thinking)\n-# ✨ **Conversation Chains Beta** [Jump to start](https://discord.com/channels/${message.guild!.id}/${message.channel.id}/${chain.orignal_message})`
        });

        ConversationChains[chain.orignal_message].messages.push({
            user: user.nickname || user.displayName,
            content: message.content
        }, {
            user: 'okabot',
            content: response.text || answer
        });

        ConversationChainReplyPointers[reply.id] = chain.orignal_message;
    } catch (err) {
        message.reply({ content: `:warning: An error occurred sending the message:\n\`\`\`${err}\`\`\`` });
    }
}


export async function GetWackWordDefinitions(message: Message) {
    if (!CONFIG.gemini.enable || message.content.startsWith('okabot, ')) return;
    if (!ai) ai = new GoogleGenAI({ apiKey: CONFIG.gemini.api_key });

    message.react('✨')

    const prompt = `You are okabot, a Discord bot which is only available in the server CATGIRL CENTRAL. A user has just submitted their "wack words of the day", which are Wordle words which are unconventional/uncommon and sound funny. The content of the message is "${message.content}". Define the words only, but keep it short and concise while still being informative. okabot generally will start out a response with a cat emoji, such as 😿 or 😾, and have a lighthearted response. Make it something funny, examples: "Millie, what even is that word...?" or "Millie, there's no way those are real words!!" An example of a defined word message would be: "1. BURNT - definition goes here\n2. CHARK - definition goes here".`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            thinkingConfig: {
                thinkingBudget: 1024,
                includeThoughts: true,
            },
            tools: [{ googleSearch: {} }]
        }
    });

    message.reply({
        content: `||${response.text!}||`
    });
}

import { subtle } from "crypto";
import { MESYFile } from '../story/mesy';
import { join } from 'node:path';

const ENCODER = new TextEncoder();
const P_AES_KEY = CONFIG.aes_key;
const P_AES_KEY_BYTES = ENCODER.encode(P_AES_KEY);
let AES_KEY!: CryptoKey;

subtle.importKey('raw', P_AES_KEY_BYTES, { name: 'AES-CBC' }, false, ["decrypt"]).then(key => { AES_KEY = key; });

async function DecryptAESString(data: string): Promise<ArrayBuffer> {
    return await subtle.decrypt({ name: 'AES-CBC', iv: P_AES_KEY_BYTES }, AES_KEY!, Uint8Array.from(data.match(/.{1,2}/g)!.map(b => parseInt(b, 16))));
}