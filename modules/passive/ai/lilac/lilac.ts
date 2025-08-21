import { Message, Snowflake } from "discord.js";
import { BASE_DIRNAME, CONFIG } from "../../../../index";
import { subtle } from "crypto";
import { EMOJI, GetEmoji } from "../../../../util/emoji";
import { MESYFile } from "../../../story/mesy";
import { join } from "path";
import { GoogleGenAI } from "@google/genai";
import { SERVERS } from "./types";
import { GetUserSupportStatus } from "../../../../util/users";

// crypto stuff //
let P_AES_KEY: string;
let P_AES_KEY_BYTES: Uint8Array;
let AES_KEY: CryptoKey;

/**
 * Load keys for decryption/encryption of AI data
 */
export async function SetupCryptoKeys() {
    P_AES_KEY = CONFIG.aes_key;
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

// not the final prompt, just used for testing tools etc
const TEST_PROMPT = `You are okabot. A user named "$NAME" has just invoked you with the message "$CONTENT". 
Your responses MUST be in format "[<tools>]<content>". 
Valid tools are: 
- "gif=<search>" (search for a gif on tenor)
- "save2mem=<content>" (save content to your global memory, use wisely)
- "save2user=<content>" (save to the author user's memory)
- "osuscore=<username>" (get last osu play by a user)`;


let GEMINI: GoogleGenAI;
let OPENAI;

// main functions

export async function GeminiV2RespondTo(message: Message) {
    if (!CONFIG.gemini.enable) return;
    if (message.guild!.id != SERVERS.CATGIRL_CENTRAL && message.guild!.id != SERVERS.FULL_STREAK_GANG && message.guild!.id != SERVERS.OKABOT_DEV) return;

    if (GetUserSupportStatus(message.author.id) == "none") return message.reply({
        content: ':crying_cat_face: Sorry, Lilac is only available for supporters during early testing. However, you can still use the original chat system, and now original Conversation Chains are free for everyone!'
    })

    if (!GEMINI) GEMINI = new GoogleGenAI({apiKey: CONFIG.gemini.api_key});

    // instead of typing, we will reply now as it indicates okabot is actually working...
    const reply = await message.reply({
        content: `${GetEmoji(EMOJI.SQUISHY)} *(thinking...)*`
    });

    // load prompts.mesy
    // we do this every request because then we can pull changes without restarting okabot
    const PROMPTS = new MESYFile(join(BASE_DIRNAME, 'assets', 'ai', 'prompts.mesy'));
    
    const encrypted_prompt = PROMPTS.getValueOfKey('FIRST');
    let prompt = await DecryptPromptData(encrypted_prompt);
    // replace prompt variables
    prompt = prompt.replaceAll('$NAME', message.author.displayName).replaceAll('$CONTENT', message.content);

    if (message.guild!.id == SERVERS.FULL_STREAK_GANG) {
        // decrypt and append the fsg prompt
        const fsg_encrypted = PROMPTS.getValueOfKey('FSG');
        prompt += await DecryptPromptData(fsg_encrypted);
    }

    const response = await GEMINI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    reply.edit({
        content: `${response.text}\n-# Lilac \`${response.modelVersion}\` | Thoughts: ${response.usageMetadata?.thoughtsTokenCount} of ${response.usageMetadata?.totalTokenCount}`
    });
}