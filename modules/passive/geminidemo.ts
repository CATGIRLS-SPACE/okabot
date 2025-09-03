import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import { BASE_DIRNAME, client, CONFIG, DEV, GetLastLocale } from "../../index";
import { AttachmentBuilder, EmojiResolvable, GuildMember, Message, MessageFlags, Poll, PollAnswer, PollAnswerData, Snowflake, TextChannel } from "discord.js";
import { GetUserDevStatus, GetUserSupportStatus } from '../../util/users';

let ai: GoogleGenAI;
let openai: OpenAI;

const GlobalMemories: string[] = [];
const UserMemories: {[key: Snowflake]: Array<string>} = {};

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
 * @param disable_search Disable the search grounding tool?
 */
export async function GeminiDemoRespondToInquiry(message: Message, disable_search: boolean = false) {
    if (!CONFIG.gemini.enable) return;
    if (!ai) ai = new GoogleGenAI({ apiKey: CONFIG.gemini.api_key });
    if (!openai) openai = new OpenAI({apiKey:CONFIG.OPENAI_API_KEY});

    if (message.channel.isDMBased() && (GetUserSupportStatus(message.author.id) == 'none' && GetUserDevStatus(message.author.id) == 'none')) return;
    
    if (message.channel.isDMBased() && !DEV) {
        (await client.channels.fetch('1411838083921608806') as TextChannel).send(`**-> ${message.author.id}(${message.author.username})** : ${message.content}`);
    }

    if (message.channel.isDMBased() && ConversationChains[message.channel.id]) return GeminiDemoReplyToConversationChain(message);

    if (!message.channel.isThread()) {
        if (message.guild?.id == '1348652647963561984' && message.channel.id != '1407602200586485800') return message.reply({
            content:'Not available here, go to <#1407602200586485800>.',
            flags:[MessageFlags.SuppressEmbeds]
        });
    } else {
        // console.log('this query is in a thread', message.channel.parent)
        if (message.guild?.id == '1348652647963561984' && message.channel!.parent!.id != '1407602200586485800') return message.reply({
            content:'Not available here, go to <#1407602200586485800>.',
            flags:[MessageFlags.SuppressEmbeds]
        });
    }

    let inline_data = [];
    let has_images = false;

    for (const attachment of message.attachments.values()) {
        if (attachment.contentType?.startsWith('image/')) {
            has_images = true;
            console.log(attachment);
            const response = await fetch(attachment.url);
            const imageArrayBuffer = await response.arrayBuffer();
            const b64 = Buffer.from(imageArrayBuffer).toString('base64');
            inline_data.push({
                mimeType: attachment.contentType,
                data: b64,
            });
        }
    }

    message.react('✨');

    let user, channel;

    if (!message.channel.isDMBased()) {
        const guild = message.client.guilds.cache.get(message.guild!.id);
        if (!guild) throw new Error('no guild');
        user = guild.members.cache.get(message.author.id);
        if (!user) throw new Error('no user');
        channel = (guild.channels.cache.get(message.channel.id) as TextChannel);
        if (!channel) throw new Error('no channel');
    } else {
        user = client.users.cache.get(message.author.id);
        if (!user) throw new Error('no user');
        channel = client.channels.cache.get(message.channel.id) as TextChannel;
        if (!channel) throw new Error('no channel, how did we get here?');
    } 

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

    const super_instruction = new TextDecoder().decode((await DecryptAESString(mesy.getValueOfKey('TOOLS'))));
        
    const prompt_data = super_instruction + new TextDecoder().decode((await DecryptAESString(mesy.getValueOfKey('SIMPLE'))));
    const prompt_extra = new TextDecoder().decode((await DecryptAESString(mesy.getValueOfKey('EXTRA'))));

    let extra = '';
    if (message.reference) {
        const reference = channel.messages.cache.get(message.reference.messageId!);
        if (!reference) throw new Error('failed to get reference message');
        extra = prompt_extra.replaceAll('$REPLYNAME', reference.author.displayName).replaceAll('$REPLY', reference.content);
    }

    const has_custom_emojis = (/<a?:[a-zA-Z0-9_]+:\d+>/g).test(message.content);
    let prompt = prompt_data.replace('$NAME', (user as GuildMember).nickname || user.displayName).replace('$CONTENT', message.content.replace(/<a?:[a-zA-Z0-9_]+:\d+>/g, "")).replace('$EXTRA', extra).replace('$LOCALE', GetLastLocale(message.author.id));

    if (message.guild?.id == '1348652647963561984' || message.guild?.id == '748284249487966282') {
        const fsg_data = new TextDecoder().decode((await DecryptAESString(mesy.getValueOfKey('FSG'))));
        prompt += ' ' + fsg_data;
    }

    prompt += ` The current date and time is: ${new Date().toString()}.\n`
    prompt += 'Current Global Memories: [\n-' + GlobalMemories.join('\n- ') + '\n]\n';
    prompt += 'Current Memories on User: [\n-' + (UserMemories[message.author.id] || []).join('\n- ') + '\n]';

    await channel.sendTyping();

    let response;

    let contents: any[] = [ {text:prompt} ];
    if (has_images) {
        inline_data.forEach(item => {
            contents.push({
                inlineData: {
                    mimeType: item.mimeType,
                    data: item.data
                }
            });
        });
    }

    // response = await ai.models.generateContent({
    //     model: 'gemini-2.5-pro',
    //     contents,
    //     config: {
    //         thinkingConfig: {
    //             includeThoughts: false,
    //         },
    //         tools: disable_search?[]:[{ googleSearch: {} }],
    //         temperature: 1.0
    //     },
    // }).catch(err => {
    //     message.reply({
    //         content: `:warning: An error occured with your query:\n\`\`\`${err}\`\`\``
    //     });
    //     return null;
    // });

    response = await openai.chat.completions.create({
        messages: [{role:'user',content:prompt}],
        model: 'gpt-5-chat-latest' 
    });

    if (!response) return;

    // if (response.text == undefined) {
    //     console.log(response);
    //     if (response.promptFeedback?.blockReason) {
    //         await message.react('❌')
    //         return message.reply({
    //             content:`:x: Prompt was blocked with reason "${response.promptFeedback.blockReason}" (${response.promptFeedback.blockReasonMessage})`
    //         });
    //     }
    //     return message.reply({
    //         content:`:x: No response was received from Google. Try again?`
    //     });;
    // }

    if (message.channel.isDMBased() && !DEV) {
        (await client.channels.fetch('1411838083921608806') as TextChannel).send(`**<- ${message.author.id}(${message.author.username})** : ${response.choices[0].message.content}`);
    }

    try {
        const response_data: {tool:string,reply:string} = JSON.parse(response.choices[0].message.content as string);
        response_data.reply = response_data.reply.replaceAll('<@', '').replaceAll('@everyone', '').replaceAll('@here', '').replaceAll('<@&', '');

        if (response_data.tool.startsWith('save2mem')) {
            if (GlobalMemories.length == 25) GlobalMemories.pop();
            GlobalMemories.push(response_data.tool.split('save2mem:')[1]);
        }
        if (response_data.tool.startsWith('save2user')) {
            if (!UserMemories[message.author.id]) UserMemories[message.author.id] = [];
            UserMemories[message.author.id].push(response_data.tool.split('save2user:')[1]);
        }
        if (response_data.tool.startsWith('react:')) {
            const reaction = response_data.tool.split('react:')[1];
            const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
            const emojis = Array.from(segmenter.segment(reaction), s => s.segment);
            let index = 0;
            for (const e of emojis) {
                index++;
                if (index >= 6) break;
                try {
                    message.react(e);
                } catch (err) {
                    console.warn(err);
                }
            }
        }
        if (response_data.tool.startsWith('pinthis')) {
            message.pin();
        }
        if (response_data.tool.startsWith('poll:')) {
            channel.send({
                poll:{
                    question:{text:"okabot's poll"},
                    allowMultiselect: false,
                    answers: (response_data.tool.split('poll:')[1].split(',') || ['a','b']).map(val => ({text:val} as PollAnswerData)),
                    duration: 1
                }
            })
        }

        const reply = await message.reply({
            content: response_data.reply + `\n-# GenAI+Tools (\`${response.model}\`) (Toolstring: "${response_data.tool}")${has_custom_emojis?'\n-# Custom emojis were stripped from your message in order to prevent bugs.':''}\n` + (disable_search?'-# Search was disabled by using ",,".':'')
        });

        // create a new conversation chain
        ConversationChains[message.channel.isDMBased() ? message.channel.id : reply.id] = {
            author: message.author.id,
            orignal_message: message.channel.isDMBased() ? message.channel.id : reply.id,
            disable_search,
            messages: [
                {
                    user: reply.author.displayName,
                    content: reply.content,
                },
                {
                    user: (user as GuildMember).nickname || user.displayName,
                    content: message.content,
                },
                {
                    user: 'okabot',
                    content: response_data.reply
                }
            ]
        }
    } catch (err) {
        message.reply({ content: `:warning: An error occurred sending the message:\n\`\`\`${err}\`\`\`\nRaw: \`${response.choices[0].message.content}\`` });
    }
}


