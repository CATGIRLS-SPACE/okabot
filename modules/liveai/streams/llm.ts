import { GoogleGenAI } from "@google/genai";
import { BASE_DIRNAME, CONFIG } from "../../../index";
import { Logger } from "okayulogger";
import { MESYFile } from "../../story/mesy";
import { join } from "path";
import { DecryptAESString } from "../../passive/geminidemo";

const L = new Logger('LLM');
let gemini: GoogleGenAI;

const prompts = new MESYFile(join(BASE_DIRNAME, 'assets', 'ai', 'prompts.mesy'));

export async function GetLLMStream(prompt: string) {
    if (!gemini) gemini = new GoogleGenAI({apiKey:CONFIG.gemini.api_key});

    let text = new TextDecoder().decode(await DecryptAESString(prompts.getValueOfKey('VOICE')));
    text = text.replaceAll('$NAME', 'meowlliie').replaceAll('$CONTENT', prompt);

    // console.log(text);
    
    L.debug('starting LLM streamed generation...');
    const stream = await gemini.models.generateContentStream({
        contents: [
            {text}
        ],
        model: 'gemini-2.0-flash'
    });

    return stream;
}