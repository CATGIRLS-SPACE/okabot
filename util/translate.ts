import {CONFIG} from "../index";
import {Translate} from "@google-cloud/translate/build/src/v2";

const translationClient = new Translate({apiKey:CONFIG.translate_api_key,key:CONFIG.translate_api_key});

export async function translateText(text_to_translate: string, target_language: string): Promise<string> {
    // Run request
    const response = await translationClient.translate([text_to_translate], {from:'en',to:target_language})

    // console.log(response[0][0]);
    return response[0][0];
}