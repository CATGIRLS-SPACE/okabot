import i18next from 'i18next';
import {Translate} from "@google-cloud/translate/build/src/v2";
import {BASE_DIRNAME, CONFIG} from "../../index";
import {Locale} from "discord.js";
import {Low} from "lowdb";
import {JSONFilePreset} from "lowdb/node";
import {join} from "path";
import {Logger} from "okayulogger";

import enUS from '../../assets/i18n/translations/en-US.json';
import ru from '../../assets/i18n/translations/ru.json';

const L = new Logger('i18n');

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


interface TranslationsDB {
    [key: string]: {
        [key: string]: {
            translation: string,
            expires: number
        }
    }
}
let AutoTranslateDB: Low<TranslationsDB>;

let translateClient: Translate;

export async function InitLanguage() {
    L.info('initializing i18n...');
    AutoTranslateDB = await JSONFilePreset(join(BASE_DIRNAME, 'db', 'i18n_cache.oka2'), {} as TranslationsDB);
    await AutoTranslateDB.write();

    await i18next.init({
        lng: 'en-US',
        fallbackLng: 'en-US',
        resources: {
            'en-US': {
                translation: enUS
            },
            'ru': {
                translation: ru
            }
        },
        interpolation: {
            escapeValue: false
        }
    });

    translateClient = new Translate({key: CONFIG.translate_api_key, apiKey: CONFIG.translate_api_key});
    L.info('i18n is ready!');
}

export async function t(
    key: string,
    lang?: SupportedLanguage | string | undefined,
    vars?: Record<string, unknown>
): Promise<string> {
    const dont_translate = SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage) ||
        !AUTO_TRANSLATE_LANGUAGES.includes(lang as AutoTranslateLanguage) ||
        i18next.t(key, {lng: lang, fallbackLng: lang}) != key;

    if (dont_translate) return i18next.t(key, {
        lng: lang,
        fallbackLng: 'en-US',
        ...vars
    });

    // cloud translation API
    try {
        if (!AutoTranslateDB.data[lang as AutoTranslateLanguage]) AutoTranslateDB.data[lang as AutoTranslateLanguage] = {};
        if (AutoTranslateDB.data[lang as AutoTranslateLanguage][key] && AutoTranslateDB.data[lang as AutoTranslateLanguage][key].expires > Date.now()) {
            const translated = AutoTranslateDB.data[lang as AutoTranslateLanguage][key].translation;
            return i18next.services.interpolator.interpolate(translated, vars || {}, lang as AutoTranslateLanguage, {escapeValue: false});
        }

        L.debug(`${lang} translation for ${key} is not cached`);

        const data = await translateClient.translate(i18next.t(key), {from:'en',to:lang});
        const translated = data[0];
        // translations expire after 14 days to ensure inaccurate translations that may have been fixed are replaced in a reasonably timely manner.
        AutoTranslateDB.data[lang as AutoTranslateLanguage][key] = {translation: translated, expires: Date.now() + (1000*60*60*24*14)};
        AutoTranslateDB.write();
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