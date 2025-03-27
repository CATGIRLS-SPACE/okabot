import {EMOJI, GetEmoji} from "./emoji";


export enum LANG_DEBUG {
    HELLO_WORLD = 'debug.helloworld'
}
export enum LANG_INTERACTION {
    OKASH = 'interaction.okash'
}

interface Language {
    [key: string]: string
}

// eventually i want to load these from json files
// but idk how to make emojis work

const LANGUAGE_EN: Language = {
    'debug.helloworld': 'Hello World! Your locale is {1}',

    'interaction.okash': `${GetEmoji('okash')} **{1}**, you've got OKA**{2}** in your wallet and OKA**{3}** in your bank!\nThere's currently ${GetEmoji(EMOJI.OKASH)} OKA**{4}** in fines at the bank.`,
};

const LANGUAGE_JA: Language = {
    'debug.helloworld': '世界こんにちは！あなたのロカールは{1}',

    'interaction.okash': `${GetEmoji('okash')} **{1}**さん、ポケットにOKA**{2}**、銀行にOKA**{3}**持ちです\n銀行は罰金で${GetEmoji(EMOJI.OKASH)} OKA**{4}**持ちです`,
}

// --

export function LangGetFormattedString(id: LANG_DEBUG | LANG_INTERACTION, locale: 'en' | 'ja', ...params: string[]) {
    // try to get ID, fallback to english if it doesn't exist, and finally fallback to failure string
    let item = locale=='ja'?LANGUAGE_JA[id]:LANGUAGE_EN[id] || LANGUAGE_EN[id] || `[unknown language string \`${id}\`]`;

    for (let i = 0; i < params.length; i++) {
        // console.log(`{${i + 1}} replace with`, params[i]);
        item = item.replaceAll(`{${i + 1}}`, params[i]);
    }

    return item;
}