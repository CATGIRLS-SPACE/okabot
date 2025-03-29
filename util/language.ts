import {EMOJI, GetEmoji} from "./emoji";


export enum LANG_DEBUG {
    HELLO_WORLD = 'debug.helloworld'
}
export enum LANG_INTERACTION {
    OKASH = 'interaction.okash',
    DAILY = 'interaction.daily',
    DAILY_STREAk = 'interaction.daily.streak',
}
export enum LANG_GAMES {
    MAGIC_AFFIRMATIVE_A = 'games.8ball.aa',
    MAGIC_AFFIRMATIVE_B = 'games.8ball.ab',
    MAGIC_AFFIRMATIVE_C = 'games.8ball.ac',
    MAGIC_AFFIRMATIVE_D = 'games.8ball.ad',
    MAGIC_AFFIRMATIVE_E = 'games.8ball.ae',
    MAGIC_AFFIRMATIVE_F = 'games.8ball.af',
    MAGIC_AFFIRMATIVE_G = 'games.8ball.ag',
    MAGIC_AFFIRMATIVE_H = 'games.8ball.ah',
    MAGIC_AFFIRMATIVE_I = 'games.8ball.ai',
    MAGIC_AFFIRMATIVE_J = 'games.8ball.aj',
    MAGIC_NEGATIVE_A = 'games.8ball.na',
    MAGIC_NEGATIVE_B = 'games.8ball.nb',
    MAGIC_NEGATIVE_C = 'games.8ball.nc',
    MAGIC_NEGATIVE_D = 'games.8ball.nd',
    MAGIC_NEGATIVE_E = 'games.8ball.ne',
    MAGIC_UNSURE_A = 'games.8ball.ua',
    MAGIC_UNSURE_B = 'games.8ball.ub',
    MAGIC_UNSURE_C = 'games.8ball.uc',
    MAGIC_UNSURE_D = 'games.8ball.ud',
    MAGIC_UNSURE_E = 'games.8ball.ue',
    MAGIC_MESSAGE_INITIAL = 'games.8ball.initial',
    MAGIC_MESSAGE_FINAL = 'games.8ball.final',
}
export enum LANG_RENDER {
    CASINO_WIN = 'render.casino.win',
    CASINO_LOSS = 'render.casino.loss',
    CASINO_TITLE = 'render.casino.title',
    CASINO_COINFLIP = 'render.casino.coinflip',
    CASINO_BLACKJACK = 'render.casino.blackjack',
    CASINO_ROULETTE = 'render.casino.roulette',
    CASINO_SLOTS = 'render.casino.slots',
    CASINO_TITLE_YOU = 'render.casino.title_personal',
}

interface Language {
    [key: string]: string
}

// eventually i want to load these from json files
// but idk how to make emojis work

const LANGUAGE_EN: Language = {
    'debug.helloworld': 'Hello World! Your locale is {1}',

    'interaction.okash': `${GetEmoji('okash')} **{1}**, you've got OKA**{2}** in your wallet and OKA**{3}** in your bank!\nThere's currently ${GetEmoji(EMOJI.OKASH)} OKA**{4}** in fines at the bank.`,

    'interaction.daily': '',
    'interaction.daily.streak':'',

    'games.8ball.aa':'yup, certainly!',
    'games.8ball.ab':'decidedly so!',
    'games.8ball.ac':'i have no doubt!',
    'games.8ball.ad':'yes, definitely!',
    'games.8ball.ae':'you should rely on it!',
    'games.8ball.af':'as i see it, yeah!',
    'games.8ball.ag':'most likely',
    'games.8ball.ah':'looks promising',
    'games.8ball.ai':'yes',
    'games.8ball.aj':'signs are pointing to yes',
    'games.8ball.na':'don\'t count on it',
    'games.8ball.nb':'my thoughts are nah',
    'games.8ball.nc':'my sources don\'t think so',
    'games.8ball.nd':'doesn\'t look promising',
    'games.8ball.ne':'i\'m pretty doubtful',
    'games.8ball.ua':'hmmm... reply hazy, try again',
    'games.8ball.ub':'ask again later',
    'games.8ball.uc':'maybe i shouldn\'t tell you now',
    'games.8ball.ud':'i can\'t predict now',
    'games.8ball.ue':'i need to concentrate and think again...',
    'games.8ball.initial':'okabot shakes the :8ball: **Magic 8 Ball** to answer **{1}**\'s question...\n> {2}',
    'games.8ball.final':'okabot shakes the :8ball: **Magic 8 Ball** to answer **{1}**\'s question...\n> {2}\n\nand the answer is **{3}**',

    'render.casino.win':'WINS {1}',
    'render.casino.loss':'{1} LOSS',
    'render.casino.title':'All Games (all-time)',
    'render.casino.coinflip':'COINFLIP {1}/{2}',
    'render.casino.blackjack':'BLACKJACK {1}/{2}',
    'render.casino.roulette':'{1}/{2} ROULETTE',
    'render.casino.slots':'{1}/{2} SLOTS',
    'render.casino.title_personal':'{1}\'s Stats',
};

