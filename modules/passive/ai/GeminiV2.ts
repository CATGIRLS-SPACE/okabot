import { Message, Snowflake } from "discord.js";
import { CONFIG } from "../../../index";
import { subtle } from "crypto";
import { EMOJI, GetEmoji } from "../../../util/emoji";


/**
 * Legacy conversation chain interface.
 * These chains only held responses, not thoughts or extra info.
 */
interface ConversationChainV1 {
    author: Snowflake,
    orignal_message: Snowflake,
    disable_search: boolean,
    messages: Array<{
        user: 'okabot' | 'system' | string,
        content: string,
    }>
}


interface ConversationChainV2 {
    author: Snowflake,
    original_message: Snowflake,
    config: {
        disable_search: boolean,
        advanced_features_allowed: {
            global_memory: boolean,
            global_user_memory: boolean,
            download_links: boolean,
            search_tenor: boolean,
            get_okabot_profile: boolean,
        },
    },
    messages: Array<{
        role: 'okabot' | 'system' | string, // as username
        content: string,
    }>
}


// crypto stuff //
let P_AES_KEY: string;
let P_AES_KEY_BYTES: Uint8Array;
let AES_KEY: CryptoKey;

/**
 * Load keys for decryption/encryption of AI data
 */
async function SetupCryptoKeys() {
    P_AES_KEY = CONFIG.aes_key;
    P_AES_KEY_BYTES = (new TextEncoder()).encode(P_AES_KEY);
    subtle.importKey('raw', P_AES_KEY_BYTES, { name: 'AES-CBC' }, false, ["decrypt", "encrypt"]).then(key => { AES_KEY = key; });
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
Your responses MUST be in format "<tools>;<content>". 
Valid tools are: 
- "gif=<search>" (search for a gif on tenor)
- "save2mem=<content>" (save content to your global memory, use wisely)
- "save2user=<content>" (save to the author user's memory)`;



// exported


export async function GeminiV2RespondTo(message: Message) {
    // instead of typing, we will reply now as it indicates okabot is actually working...
    message.reply({
        content: `${GetEmoji(EMOJI.SQUISHY)}`
    });
}