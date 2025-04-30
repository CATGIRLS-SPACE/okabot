import {CONFIG} from "../index";
import {Translate} from "@google-cloud/translate/build/src/v2";

const translationClient = new Translate({apiKey:CONFIG.translate_api_key,key:CONFIG.translate_api_key});

let translation_id = 0;

export async function translateText(text_to_translate: string, target_language: string): Promise<string> {
    if (target_language == 'en' || target_language == 'en-US' || target_language == 'en-GB') return text_to_translate;

    translation_id++;
    console.log(`translating ID ${translation_id} "${text_to_translate}"...`);

    try {
        // Run request
        const response = await translationClient.translate([text_to_translate], {from:'en',to:target_language})
        // console.log(response[0][0]);
        return response[0][0];
    } catch (e) {
        console.error(e);
        return `([live translation error]) ${text_to_translate}`
    }
}