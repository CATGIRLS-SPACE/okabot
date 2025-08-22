import { Message, Snowflake } from "discord.js";
import { BASE_DIRNAME, CONFIG } from "../../../../index";
import { subtle } from "crypto";
import { EMOJI, GetEmoji } from "../../../../util/emoji";
import { MESYFile } from "../../../story/mesy";
import { join } from "path";
import { GoogleGenAI } from "@google/genai";
import { SERVERS, TOOLS } from "./types";
import { GetUserDevStatus, GetUserSupportStatus } from "../../../../util/users";
import { GetLastOsuPlay, GetMemory, GetUsedTool } from "./tools";
import { CreateChain, GetChainFromReply, UpdateChain } from "./chains";

// crypto stuff //
let P_AES_KEY: string;
let P_AES_KEY_BYTES: Uint8Array;
let AES_KEY: CryptoKey;

/**
 * Load keys for decryption/encryption of AI data
 */
export async function SetupCryptoKeys() {
    P_AES_KEY = CONFIG.lilac.aes_key;
    P_AES_KEY_BYTES = (new TextEncoder()).encode(P_AES_KEY);
    if (P_AES_KEY_BYTES.length !== 16) {
        throw new Error("AES key must be exactly 16 bytes since it doubles as IV.");
    }
    await subtle.importKey('raw', P_AES_KEY_BYTES, { name: 'AES-CBC' }, false, ["decrypt", "encrypt"]).then(key => { AES_KEY = key; });
}

async function DecryptPromptData(encrypted_data: string): Promise<string> {
    return new TextDecoder().decode(
        await subtle.decrypt({
            name: 'AES-CBC', 
            iv: P_AES_KEY_BYTES
        }, AES_KEY, Uint8Array.from(encrypted_data.match(/.{1,2}/g)!.map(b => parseInt(b, 16))))
    );
}

let GEMINI: GoogleGenAI;
let OPENAI;

// main functions

export async function GeminiV2RespondTo(message: Message) {
    if (!CONFIG.gemini.enable) return;
    if (message.guild!.id != SERVERS.CATGIRL_CENTRAL && message.guild!.id != SERVERS.FULL_STREAK_GANG && message.guild!.id != SERVERS.OKABOT_DEV) return;

    if (GetUserSupportStatus(message.author.id) == "none" && GetUserDevStatus(message.author.id) == 'none') return message.reply({
        content: ':crying_cat_face: Sorry, Lilac is only available for supporters during early testing. However, you can still use the original chat system, and now original Conversation Chains are free for everyone!'
    });

    if (!GEMINI) GEMINI = new GoogleGenAI({apiKey: CONFIG.gemini.api_key});

    // instead of typing, we will reply now as it indicates okabot is actually working...
    const reply = await message.reply({
        content: `:hyacinth:${GetEmoji(EMOJI.SQUISHY)}`
    });

    // load prompts.mesy
    // we do this every request because then we can pull changes without restarting okabot
    const PROMPTS = new MESYFile(join(BASE_DIRNAME, 'assets', 'ai', 'lilac.mesy'));
    
    const encrypted_prompt = PROMPTS.getValueOfKey('SECRET');
    // console.log(encrypted_prompt);
    let prompt = await DecryptPromptData(encrypted_prompt);
    // let prompt = TEST_PROMPT;
    // replace prompt variables
    prompt = prompt
        .replaceAll('$NAME', message.author.displayName)
        .replaceAll('$CONTENT', message.content)
        .replaceAll('$MEMORY', GetMemory('global'))
        .replaceAll('$USERMEMORY', GetMemory('user', message.author.id));

    if (message.guild!.id == SERVERS.FULL_STREAK_GANG || message.guild!.id == SERVERS.OKABOT_DEV) {
        // decrypt and append the fsg prompt
        const fsg_encrypted = PROMPTS.getValueOfKey('FSG');
        prompt += '\n' + await DecryptPromptData(fsg_encrypted);
    }

    // console.log(prompt);

    let response = await GEMINI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config:{
            tools:[
                {
                    googleSearch:{},
                    codeExecution:{},
                }
            ]
        }
    });

    const used_tool = GetUsedTool(response.text as string, message.author.id);
    let chain_created = false;
    
    if (used_tool == TOOLS.GET_OSU) {
        chain_created = true;
        CreateChain({
            author:message.author,
            advanced: true,
            id: reply.id,
            initial_content: {
                system: prompt,
                user: message.content,
                okabot: response.text!
            }
        });

        const map_info = await GetLastOsuPlay(response.text!.split(']')[0]);
        console.log(map_info);

        UpdateChain(reply.id, {
            role: 'system',
            content: `osu! play details as JSON: ${JSON.stringify(map_info)}. DO NOT REPEAT THE TOOL IMMEDIATELY. If it is undefined, then let the user know you can't parse usernames with spaces yet and that they should try using their ID instead.`
        });

        const chain = GetChainFromReply(reply.id);
        let additional_chain_info = '\nPast Conversation History from This Chat:\n';
        for (const message of chain.messages) {
            if (message.role == 'system') {
                additional_chain_info += `!!SYSTEM REPLY!!: ${message.content}`;
                continue;
            }

            additional_chain_info += `${message.role}: ${message.content}`;
        }

        response = await GEMINI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt + additional_chain_info,
            config:{
                tools:[
                    {
                        googleSearch:{},
                    }
                ]
            }
        });
    }

    let response_text = response.text;
    if (response_text?.startsWith('[')) response_text = response_text.substring(response_text.indexOf(']') + 1);

    reply.edit({
        content: `${response_text==''?'*(no response, tool was likely used?)*':response_text}\n-# :hyacinth:Lilac \`${response.modelVersion}\` ・ Thoughts: ${response.usageMetadata?.thoughtsTokenCount} of ${response.usageMetadata?.totalTokenCount}\n-# Lilac is in early development. Not all features work. okabot may respond differently than previously.`
    });

    if (!chain_created) CreateChain({
        author:message.author,
        advanced: true,
        id: reply.id,
        initial_content: {
            system: prompt,
            user: message.content,
            okabot: response_text || ''
        }
    });
    else UpdateChain(reply.id, {role: 'okabot', content: response_text!}, reply.id);
}


