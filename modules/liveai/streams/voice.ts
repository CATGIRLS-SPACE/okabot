import { ResultReason, SpeechConfig, SpeechSynthesisOutputFormat, SpeechSynthesizer } from "microsoft-cognitiveservices-speech-sdk";
import { CONFIG } from "../../../index";
import { GenerateContentResponse } from "@google/genai";
import { readFileSync } from "fs";
import { join } from "path";
import { sendSSML } from "./ws/azure";


const SSML = readFileSync(join(__dirname, 'ssml.xml'), 'utf-8');
const speechConfig = SpeechConfig.fromSubscription(CONFIG.gemini.azure_api_key, CONFIG.gemini.azure_region);
speechConfig.speechSynthesisOutputFormat = SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

export async function* GetAzureVoiceStream(stream: AsyncGenerator<GenerateContentResponse>) {
    const synthesizer = new SpeechSynthesizer(speechConfig);
    
    let buffer = "";

    for await (const chunk of stream) {
        const text = chunk.text?.trim();
        if (!text) continue;

        buffer += text;

        if (!(/[.?!]["')\]]?\s*$/.test(buffer))) continue;

        sendSSML(buffer);

        const audio = await new Promise<Buffer>((resolve, reject) => {
            synthesizer.speakSsmlAsync(SSML.replace('{SystemReplacedTextObject}', buffer), result => {
                if (result.reason === ResultReason.SynthesizingAudioCompleted) {
                    resolve(Buffer.from(result.audioData));
                } else {
                    reject(new Error(result.errorDetails));
                }
            }, err => reject(err));
        });

        yield audio;
        buffer = "";
    }

    // left-overs
    if (buffer) {
        sendSSML(buffer);

        const audio = await new Promise<Buffer>((resolve, reject) => {
            synthesizer.speakSsmlAsync(SSML.replace('{SystemReplacedTextObject}', buffer), result => {
                if (result.reason === ResultReason.SynthesizingAudioCompleted) {
                    resolve(Buffer.from(result.audioData));
                } else {
                    reject(new Error(result.errorDetails));
                }
            }, err => reject(err));
        });

        yield audio;
    }

    synthesizer.close();
}