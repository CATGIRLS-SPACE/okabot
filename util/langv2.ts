import { EMOJI, GetEmoji } from "./emoji";


export enum LANGV2_INTERACTION {
    OKASH = 'interaction.okash'
}

const LANG_EN: {[key: string]: string} = {
    'interaction.okash':`${GetEmoji(EMOJI.CAT_MONEY_EYES)} **{1}**, you've got ${GetEmoji(EMOJI.OKASH)} OKA**{2}** in your wallet.\nYour bank balance is ${GetEmoji(EMOJI.OKASH)} OKA**{3}**.\nThere's currently ${GetEmoji(EMOJI.OKASH)} OKA**{4}** in the bank's fines.`,
}

// const LANG_ES: {[key: string]: string} = {
//     'interaction.okash':`${GetEmoji(EMOJI.CAT_MONEY_EYES)} **{1}**, you've got ${GetEmoji(EMOJI.OKASH)} OKA**{2}** in your wallet.\nYour bank balance is ${GetEmoji(EMOJI.OKASH)} OKA**{3}**.\nThere's currently ${GetEmoji(EMOJI.OKASH)} OKA**{4}** in the bank's fines.`,
// }


/**
 * Get a formatted string in a desired locale (if available)
 * @param item The string ID to get
 * @param locale TODO: the locale of the user to get the string from
 * @param params Replacement values for string value placeholders
 * @returns The localized string in the desired locale
 */
export function LangV2GetFormatted(item: LANGV2_INTERACTION, locale: 'en' | 'es', ...params: string[]): string {
    let str = LANG_EN[item];
    if (!str) return `[language error: ID \`${item}\` not found]`;

    let i = 0;
    for (const param of params) {
        i++;
        str = str.replaceAll(`{${i}}`, param);
    }
    return str;
}