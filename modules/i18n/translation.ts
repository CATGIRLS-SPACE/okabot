import i18next from 'i18next';
import enUS from '../../assets/i18n/translations/en-US.json';
import {Translate} from "@google-cloud/translate/build/src/v2";
import {CONFIG} from "../../index";
import {Locale} from "discord.js";

export const SUPPORTED_LANGUAGES = ['en-US', 'en-GB'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const AUTO_TRANSLATE_LANGUAGES = [
    Locale.Russian,
    Locale.German,
    Locale.SpanishES,
    Locale.SpanishLATAM,
    Locale.French,
    Locale.Greek,
    Locale.Polish,
    Locale.Japanese,
    Locale.ChineseCN,
    Locale.ChineseTW
];
export type AutoTranslateLanguage = typeof AUTO_TRANSLATE_LANGUAGES[number];

let translateClient: Translate;

export async function InitLanguage() {
    await i18next.init({
        lng: 'en-US',
        fallbackLng: 'en-US',
        resources: {
            'en-US': {
                translation: enUS
            }
        },
        interpolation: {
            escapeValue: false
        }
    });

    translateClient = new Translate({key: CONFIG.translate_api_key, apiKey: CONFIG.translate_api_key});
}

// Maps similar to `{ "ru": { "words.cute": "Милашка" } }`
const AUTO_TRANSLATE_CACHE = new Map<AutoTranslateLanguage, Map<string, string>>();

export async function t(
    key: string,
    lang?: SupportedLanguage | string | undefined,
    vars?: Record<string, unknown>
): Promise<string> {
    const dont_translate = SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage) || !AUTO_TRANSLATE_LANGUAGES.includes(lang as AutoTranslateLanguage);

    if (dont_translate) return i18next.t(key, {
        lng: lang,
        fallbackLng: 'en-US',
        ...vars
    });

    // cloud translation API
    try {
        if (!AUTO_TRANSLATE_CACHE.has(lang as AutoTranslateLanguage)) AUTO_TRANSLATE_CACHE.set(lang as AutoTranslateLanguage, new Map<string, string>());
        if (AUTO_TRANSLATE_CACHE.get(lang as AutoTranslateLanguage)!.has(key)) {
            const translated = AUTO_TRANSLATE_CACHE.get(lang as AutoTranslateLanguage)!.get(key)!;
            return i18next.services.interpolator.interpolate(translated, vars || {}, lang as AutoTranslateLanguage, {escapeValue: false});
        }

        const data = await translateClient.translate(i18next.t(key), {from:'en',to:lang});
        const translated = data[0];
        AUTO_TRANSLATE_CACHE.get(lang as AutoTranslateLanguage)!.set(key, translated);
        return i18next.services.interpolator.interpolate(translated, vars || {}, lang as AutoTranslateLanguage, {});
    } catch (err: unknown) {
        console.error(err);
        return i18next.t(key, {
            lng: lang,
            fallbackLng: 'en-US',
            ...vars
        }) + `\n-# **Translation Error:** ${(err as Error).name} ${(err as Error).message}`;
    }
}