export async function LilacHandleChainReply(message: Message) {
    if (GetUserSupportStatus(message.author.id) == "none" && GetUserDevStatus(message.author.id) == 'none') return;

    // instead of typing, we will reply now as it indicates okabot is actually working...
    const reply = await message.reply({
        content: `:hyacinth:${GetEmoji(EMOJI.SQUISHY)}`
    });

    // load prompts.mesy
    // we do this every request because then we can pull changes without restarting okabot
    const PROMPTS = new MESYFile(join(BASE_DIRNAME, 'assets', 'ai', 'lilac.mesy'));
    
    const encrypted_prompt = PROMPTS.getValueOfKey('SECRET');
    let prompt = await DecryptPromptData(encrypted_prompt);
    // replace prompt variables
    prompt = prompt
        .replaceAll('$NAME', message.author.displayName)
        .replaceAll('$CONTENT', message.content)
        .replaceAll('$MEMORY', GetMemory('global'))
        .replaceAll('$USERMEMORY', GetMemory('user', message.author.id));

    if (message.guild!.id == SERVERS.FULL_STREAK_GANG || message.guild!.id == SERVERS.OKABOT_DEV) {
        // decrypt and append the fsg prompt
        const fsg_encrypted = PROMPTS.getValueOfKey('FSG');
        prompt += '\n' + await DecryptPromptData(fsg_encrypted);
    }

    let additional_chain_info = '\n';
    const chain = GetChainFromReply(message.reference!.messageId!);
    
    for (const message of chain.messages) {
        if (message.role == 'system') {
            additional_chain_info += `!!SYSTEM REPLY!!: ${message.content}`;
            continue;
        }

        additional_chain_info += `${message.role}: ${message.content}`;
    }

    UpdateChain(chain.original_message, {
        role: message.author.displayName,
        content: message.content
    });

    const response = await GEMINI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt + additional_chain_info,
        config:{
            tools:[
                {
                    googleSearch:{},
                    codeExecution:{},
                }
            ]
        }
    });

    const used_tool = GetUsedTool(response.text as string, message.author.id);

    let response_text = response.text;
    if (response_text?.startsWith('[')) response_text = response_text.substring(response_text.indexOf(']') + 1);

    reply.edit({
        content: `${response_text}\n-# :hyacinth:Lilac \`${response.modelVersion}\` ・ Thoughts: ${response.usageMetadata?.thoughtsTokenCount} of ${response.usageMetadata?.totalTokenCount}\n-# Lilac is in early development. Not all features work. okabot may respond differently than previously.`
    });

    UpdateChain(chain.original_message, {
        role: 'okabot',
        content: response_text!
    }, reply.id);
}