const LANGUAGE_JA: Language = {
    'debug.helloworld': '世界こんにちは！あなたのロカールは{1}',

    'interaction.okash': `${GetEmoji('okash')} **{1}**さん、ポケットにOKA**{2}**、銀行にOKA**{3}**持ちです\n銀行は罰金で${GetEmoji(EMOJI.OKASH)} OKA**{4}**持ちです`,

    'games.8ball.aa':'もちろん！',
    'games.8ball.ab':'は～～い！',
    'games.8ball.ac':'うんうん～！',
    'games.8ball.ad':'絶対絶対！',
    'games.8ball.ae':'あなたはこれを信じって！',
    'games.8ball.af':'俺は「はい」を見ます',
    'games.8ball.ag':'多分',
    'games.8ball.ah':'絶対に多分',
    'games.8ball.ai':'はい',
    'games.8ball.aj':'「はい」を考えります',
    'games.8ball.na':'俺の推測は良いない',
    'games.8ball.nb':'まさか',
    'games.8ball.nc':'いいえ',
    'games.8ball.nd':'有望を見ってない',
    'games.8ball.ne':'絶対ない',
    'games.8ball.ua':'あの、俺の返事は不明です',
    'games.8ball.ub':'後をまた試す',
    'games.8ball.uc':'今今はあなたを伝えりない',
    'games.8ball.ud':'今今は、考えりない',
    'games.8ball.ue':'それはもっと考えります',
    'games.8ball.initial':'**{1}**の問題ためにokabotは:8ball: **マジック8ボール**を使う\n> {2}',
    'games.8ball.final':'**{1}**の問題ためにokabotは:8ball: **マジック8ボール**を使う\n> {2}\n\n問題の回答は：**{3}**',

    'render.casino.win':'ヒット{1}回',
    'render.casino.loss':'{1}回負ける',
    'render.casino.title':'全部のゲーム（オールタイム）',
    'render.casino.coinflip':'コイントス  {1}/{2}',
    'render.casino.blackjack':'ブラックジャック  {1}/{2}',
    'render.casino.roulette':'{1}/{2}  ルーレット',
    'render.casino.slots':'{1}/{2}  スロット',
    'render.casino.title_personal':'{1}さんの統計'
}

// --

export function LangGetFormattedString(id: LANG_DEBUG | LANG_INTERACTION | LANG_RENDER | LANG_GAMES, locale: 'en' | 'ja', ...params: (string | number)[]) {
    // try to get ID, fallback to english if it doesn't exist, and finally fallback to failure string
    let item = (locale=='ja'?LANGUAGE_JA[id]:LANGUAGE_EN[id]) || LANGUAGE_EN[id] || `[unknown language string \`${id}\`]`;

    for (let i = 0; i < params.length; i++) {
        // console.log(`{${i + 1}} replace with`, params[i]);
        item = item.replaceAll(`{${i + 1}}`, params[i].toString());
    }

    return item;
}