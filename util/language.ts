import {EMOJI, GetEmoji} from "./emoji";
import {translateText} from "./translate";


export enum LANG_DEBUG {
    HELLO_WORLD = 'debug.helloworld'
}
export enum LANG_INTERACTION {
    OKASH = 'interaction.okash',

    DAILY = 'interaction.daily',
    DAILY_STREAK = 'interaction.daily.streak',
    DAILY_SR_OK = 'interaction.daily.srok',
    DAILY_SR_FAIL_HIGHER = 'interaction.daily.srfail_higher',
    DAILY_SR_FAIL_TWICE = 'interaction.daily.srfail_twice',
    DAILY_TOO_EARLY = 'interaction.daily.needtowait',
    DAILY_REMINDER = 'interaction.daily.reminder',
    DAILY_REMINDER_SCHEDULED = 'interaction.daily.reminder.scheduled',
    DAILY_REMINDER_ANGRY = 'interaction.daily.reminder.angry',
    DAILY_REMINDER_BUTTON = 'interaction.daily.reminder.button',
    DAILY_REMINDER_BUTTON_AGAIN = 'interaction.daily.reminder.button_claim',

    LEVEL_LEVELUP = 'level.levelup',
}
export enum LANG_GAMES {
    ANY_COOLDOWN = 'games.all.cooldown',
    ANY_WIN_STREAK = 'games.all.winstreak',

    MAGIC_AFFIRMATIVE_A = 'games.8ball.affirmative.a',
    MAGIC_AFFIRMATIVE_B = 'games.8ball.affirmative.b',
    MAGIC_AFFIRMATIVE_C = 'games.8ball.affirmative.c',
    MAGIC_AFFIRMATIVE_D = 'games.8ball.affirmative.d',
    MAGIC_AFFIRMATIVE_E = 'games.8ball.affirmative.e',
    MAGIC_AFFIRMATIVE_F = 'games.8ball.affirmative.f',
    MAGIC_AFFIRMATIVE_G = 'games.8ball.affirmative.g',
    MAGIC_AFFIRMATIVE_H = 'games.8ball.affirmative.h',
    MAGIC_AFFIRMATIVE_I = 'games.8ball.affirmative.i',
    MAGIC_AFFIRMATIVE_J = 'games.8ball.affirmative.j',
    MAGIC_NEGATIVE_A = 'games.8ball.negative.a',
    MAGIC_NEGATIVE_B = 'games.8ball.negative.b',
    MAGIC_NEGATIVE_C = 'games.8ball.negative.c',
    MAGIC_NEGATIVE_D = 'games.8ball.negative.d',
    MAGIC_NEGATIVE_E = 'games.8ball.negative.e',
    MAGIC_UNSURE_A = 'games.8ball.unsure.a',
    MAGIC_UNSURE_B = 'games.8ball.unsure.b',
    MAGIC_UNSURE_C = 'games.8ball.unsure.c',
    MAGIC_UNSURE_D = 'games.8ball.unsure.d',
    MAGIC_UNSURE_E = 'games.8ball.unsure.e',
    MAGIC_MESSAGE_INITIAL = 'games.8ball.initial',
    MAGIC_MESSAGE_FINAL = 'games.8ball.final',

    SLOTS_ONE_MACHINE = 'games.slots.multigame',
    SLOTS_DONATE = 'games.slots.donate',
    SLOTS_INITIAL = 'games.slots.initial',
    SLOTS_WIN = 'games.slots.win',
    SLOTS_LOSS = 'games.slots.miss',