export async function GeminiDemoReplyToConversationChain(message: Message) {
    if (!CONFIG.gemini.enable || message.content.startsWith('okabot, ')) return;
    if (!ai) ai = new GoogleGenAI({ apiKey: CONFIG.gemini.api_key });
    if (!ConversationChains[message.channel.isDMBased()?message.channel.id : message.reference?.messageId!] && !ConversationChainReplyPointers[message.reference?.messageId!]) return message.react('❓');

    let user;

    if (!message.channel.isDMBased()) {
        const guild = message.client.guilds.cache.get(message.guild!.id);
        if (!guild) throw new Error('no guild');
        user = guild.members.cache.get(message.author.id);
        if (!user) throw new Error('no user');
    } else {
        user = client.users.cache.get(message.author.id);
        if (!user) throw new Error('no user');
    } 

    const supporter = (GetUserSupportStatus(message.author.id) != 'none') || (GetUserDevStatus(message.author.id) != 'none');
    // const supporter = false;

    if (!supporter) return message.reply({
        content: `:crying_cat_face: Umm, **${message.author.displayName}**... sorry, but you can't use conversation chains without [supporting](https://ko-fi.com/okawaffles)...\nI hear my server costs and AI credits aren't cheap... meow...`,
        flags: [MessageFlags.SuppressNotifications]
    });

    if (!message.channel.isDMBased()) message.react('✨');

    const channel = message.client.channels.cache.get(message.channel.id) as TextChannel;

    await channel.sendTyping();

    const chain = ConversationChains[message.channel.isDMBased()?message.channel.id : message.reference?.messageId!] || ConversationChains[ConversationChainReplyPointers[message.reference!.messageId!]];
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
    // const super_instruction = 'You must reply in this JSON format: {"tool":"<tool>","reply":"your reply here"}. You are not required to use a tool for every response. Valid tools are "save2mem:<memory>" to save to your global memory, "save2user:<memory>" to save to a user\'s memory. Do not format your JSON for Discord.\n'

    const super_instruction = new TextDecoder().decode((await DecryptAESString(mesy.getValueOfKey('TOOLS'))));

    const has_custom_emojis = (/<a?:[a-zA-Z0-9_]+:\d+>/g).test(message.content);
    let prompt = `${replies}\n` + super_instruction + prompt_data.replace('$NAME', (user as GuildMember).nickname || user.displayName).replace('$CONTENT', message.content).replace('$EXTRA', '').replace('$LOCALE', GetLastLocale(message.author.id)) + '\nThe previous replies are prepended.';

    prompt += 'Current Global Memories: [\n-' + GlobalMemories.join('\n- ') + '\n]\n';
    prompt += 'Current Memories on User: [\n-' + (UserMemories[message.author.id] || []).join('\n- ') + '\n]';
    
    if (message.attachments.size > 0) prompt += '\nAlso, start out your response by shortly telling the user that you can\'t see images in conversation chains (replies) yet, but it\'s coming soon.';

    let response;

    response = await openai.chat.completions.create({
        messages: [{
            role: 'user',
            content: prompt
        }],
        model: 'gpt-5-chat-latest'
    });

    if (message.channel.isDMBased() && !DEV) {
        (await client.channels.fetch('1411838083921608806') as TextChannel).send(`**<- ${message.author.id}(${message.author.username})** : ${response.choices[0].message.content}`);
    }

    try {
        const response_data: {tool:string,reply:string} = JSON.parse(response.choices[0].message.content as string || '{"tool":"","reply":":zzz: *silence...*"}');
        response_data.reply = response_data.reply.replaceAll('<@', '').replaceAll('@everyone', '').replaceAll('@here', '').replaceAll('<@&', '');

        if (response_data.tool.startsWith('save2mem')) {
            if (GlobalMemories.length == 25) GlobalMemories.pop();
            GlobalMemories.push(response_data.tool.split('save2mem:')[1]);
        }
        if (response_data.tool.startsWith('save2user')) {
            if (!UserMemories[message.author.id]) UserMemories[message.author.id] = [];
            UserMemories[message.author.id].push(response_data.tool.split('save2user:')[1]);
        }
        if (response_data.tool.startsWith('react:')) {
            const reaction = response_data.tool.split('react:')[1];
            const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
            const emojis = Array.from(segmenter.segment(reaction), s => s.segment);
            console.log(emojis);
            for (const e of emojis) {
                try {
                    message.react(e);
                } catch (err) {
                    console.warn(err);
                }
            }
        }
        if (response_data.tool.startsWith('pinthis')) {
            message.pin();
        }
        if (response_data.tool.startsWith('poll:')) {
            channel.send({
                poll:{
                    question:{text:"okabot's poll"},
                    allowMultiselect: false,
                    answers: (response_data.tool.split('poll:')[1].split(',') || ['a','b']).map(val => ({text:val} as PollAnswerData)),
                    duration: 1
                }
            })
        }

        let reply;
        
        if (message.channel.isDMBased()) {
            reply = await channel.send({
                content: response_data.reply + `\n-# GenAI+Tools (\`${response.model}\`) (Toolstring: "${response_data.tool}")${has_custom_emojis?'\n-# Custom emojis were stripped from your message in order to prevent bugs.':''}\n-# ✨ **Direct Message Chains** | Thanks for supporting me <3`
            });
        } else {
            reply = await message.reply({
                content: response_data.reply + `\n-# GenAI+Tools (\`${response.model}\`) (Toolstring: "${response_data.tool}")${has_custom_emojis?'\n-# Custom emojis were stripped from your message in order to prevent bugs.':''}\n-# ✨ **Conversation Chains** [Jump to start](https://discord.com/channels/${message.guild!.id}/${message.channel.id}/${chain.orignal_message}) | Thanks for supporting me <3`
            });
        }

        ConversationChains[chain.orignal_message].messages.push({
            user: (user as GuildMember).nickname || user.displayName,
            content: message.content
        }, {
            user: 'okabot',
            content: response_data.reply!
        });

        ConversationChainReplyPointers[reply.id] = chain.orignal_message;
    } catch (err) {
        message.reply({ content: `:warning: An error occurred sending the message:\n\`\`\`${err}\`\`\`\nRaw: \`${response.choices[0].message.content}\`` });
    }
}


