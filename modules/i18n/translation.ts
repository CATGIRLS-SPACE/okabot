import i18next from 'i18next';
import {Translate} from "@google-cloud/translate/build/src/v2";
import {BASE_DIRNAME, CONFIG} from "../../index";
import {Locale} from "discord.js";
import {Low} from "lowdb";
import {JSONFilePreset} from "lowdb/node";
import {join} from "path";
import {Logger} from "okayulogger";
import {GetUserSupportStatus} from "../../util/users";
import {EMOJI, GetEmoji} from "../../util/emoji";

import enUS from '../../assets/i18n/translations/en-US/all.json';
import enUS_help from '../../assets/i18n/translations/en-US/help.json';
import autoTranslateAlternatives from '../../assets/i18n/translations/en-US/auto-mt.json';
import ru from '../../assets/i18n/translations/ru/all.json';

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
                translation: {
                    ...enUS,
                    help: enUS_help
                }
            },
            'auto-mt': { // removes pronoun variables in some strings, autotranslate will pick these over en-US
                translation: autoTranslateAlternatives
            },
            'ru': {
                translation: ru
            }
        },
        interpolation: {
            escapeValue: false,
            defaultVariables: {
                default_coin: GetEmoji(EMOJI.COIN_DEFAULT_STATIONARY),
                red_coin: GetEmoji(EMOJI.COIN_RED_STATIONARY),
                dark_blue_coin: GetEmoji(EMOJI.COIN_DARK_BLUE_STATIONARY),
                light_blue_coin: GetEmoji(EMOJI.COIN_BLUE_STATIONARY),
                pink_coin: GetEmoji(EMOJI.COIN_PINK_STATIONARY),
                purple_coin: GetEmoji(EMOJI.COIN_PURPLE_STATIONARY),
                dark_green_coin: GetEmoji(EMOJI.COIN_DARK_GREEN_STATIONARY),
                weighted_coin: GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY),
                rainbow_coin: GetEmoji(EMOJI.COIN_RAINBOW_STATIONARY),
                default_card_deck: GetEmoji(EMOJI.CARD_BACK),
                trans_card_deck: GetEmoji(EMOJI.CARD_BACK_TRANS),
                cherry_card_deck: GetEmoji(EMOJI.CARD_BACK_SAKURA),
                okash: GetEmoji(EMOJI.OKASH),
                cat_sunglasses: GetEmoji(EMOJI.CAT_SUNGLASSES),
                cat_money_eyes: GetEmoji(EMOJI.CAT_MONEY_EYES),
                streak_restore: GetEmoji(EMOJI.STREAK_RESTORE_GEM),
                cbcd_back: GetEmoji(EMOJI.CARD_BACK_SAKURA),
                dcd_back: GetEmoji(EMOJI.CARD_BACK),
                tcd_back: GetEmoji(EMOJI.CARD_BACK_TRANS),
                bmt: GetEmoji(EMOJI.BLACK_MARKET_TOKEN),
                bmts: GetEmoji(EMOJI.BLACK_MARKET_TOKEN_SHARD),

                en_contributors: enUS.lang_contributors,
                ru_contributors: ru.lang_contributors
            }
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
    let dont_translate = SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage) ||
        !AUTO_TRANSLATE_LANGUAGES.includes(lang as AutoTranslateLanguage) ||
        i18next.t(key, {lng: lang, fallbackLng: lang}) != key ||
        CONFIG.translate_api_key == '';


    if (key.includes('achievements.') && GetUserSupportStatus((vars as {[key: string]: string})?.__user_id__ || '') == 'none') dont_translate = true;

    if (dont_translate) {
        return i18next.t(key, {
            lng: lang,
            fallbackLng: 'en-US',
            joinArrays: '\n',
            ...vars,
        });
    }

    // cloud translation API
    try {
        if (!AutoTranslateDB.data[lang as AutoTranslateLanguage]) AutoTranslateDB.data[lang as AutoTranslateLanguage] = {};
        if (AutoTranslateDB.data[lang as AutoTranslateLanguage][key] && AutoTranslateDB.data[lang as AutoTranslateLanguage][key].expires > Date.now()) {
            const translated = AutoTranslateDB.data[lang as AutoTranslateLanguage][key].translation;
            return i18next.services.interpolator.interpolate(translated, vars || {}, lang as AutoTranslateLanguage, {escapeValue: false});
        }

        L.debug(`${lang} translation for ${key} is not cached`);

        const data = await translateClient.translate(i18next.t(key, 'auto-mt', {joinArrays: '\n'}), {from:'en',to:lang});
        const translated = data[0];
        // translations expire after 14 days to ensure inaccurate translations that may have been fixed are replaced in a reasonably timely manner,
    // while not spamming tf out of my api key lol
        AutoTranslateDB.data[lang as AutoTranslateLanguage][key] = {translation: translated, expires: Date.now() + (1000*60*60*24*14)};
        AutoTranslateDB.write();
        return i18next.services.interpolator.interpolate(translated, vars || {}, lang as AutoTranslateLanguage, {});
    } catch (err: unknown) {
        console.error(err);
        return i18next.t(key, {
            lng: lang,
            fallbackLng: 'en-US',
            joinArrays: '\n',
            ...vars
        }) + `\n-# **Translation Error:** ${(err as Error).name} ${(err as Error).message}`;
    }
}