    BLACKJACK_TOP = 'games.blackjack.top',
    BLACKJACK_YOU = 'games.blackjack.you',
    BLACKJACK_OKABOT = 'games.blackjack.okabot',
    BLACKJACK_TIE = 'games.blackjack.tie',
    BLACKJACK_TIE_21 = 'games.blackjack.tie_21',
    BLACKJACK_WIN = 'games.blackjack.win',
    BLACKJACK_LOSS = 'games.blackjack.loss',
    BLACKJACK_BUST = 'games.blackjack.bust',
    BLACKJACK_NEXT_PREVIEW = 'games.blackjack.next',
    BLACKJACK_BUTTON_HIT = 'games.blackjack.hit',
    BLACKJACK_BUTTON_STAND = 'games.blackjack.stand',
    BLACKJACK_BUTTON_DOUBLE = 'games.blackjack.doubledown',

    BLACKJACKV2_TOP = 'games.blackjackv2.top',
    BLACKJACKV2_BET = 'games.blackjackv2.bet',
    BLACKJACKV2_OKABOT = 'games.blackjackv2.okabot',
    BLACKJACKV2_YOU = 'games.blackjackv2.you',
    BLACKJACKV2_TOTAL = 'games.blackjackv2.total',
    BLACKJACKV2_WIN = 'games.blackjackv2.win',
    BLACKJACKV2_WIN_BLACKJACK = 'games.blackjackv2.blackjack',
    BLACKJACKV2_LOSS = 'games.blackjackv2.loss',
    BLACKJACKV2_BUST = 'games.blackjackv2.bust',
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
export enum LANG_ITEMS {
    COMMON_LOOTBOX = 'item.lootbox.common',
    RARE_LOOTBOX = 'item.lootbox.rare',
    EX_LOOTBOX = 'item.lootbox.ex',
    WEIGHTED_COIN = 'item.weighted_coin',
    STREAK_RESTORE = 'item.streak_restore',
    TRACKING_DEVICE = 'item.tracked_maker',
    SHOP_VOUCHER = 'item.shop_voucher',
    SCRATCH_TICKET = 'item.scratch_ticket',
    DROP_BOOST_15 = 'item.drop_boost.small',
    DROP_BOOST_30 = 'item.drop_boost.large',
    CASINO_PASS_10 = 'item.casino_pass.small',
    CASINO_PASS_30 = 'item.casino_pass.large',
    CASINO_PASS_60 = 'item.casino_pass.largest',
}

interface Language {
    [key: string]: string
}

// eventually i want to load these from json files
// but idk how to make emojis work

const LANGUAGE_EN: Language = {
    'debug.helloworld': 'Hello World! Your locale is {1}',

    'interaction.okash': `${GetEmoji('okash')} **{1}**, you've got OKA**{2}** in your wallet and OKA**{3}** in your bank!\nThere's currently ${GetEmoji(EMOJI.OKASH)} OKA**{4}** in fines at the bank.`,

    'interaction.daily': `:white_check_mark: You claimed your daily reward of ${GetEmoji(EMOJI.OKASH)} OKA**1500** and a **{1}**!`,
    'interaction.daily.streak': `:chart_with_upwards_trend: Nice! You've got a streak of {1} days! You get a daily bonus of ${GetEmoji(EMOJI.OKASH)} OKA**{2}**!`,
    'interaction.daily.srok': `${GetEmoji(EMOJI.STREAK_RESTORE_GEM)} **{1}**, you've restored your daily reward streak to **{2} days!**`,
    'interaction.daily.srfail_higher': ':crying_cat_face: Sorry, **{1}**, but your current streak is higher than your previous streak, so I can\'t restore it...',
    'interaction.daily.srfail_twice': ':crying_cat_face: Sorry, **{1}**, but you already restored your previous streak once, so I can\'t restore it...',
    'interaction.daily.needtowait': ':crying_cat_face: It\'s too early, **{1}**! Come back <t:{2}:R> to claim your daily reward!',
    'interaction.daily.reminder': `${GetEmoji(EMOJI.CAT_MONEY_EYES)} {1}! Your daily reward is ready to claim!`,
    'interaction.daily.reminder.scheduled': `${GetEmoji(EMOJI.CAT_SUNGLASSES)} Okaaay, I'll ping you in this channel when your daily is ready!`,
    'interaction.daily.reminder.angry': ':pouting_cat: **{1}**! I already told you that I\'d remind you!',
    'interaction.daily.reminder.button': 'Remind Me',
    'interaction.daily.reminder.button_claim': 'Remind Me Tomorrow',

    'level.levelup': `Congrats, <@{1}>! You're now level **{2}** ({3})!\nYou earned ${GetEmoji(EMOJI.OKASH)} OKA**{4}** and 1x **{5}**!\nYour next level will be in **{6}XP**.`,

    'games.8ball.affirmative.a':'yup, certainly!',
    'games.8ball.affirmative.b':'decidedly so!',
    'games.8ball.affirmative.c':'i have no doubt!',
    'games.8ball.affirmative.d':'yes, definitely!',
    'games.8ball.affirmative.e':'you should rely on it!',
    'games.8ball.affirmative.f':'as i see it, yeah!',
    'games.8ball.affirmative.g':'most likely',
    'games.8ball.affirmative.h':'looks promising',
    'games.8ball.affirmative.i':'yes',
    'games.8ball.affirmative.j':'signs are pointing to yes',
    'games.8ball.negative.a':'don\'t count on it',
    'games.8ball.negative.b':'my thoughts are nah',
    'games.8ball.negative.c':'my sources don\'t think so',
    'games.8ball.negative.d':'doesn\'t look promising',
    'games.8ball.negative.e':'i\'m pretty doubtful',
    'games.8ball.unsure.a':'hmmm... reply hazy, try again',
    'games.8ball.unsure.b':'ask again later',
    'games.8ball.unsure.c':'maybe i shouldn\'t tell you now',
    'games.8ball.unsure.d':'i can\'t predict now',
    'games.8ball.unsure.e':'i need to concentrate and think again...',
    'games.8ball.initial':'okabot shakes the :8ball: **Magic 8 Ball** to answer **{1}**\'s question...\n> {2}',
    'games.8ball.final':'okabot shakes the :8ball: **Magic 8 Ball** to answer **{1}**\'s question...\n> {2}\n\nand the answer is **{3}**',

    'games.slots.donate':'-# Enjoying okabot? Please consider [supporting me](<https://ko-fi.com/okawaffles>).\n',
    'games.slots.initial':`:slot_machine: **__SLOTS__** :slot_machine:\n**{1}** bets ${GetEmoji(EMOJI.OKASH)} OKA**{2}**...`,
    'games.slots.miss':'and loses {1} money! **(+5XP)**',
    'games.slots.win':`and wins ${GetEmoji(EMOJI.OKASH)} OKA**{1}**! **(+{2}XP)**`,
    'games.slots.multigame':'Woah there, **{1}**! You can only use one slot machine at a time!',

    'games.blackjack.top':`okabot Blackjack | You bet ${GetEmoji(EMOJI.OKASH)} OKA**{1}**\n-# Blackjack pays 3x, win pays 2x\n-# 🆕 *The Components V2 version of blackjack is available! Try it out by setting "classic" to False!*`,
    'games.blackjack.okabot':'**okabot**: [ {1} ] {2}',
    'games.blackjack.you':'**you**: [ {1} ] {2}',
    'games.blackjack.tie':'You tied! **(+10XP)**',
    'games.blackjack.tie_21':'You tied! **(+10XP)**-# You got a blackjack, but so did okabot. This is frustrating, so you got 1.5x your bet anyways!',
    'games.blackjack.win':`You won ${GetEmoji(EMOJI.OKASH)} OKA**{1}**! **(+{2}XP)**`,
    'games.blackjack.loss':'You lost! **(+10XP)**', // losing always gives 10xp
    'games.blackjack.bust':'You busted! **(+10XP)**', // busting always gives 10xp
    'games.blackjack.next':'Had you hit, you would\'ve drawn',
    'games.blackjack.hit':'Hit!',
    'games.blackjack.stand':'Stand!',
    'games.blackjack.doubledown':'Double Down!',

    'games.blackjackv2.top':'okabot Blackjack',
    'games.blackjackv2.bet':`You bet ${GetEmoji(EMOJI.OKASH)} OKA**{1}**`,
    'games.blackjackv2.okabot':'okabot: {1}',
    'games.blackjackv2.you':'you: {1}',
    'games.blackjackv2.total':'...totaing `[ {1} ]`',
    'games.blackjackv2.win':`${GetEmoji(EMOJI.CAT_MONEY_EYES)} You won ${GetEmoji(EMOJI.OKASH)} OKA{1}! (+15XP)`,
    'games.blackjackv2.blackjack':`${GetEmoji(EMOJI.CAT_MONEY_EYES)} :sparkles: Blackjack! You won ${GetEmoji(EMOJI.OKASH)} OKA{1}! (+20XP)`,
    'games.blackjackv2.loss':':crying_cat_face: You lost! (+10XP)',
    'games.blackjackv2.bust':':crying_cat_face: You busted! (+10XP)',

    'games.all.cooldown':':hourglass: Waiting for your cooldown to finish... :zzz:',
    'games.all.winstreak':':fire: **Heck yea, {1} in a row!**',

    'render.casino.win':'WINS {1}',
    'render.casino.loss':'{1} LOSS',
    'render.casino.title':'All Games (all-time)',
    'render.casino.coinflip':'COINFLIP {1}/{2}',
    'render.casino.blackjack':'BLACKJACK {1}/{2}',
    'render.casino.roulette':'{1}/{2} ROULETTE',
    'render.casino.slots':'{1}/{2} SLOTS',
    'render.casino.title_personal':'{1}\'s Stats',

    'item.lootbox.common':':package: Common Lootbox',
    'item.lootbox.rare':':package: Rare Lootbox',
    'item.lootbox.ex':':package: :sparkle: EX Lootbox :sparkle:',
    'item.weighted_coin':`${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} Weighted Coin`,
    'item.streak_restore':`${GetEmoji(EMOJI.STREAK_RESTORE_GEM)} Streak Restore`,
    'item.tracked_maker':':electric_plug: Tracking Device',
    'item.shop_voucher':`${GetEmoji(EMOJI.SHOP_VOUCHER)} Shop Voucher`,
    'item.scratch_ticket':'Scratch Ticket',
    'item.drop_boost.small':'Drop Boost (15 min)',
    'item.drop_boost.large':'Drop Boost (30 min)',
    'item.casino_pass.small':':credit_card: Casino Pass (10 min)',
    'item.casino_pass.large':':credit_card: Casino Pass (30 min)',
    'item.casino_pass.largest':':credit_card: Casino Pass (60 min)',
};

const LANGUAGE_JA: Language = {
    'debug.helloworld': '世界こんにちは！あなたのロカールは{1}',

    'interaction.okash': `${GetEmoji('okash')} **{1}**さん、ポケットにOKA**{2}**、銀行にOKA**{3}**持ちです\n銀行は罰金で${GetEmoji(EMOJI.OKASH)} OKA**{4}**持ちです`,

    'interaction.daily': `:white_check_mark: あなたの日次報酬を${GetEmoji(EMOJI.OKASH)}OKA**1500**と**{1}**受けります！`,
    'interaction.daily.streak': `:chart_with_upwards_trend: ナイス！あなたの日次報酬は{1}日！あなたは継続のボーナスで${GetEmoji(EMOJI.OKASH)} OKA**{2}**を受けります！`,
    'interaction.daily.srok': `${GetEmoji(EMOJI.STREAK_RESTORE_GEM)} **{1}**さん、あなたの日次報酬は**{2}日**へ戻す！`,
    'interaction.daily.srfail_higher': ':crying_cat_face: Sorry, **{1}**, but your current streak is higher than your previous streak, so I can\'t restore it...',
    'interaction.daily.srfail_twice': ':crying_cat_face: Sorry, **{1}**, but you already restored your previous streak once, so I can\'t restore it...',
    'interaction.daily.needtowait': ':crying_cat_face: **{1}**さん、あまりに早いです！ <t:{2}:R>に戻ってくります！',
    'interaction.daily.reminder': `${GetEmoji(EMOJI.CAT_MONEY_EYES)} {1}さん！あなたの日次報酬は整うです！`,
    'interaction.daily.reminder.scheduled': `${GetEmoji(EMOJI.CAT_SUNGLASSES)}　は～い！日次報酬は整うとメンションしましょう！`,
    'interaction.daily.reminder.angry': ':pouting_cat: **{1}**さん！もうあなたでメンションを言いています！',
    'interaction.daily.reminder.button': '整うとメンション',
    'interaction.daily.reminder.button_claim': 'また整うとメンション',

    'level.levelup': `おめでとう<@{1}>さん！あなたは**{2}**（レベル{3}）！\nあなたは${GetEmoji(EMOJI.OKASH)} OKA**{4}**と**{5}**を稼ぎました！\nあなたの次のレベルは**{6}XP**です`,

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

    'games.slots.donate':'-# okabotが好きですか？[寄付](<https://ko-fi.com/okawaffles>)をご検討ください\n',
    'games.slots.initial':`:slot_machine: **__スロットマシン__** :slot_machine:\n**{1}**さんが${GetEmoji(EMOJI.OKASH)} OKA**{2}**を賭けります`,
    'games.slots.miss':'そして**{2}**さんのokashを失た！**(+5XP)**',
    'games.slots.win':`そして${GetEmoji(EMOJI.OKASH)} OKA**{1}**を勝ち取りました！**(+{2}XP)**`,
    'games.slots.multigame':'Woah there, **{1}**! You can only use one slot machine at a time!',

    'games.blackjack.top':`okabot ブラックジャック・あなたのベットは${GetEmoji(EMOJI.OKASH)} OKA**{1}**です\n-# 21は3x・ウィンは2x`,
    'games.blackjack.okabot':'**okabot**：[ {1} ] {2}',
    'games.blackjack.you':'**あなた**：[ {1} ] {2}',
    'games.blackjack.tie':'あなたとokabotは同点です！**(+10XP)**',
    'games.blackjack.tie_21':'あなたとokabotは同点です！**(+10XP)**',
    'games.blackjack.win':`あなたは${GetEmoji(EMOJI.OKASH)} OKA**{1}**を稼ぎます！**(+{2}XP)**`,
    'games.blackjack.loss':'あなたは負けします！**(+10XP)**', // losing always gives 10xp
    'games.blackjack.bust':'あなたは絶します！**(+10XP)**', // busting always gives 10xp
    'games.blackjack.next':'次のカードは',
    'games.blackjack.hit':'ヒット！',
    'games.blackjack.stand':'やめて！',
    'games.blackjack.doubledown':'ダブルベット！',

    'games.all.cooldown':':hourglass: しばらくお待ちください :zzz:',
    'games.all.winstreak':':fire: **{1}連勝！**',

    'render.casino.win':'ヒット{1}回',
    'render.casino.loss':'{1}回負ける',
    'render.casino.title':'全部のゲーム（オールタイム）',
    'render.casino.coinflip':'コイントス  {1}/{2}',
    'render.casino.blackjack':'ブラックジャック  {1}/{2}',
    'render.casino.roulette':'{1}/{2}  ルーレット',
    'render.casino.slots':'{1}/{2}  スロット',
    'render.casino.title_personal':'{1}さんの統計',

    'item.lootbox.common':':package: ありがちのパッケージ',
    'item.lootbox.rare':':package: レアパッケージ',
    'item.lootbox.ex':':package: :sparkle: LLのパッケージ :sparkle:',
    'item.weighted_coin':`${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} 重いコイン`,
    'item.streak_restore':`${GetEmoji(EMOJI.STREAK_RESTORE_GEM)} 日次報酬修理`,
    'item.tracked_maker':':electric_plug: トラッカー',
    'item.shop_voucher':`${GetEmoji(EMOJI.SHOP_VOUCHER)} アイテムの利用券`,
    'item.scratch_ticket':'randomチケット',
    'item.drop_boost.small':'パッケージブースト（15分）',
    'item.drop_boost.large':'パッケージブースト（30分）',
    'item.casino_pass.small':':credit_card: ブラックジャックパス（10分）',
    'item.casino_pass.large':':credit_card: ブラックジャックパス（30分）',
    'item.casino_pass.largest':':credit_card: ブラックジャックパス（60分）',
}

const LANGUAGE_BR: Language = {
    'debug.helloworld':'Olá, mundo! Sua localidade é {1}\n-# O português brasileiro não é 100% suportado e atualmente está sendo usado como idioma de teste.',

    'interaction.okash':`Okawaffles, você tem ${GetEmoji(EMOJI.OKASH)} OKA**{1}** na carteira e ${GetEmoji(EMOJI.OKASH)} OKA**{2}** no banco. Há ${GetEmoji(EMOJI.OKASH)} OKA**{3}** em multas no banco.\n-# O português brasileiro não é 100% suportado e atualmente está sendo usado como idioma de teste.`,

    'interaction.daily':`:white_check_mark: Você reivindicou sua recompensa diária e ganhou ${GetEmoji(EMOJI.OKASH)} OKA**1500** e um **{1}**\n-# O português brasileiro não é 100% suportado e atualmente está sendo usado como idioma de teste.`,
}

// --

export function LangGetFormattedString(id: LANG_DEBUG | LANG_INTERACTION | LANG_RENDER | LANG_GAMES | LANG_ITEMS, locale: string, ...params: (string | number)[]) {
    // try to get ID, fallback to english if it doesn't exist, and finally fallback to failure string
    let item = ({en:LANGUAGE_EN[id],ja:LANGUAGE_JA[id],br:LANGUAGE_BR[id]}[locale]) || LANGUAGE_EN[id] || `[unknown language string \`${id}\`]`;

    for (let i = 0; i < params.length; i++) {
        // console.log(`{${i + 1}} replace with`, params[i]);
        item = item.replaceAll(`{${i + 1}}`, params[i].toString());
    }

    return item;
}

export async function LangGetAutoTranslatedString(id: LANG_DEBUG | LANG_INTERACTION | LANG_RENDER | LANG_GAMES | LANG_ITEMS, locale: string, ...params: (string | number)[]) {
    // if it's not a supported locale then we use auto-translate
    if (locale != 'en' && locale != 'en-US' && locale != 'en-GB' && locale != 'ja') {
        let item = LANGUAGE_EN[id] || `[translation error: string \`${id}\` does not exist]`;
        for (let i = 0; i < params.length; i++) {
            item = item.replaceAll(`{${i + 1}}`, params[i].toString());
        }
        return await translateText(item, locale);
    }

    // try to get ID, fallback to english if it doesn't exist, and finally fallback to failure string
    let item = ({en:LANGUAGE_EN[id],ja:LANGUAGE_JA[id],br:LANGUAGE_BR[id]}[locale as 'en' | 'ja' | 'br']) || LANGUAGE_EN[id] || `[unknown language string \`${id}\`]`;

    for (let i = 0; i < params.length; i++) {
        item = item.replaceAll(`{${i + 1}}`, params[i].toString());
    }

    return item;
}

export async function LangGetAutoTranslatedStringRaw(text: string, locale: string, ...params: (string | number)[]) {
    if (locale == 'en-US') return text;

    let item = text;
    for (let i = 0; i < params.length; i++) {
        item = item.replaceAll(`{${i + 1}}`, params[i].toString());
    }
    return await translateText(item, locale);
}