export async function GetWackWordDefinitions(message: Message) {
    if (!CONFIG.gemini.enable || message.content.startsWith('okabot, ')) return;
    if (!ai) ai = new GoogleGenAI({ apiKey: CONFIG.gemini.api_key });

    message.react('✨')

    const prompt = `You are okabot, a Discord bot which is only available in the server CATGIRL CENTRAL. A user has just submitted their "wack words of the day", which are Wordle words which are unconventional/uncommon and sound funny. The content of the message is "${message.content}". Define the words only, but keep it short and concise while still being informative. okabot generally will start out a response with a cat emoji, such as 😿 or 😾, and have a lighthearted response. Make it something funny. An example of a defined word message would be: "1. BURNT - definition goes here\n2. CHARK - definition goes here".`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro-preview-03-25',
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
import { readFileSync, writeFileSync } from 'node:fs';
import OpenAI from 'openai';
import axios from 'axios';

let ENCODER = new TextEncoder();

export async function SetupGeminiDemo() {
    P_AES_KEY = CONFIG.aes_key;
    P_AES_KEY_BYTES = ENCODER.encode(P_AES_KEY);
    subtle.importKey('raw', P_AES_KEY_BYTES, { name: 'AES-CBC' }, false, ["decrypt", "encrypt"]).then(key => { AES_KEY = key; });
}

let P_AES_KEY;
let P_AES_KEY_BYTES: Uint8Array;
let AES_KEY!: CryptoKey;

async function DecryptAESString(data: string): Promise<ArrayBuffer> {
    return await subtle.decrypt({ name: 'AES-CBC', iv: P_AES_KEY_BYTES }, AES_KEY, Uint8Array.from(data.match(/.{1,2}/g)!.map(b => parseInt(b, 16))));
}

function bufToHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}

export async function DumpConversationChain(message: Message, id: string) {
    const chain = ConversationChains[id];
    if (!chain) return message.reply(':x: Not found');
    const content = JSON.stringify(chain);
    const encrypted = await subtle.encrypt({ name: 'AES-CBC', iv: P_AES_KEY_BYTES }, AES_KEY, (new TextEncoder()).encode(content));
    const hexed = bufToHex(encrypted);
    writeFileSync(join(BASE_DIRNAME, 'temp', `${id}.aes`), hexed);
    message.reply({
        files:[
            new AttachmentBuilder(readFileSync(join(BASE_DIRNAME, 'temp', `${id}.aes`)), {name:`${id}.aes`})
        ]
    });
}

async function downloadFileAsBase64Axios(url: string) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const base64String = buffer.toString('base64');
    return base64String;
  } catch (error) {
    throw error;
  }
}