import {
    ActionRowBuilder,
    ActivityType,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ContainerBuilder, InteractionResponse,
    Message,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SlashCommandBuilder,
    Snowflake,
    TextChannel,
    TextDisplayBuilder
} from "discord.js";
import {Logger} from "okayulogger";
import {AddToWallet, GetBank, GetWallet, RemoveFromWallet} from "../wallet";
import {AddXP} from "../../levels/onMessage";
import {CheckOkashRestriction, GetUserProfile, OKASH_ABILITY} from "../../user/prefs";
import {EMOJI, GetEmoji} from "../../../util/emoji";
import {Achievements, GrantAchievement} from "../../passive/achievement";
import {AddCasinoLoss, AddCasinoWin} from "../casinodb";
import {CUSTOMIZATION_UNLOCKS} from "../items";
import {UpdateTrackedItem} from "../trackedItem";
import {DoRandomDrops} from "../../passive/onMessage";
import {SetActivity} from "../../../index";
import {LANG_GAMES, LangGetAutoTranslatedString} from "../../../util/language";

const L = new Logger('blackjack');


interface HandCard {
    value: number, name: string
}

// 52-card deck? no. 44. royalty was pissing me off.
const DECK: Array<HandCard> = [
    { value: 1, name: 'ca' },
    { value: 1, name: 'ca' },
    { value: 1, name: 'ca' },
    { value: 1, name: 'ca' },

    { value: 2, name: 'c2' },
    { value: 2, name: 'c2' },
    { value: 2, name: 'c2' },
    { value: 2, name: 'c2' },

    { value: 3, name: 'c3' },
    { value: 3, name: 'c3' },
    { value: 3, name: 'c3' },
    { value: 3, name: 'c3' },

    { value: 4, name: 'c4' },
    { value: 4, name: 'c4' },
    { value: 4, name: 'c4' },
    { value: 4, name: 'c4' },
    // 16
    { value: 5, name: 'c5' },
    { value: 5, name: 'c5' },
    { value: 5, name: 'c5' },
    { value: 5, name: 'c5' },

    { value: 6, name: 'c6' },
    { value: 6, name: 'c6' },
    { value: 6, name: 'c6' },
    { value: 6, name: 'c6' },

    { value: 7, name: 'c7' },
    { value: 7, name: 'c7' },
    { value: 7, name: 'c7' },
    { value: 7, name: 'c7' },

    { value: 8, name: 'c8' },
    { value: 8, name: 'c8' },
    { value: 8, name: 'c8' },
    { value: 8, name: 'c8' },
    // 32
    { value: 9, name: 'c9' },
    { value: 9, name: 'c9' },
    { value: 9, name: 'c9' },
    { value: 9, name: 'c9' },

    { value: 10, name: 'c10' },
    { value: 10, name: 'c10' },
    { value: 10, name: 'c10' },
    { value: 10, name: 'c10' },

    { value: 10, name: 'cr' },
    { value: 10, name: 'cr' },
    { value: 10, name: 'cr' },
    { value: 10, name: 'cr' },
    // 44
]

interface BlackjackGame {
    dealer: Array<HandCard>,
    user: Array<HandCard>,
    bet: number,
    gameActive: boolean,
    expires: number,
    deck: Array<HandCard>,
    okabot_has_hit: boolean,
    card_theme: CUSTOMIZATION_UNLOCKS,
    trackable_serial?: string,
    buttons: {
        hit: ButtonBuilder,
        stand: ButtonBuilder,
        stand_blackjack: ButtonBuilder,
        dd: ButtonBuilder,
    },
    language?: string
}

// user_id and game
const GamesActive = new Map<string, BlackjackGame>();
// user_id and bet
const BetRecovery = new Map<string, number>();
// user_id and time(d.getTime()/1000)
const LastGameFinished = new Map<string, number>();
// user_id & expiration (epoch sec)
export const PassesActive = new Map<Snowflake, number>();
// user_id and wins
const WinStreak = new Map<Snowflake, number>();

export function ReleaseBlackjackUser(user_id: Snowflake) {
    if (GamesActive.has(user_id)) GamesActive.delete(user_id);
    else return false;
    return true;
}

function TallyCards(cards: Array<HandCard>): number {
    let total = 0;
    let aces = 0;

    // Sum values and count aces
    for (const card of cards) {
        if (card.name === 'ca') {
            aces++;
            total += 11; // Assume Ace is 11 first
        } else {
            total += card.value;
        }
    }

    // Convert Aces from 11 to 1 if needed
    while (total > 21 && aces > 0) {
        total -= 10; // Change an Ace from 11 to 1
        aces--;
    }

    return total;
}

function GetCardEmojis(hand: Array<HandCard>, theme: CUSTOMIZATION_UNLOCKS) {
    let final = '';

    hand.forEach(card => {
        final += GetCardThemed(card.name, theme);
    });

    return final;
}


function GetCardThemed(id: string, theme: CUSTOMIZATION_UNLOCKS) {
    const themes: {[key:number]: string} = {12:'',13:'_t',14:'_s'};
    return GetEmoji(`${id}${themes[theme]}`);
}

export async function SetupBlackjackMessage(interaction: ChatInputCommandInteraction) {
    if (GamesActive.has(interaction.user.id)) return interaction.reply({
        content: `:bangbang: Woah there, **${interaction.user.displayName}**! You've already got a blackjack game going!`,
        flags: [MessageFlags.SuppressNotifications]
    });

    if (!WinStreak.has(interaction.user.id)) WinStreak.set(interaction.user.id, 0);

    const d = new Date();

    const result = await CheckOkashRestriction(interaction, OKASH_ABILITY.GAMBLE);
    if (result) return;

    // check if thhuser is usin
    let skip_cooldown = false;
    if (PassesActive.has(interaction.user.id)) {
        if (d.getTime()/1000<PassesActive.get(interaction.user.id)!) skip_cooldown = true;
        else PassesActive.delete(interaction.user.id);
    }

    const bet = interaction.options.getNumber('bet')!;

    if (bet.toString().includes('.')) return interaction.reply({
        content:`:x: **${interaction.user.displayName}**, I don't have change!`,
        flags: [MessageFlags.SuppressNotifications]
    });

    const wallet = GetWallet(interaction.user.id);
    if (wallet < bet) return interaction.reply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have that much!`,
        flags: [MessageFlags.SuppressNotifications]
    });


    RemoveFromWallet(interaction.user.id, bet);
    const can_double_down = GetWallet(interaction.user.id) >= bet;

    BetRecovery.set(interaction.user.id, bet);

    let this_deck = CloneArray(DECK);
    ShuffleCards(this_deck);
    const card_theme = GetUserProfile(interaction.user.id).customization.games.card_deck_theme;
    const trackable = GetUserProfile(interaction.user.id).customization.games.equipped_trackable_deck;


    // create buttons for game
    // these are stored in the game for
    // locale purposes
    const hitButton = new ButtonBuilder()
        .setCustomId('blackjack-hit')
        .setLabel(await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_BUTTON_HIT, interaction.okabot.translateable_locale))
        .setStyle(ButtonStyle.Primary);

    const standButton = new ButtonBuilder()
        .setCustomId('blackjack-stand')
        .setLabel(await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_BUTTON_STAND, interaction.okabot.translateable_locale))
        .setStyle(ButtonStyle.Secondary);

    const standButtonWin = new ButtonBuilder()
        .setCustomId('blackjack-stand')
        .setLabel(`✨ ${await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_BUTTON_STAND, interaction.okabot.translateable_locale)}`)
        .setStyle(ButtonStyle.Success);

    const doubleDownButton = new ButtonBuilder()
        .setCustomId('blackjack-double')
        .setLabel(await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_BUTTON_DOUBLE, interaction.okabot.translateable_locale))
        .setStyle(ButtonStyle.Primary);

    // create a blackjack game
    const game: BlackjackGame = {
        dealer: [],
        user: [],
        bet,
        gameActive: true,
        expires: d.getTime() + 120_000,
        deck: this_deck,
        okabot_has_hit: false,
        card_theme,
        trackable_serial: trackable=='none'?undefined:trackable,
        buttons: {
            hit: hitButton,
            stand_blackjack: standButtonWin,
            stand: standButton,
            dd: doubleDownButton
        }
    }

    // set up deck
    // to deal a card we must get a random one and remove it from the deck
    // since they are pre-shuffled, we can just take the topmost one

    // dealer gets two cards at first:
    game.dealer.push(
        game.deck.shift()!,
        game.deck.shift()!
    );
    
    // player also gets two cards
    game.user.push(
        game.deck.shift()!,
        game.deck.shift()!
    );

    if (game.trackable_serial) UpdateTrackedItem(trackable, {property:'dealt_cards', amount:4});

    GamesActive.set(interaction.user.id, game);
    SetActivity('blackjack', ActivityType.Playing);

    // const first_message_content = `okabot Blackjack | You bet ${GetEmoji('okash')} OKA**${bet}**\n-# Blackjack pays 3x, win pays 2x\n**okabot**: [ ?? ] ${GetCardThemed('cb', game.card_theme)}${GetCardThemed('cb', game.card_theme)}\n**you:** [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)} ${TallyCards(game.user) == 21 ? ':sparkles:' : ''}`;
    const msg_top = await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_TOP, interaction.okabot.translateable_locale, bet);
    const msg_okabot = await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_OKABOT, interaction.okabot.translateable_locale, `${game.dealer[0].value} + ??`, `${GetCardThemed(game.dealer[0].name, game.card_theme)}${GetCardThemed('cb', game.card_theme)}`);
    const msg_you = await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_YOU, interaction.okabot.translateable_locale, TallyCards(game.user), `${GetCardEmojis(game.user, game.card_theme)} ${TallyCards(game.user) == 21 ? ':sparkles:' : ''}`);
    const first_message_content = `${msg_top}\n${msg_okabot}\n${msg_you}`;

    let response;

    if ((LastGameFinished.has(interaction.user.id) && LastGameFinished.get(interaction.user.id)! + 5 > d.getTime()/1000) && !skip_cooldown) {
        response = await interaction.reply({
            content:await LangGetAutoTranslatedString(LANG_GAMES.ANY_COOLDOWN, interaction.okabot.translateable_locale),
            flags:[MessageFlags.SuppressNotifications]
        });

        await new Promise((resolve) => {
            setTimeout(resolve, Math.ceil((LastGameFinished.get(interaction.user.id)! + 5) - (d.getTime() / 1000))*1000);
        });

        response = await interaction.editReply({
            content: first_message_content,
            components: [
                TallyCards(game.user) == 21 ? new ActionRowBuilder().addComponents(game.buttons.stand_blackjack)
                    : (can_double_down ? new ActionRowBuilder().addComponents(game.buttons.hit, game.buttons.stand, game.buttons.dd) : new ActionRowBuilder().addComponents(game.buttons.hit, game.buttons.stand) ) as any
            ]
        });

        DoRandomDrops(await response.fetch());
    } else {
        response = await interaction.reply({
            content: first_message_content,
            components: [
                TallyCards(game.user) == 21 ? new ActionRowBuilder().addComponents(game.buttons.stand_blackjack)
                    : (can_double_down ? new ActionRowBuilder().addComponents(game.buttons.hit, game.buttons.stand, game.buttons.dd) : new ActionRowBuilder().addComponents(game.buttons.hit, game.buttons.stand) ) as any
            ],
            flags: [MessageFlags.SuppressNotifications]
        });

        DoRandomDrops(await response.fetch(), interaction.user);
    }

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;

    const collector = response.createMessageComponentCollector({ filter: collectorFilter, time: 120_000 });

    collector.on('collect', async (i) => {
        const n = new Date();

        game.expires = n.getTime() + 30_000; // add 30s before the game expires
        switch (i.customId) {
            case 'blackjack-hit':
                Hit(interaction, i);
                break;

            case 'blackjack-stand':
                Stand(interaction, i);
                break;

            case 'blackjack-double':
                Hit(interaction, i, true); // hit AND double down
                break;
        }
    });

    collector.on('end', async () => {
        CheckGameIdle(interaction);
    });
}

async function CheckGameIdle(interaction: ChatInputCommandInteraction) {
    const game = GamesActive.get(interaction.user.id);
    const now = new Date();

    // if game exists and the expiry time hasn't passed
    if (game && now.getTime() >= game.expires) {
        if (game.gameActive) {
            await interaction.editReply({ content: `*This incomplete blackjack game has expired. okabot will no longer respond to it. Your bet has been refunded.*` });
            AddToWallet(interaction.user.id, game.bet);
        }
        GamesActive.delete(interaction.user.id);
    } else if (game) {
        // wait 30s and check again
        setTimeout(() => CheckGameIdle(interaction), 30_000);
    }
}

async function Hit(interaction: ChatInputCommandInteraction, confirmation: any, double_down: boolean = false) {
    const game = GamesActive.get(interaction.user.id)!;

    if (!game) {
        const recovered_bet = BetRecovery.get(interaction.user.id);
        return confirmation.update({
            content: `:x: Something went wrong: game is undefined.\nIt looks like your bet was OKA**${recovered_bet}**, so that's what I'm going to refund you. If this is incorrect, please let a bot admin know.`,
            components: []
        });
    }

    if (double_down) {
        RemoveFromWallet(interaction.user.id, game.bet);
        game.bet += game.bet;
    }

    // deal a card to the user
    game.user.push(game.deck.shift()!);
    if (game.trackable_serial) UpdateTrackedItem(game.trackable_serial, {property:'dealt_cards', amount:1});

    const player_busted = TallyCards(game.user) > 21;
    const player_blackjack = TallyCards(game.user) == 21;
    const dealer_blackjack = TallyCards(game.dealer) == 21;

    if (player_busted) {
        const msg_top = await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_TOP, interaction.okabot.translateable_locale, game.bet);
        const msg_okabot = await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_OKABOT, interaction.okabot.translateable_locale, TallyCards(game.dealer), `${GetCardEmojis(game.dealer, game.card_theme)} ${dealer_blackjack ? ' :sparkles:' : ''}`);
        const msg_you = await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_YOU, interaction.okabot.translateable_locale, TallyCards(game.user), `${GetCardEmojis(game.user, game.card_theme)} ${TallyCards(game.user) == 21 ? ':sparkles:' : ''}`);
        const message_content = `${msg_top}\n${msg_okabot}\n${msg_you}\n${await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_BUST, interaction.okabot.translateable_locale)}`;

        await confirmation.update({
            content: message_content,
            components: []
        });

        if (GetWallet(interaction.user.id) == 0 && GetBank(interaction.user.id) == 0) GrantAchievement(interaction.user, Achievements.NO_MONEY, interaction.channel as TextChannel);

        AddCasinoLoss(interaction.user.id, game.bet, 'blackjack');
        WinStreak.set(interaction.user.id, 0);

        AddXP(interaction.user.id, interaction.channel as TextChannel, 10);

        const d = new Date();
        LastGameFinished.set(interaction.user.id, Math.ceil(d.getTime()/1000));

        GamesActive.delete(interaction.user.id);
    } else {
        // if we doubled down, you cannot hit again
        const msg_top = await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_TOP, interaction.okabot.translateable_locale, game.bet);
        const msg_okabot = await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_OKABOT, interaction.okabot.translateable_locale, `${game.dealer[0].value} + ??`, `${GetCardThemed(game.dealer[0].name, game.card_theme)}${GetCardThemed('cb', game.card_theme)}`);
        const msg_you = await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_YOU, interaction.okabot.translateable_locale, TallyCards(game.user), `${GetCardEmojis(game.user, game.card_theme)} ${TallyCards(game.user) == 21 ? ':sparkles:' : ''}`);
        const message_content = `${msg_top}\n${msg_okabot}\n${msg_you}`;

        await confirmation.update({
            content: message_content,
            components: [player_blackjack ? new ActionRowBuilder().addComponents(game.buttons.stand_blackjack) : (double_down ? new ActionRowBuilder().addComponents(game.buttons.stand) : new ActionRowBuilder().addComponents(game.buttons.hit, game.buttons.stand))]
        });
    }
}

async function Stand(interaction: ChatInputCommandInteraction, confirmation: any) {
    // await confirmation.deferUpdate();

    // get the game
    const game = GamesActive.get(confirmation.user.id)!;

    // dealer must get to 17 to stand
    let dealt = 0;
    while (TallyCards(game.dealer) < 17) {
        // add random card
        game.dealer.push(game.deck.shift()!);
        dealt++;
        game.okabot_has_hit = true;
    }
    if (game.trackable_serial) UpdateTrackedItem(game.trackable_serial, {property:'dealt_cards', amount:dealt});

    const dealer_bust: boolean = TallyCards(game.dealer) > 21;
    const win = dealer_bust || TallyCards(game.user) > TallyCards(game.dealer);
    const tie = !win && TallyCards(game.user) == TallyCards(game.dealer);
    const player_blackjack = TallyCards(game.user) == 21;
    const dealer_blackjack = TallyCards(game.dealer) == 21;

    // the player themselves cannot bust at this point

    let earned_xp = tie ? 5 : (win ? 15 : 10);
    if (player_blackjack) earned_xp += 5;

    let streak = WinStreak.get(interaction.user.id) || 0;
    if (win) streak++;

    const wouldve_been_drawn = `${await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_NEXT_PREVIEW, interaction.okabot.translateable_locale)} ${GetCardEmojis([game.deck.shift()!,game.deck.shift()!,game.deck.shift()!], game.card_theme)}`;
    const msg_top = await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_TOP, interaction.okabot.translateable_locale, game.bet);
    const msg_okabot = await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_OKABOT, interaction.okabot.translateable_locale, TallyCards(game.dealer), `${GetCardEmojis(game.dealer, game.card_theme)} ${dealer_blackjack ? ' :sparkles:' : ''}`);
    const msg_you = await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_YOU, interaction.okabot.translateable_locale, TallyCards(game.user), `${GetCardEmojis(game.user, game.card_theme)} ${TallyCards(game.user) == 21 ? ':sparkles:' : ''}`);
    const msg_streak = await LangGetAutoTranslatedString(LANG_GAMES.ANY_WIN_STREAK, interaction.okabot.translateable_locale, streak);

    await confirmation.update({
        content: `${msg_top}\
        \n${msg_okabot}\
        \n${msg_you}\
        \n\n${win?await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_WIN, interaction.okabot.translateable_locale, player_blackjack?game.bet*3:game.bet*2, earned_xp):
            (tie?(dealer_blackjack?await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_TIE_21, interaction.okabot.translateable_locale):
                    await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_TIE, interaction.okabot.translateable_locale)
                ):
                await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACK_LOSS, interaction.okabot.translateable_locale))}\
        \n${streak>1?msg_streak+'\n':''}${!game.okabot_has_hit&&!player_blackjack?wouldve_been_drawn:''}`, // <-- show what would've been drawn if no one drew
        components: []
    });

    if (win) {
        if (player_blackjack) {
            AddToWallet(confirmation.user.id, game.bet * 3);
            AddCasinoWin(confirmation.user.id, game.bet * 3, 'blackjack');
            GrantAchievement(interaction.user, Achievements.BLACKJACK, interaction.channel as TextChannel);
        }
        else {
            AddToWallet(confirmation.user.id, game.bet * 2);
            AddCasinoWin(confirmation.user.id, game.bet * 2, 'blackjack');
        }

        WinStreak.set(interaction.user.id, streak);

        if (game.bet == 12500) GrantAchievement(interaction.user, Achievements.MAX_WIN, interaction.channel as TextChannel);
    } else if (tie) {
        WinStreak.set(interaction.user.id, 0);
        if (player_blackjack) AddToWallet(confirmation.user.id, Math.floor(game.bet * 1.5));
        else AddToWallet(confirmation.user.id, game.bet);
    } else {
        WinStreak.set(interaction.user.id, 0);
        if (GetWallet(interaction.user.id) == 0 && GetBank(interaction.user.id) == 0) GrantAchievement(interaction.user, Achievements.NO_MONEY, interaction.channel as TextChannel);
        AddCasinoLoss(interaction.user.id, game.bet, 'blackjack');
    }

    
    AddXP(interaction.user.id, interaction.channel as TextChannel, earned_xp);

    const d = new Date();
    LastGameFinished.set(interaction.user.id, Math.ceil(d.getTime()/1000));
    
    game.gameActive = false;
    GamesActive.delete(interaction.user.id);
}

function ShuffleCards(array: Array<HandCard>) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
}

// wtf?
function CloneArray(array: Array<any>): Array<any> {
    const cloned: typeof array = [];

    array.forEach(item => {
        cloned.push(item);
    });

    return cloned;
}

/**
 * If the user asks if they should hit, do some fun
 * calculations and figure out whether they should or shouldn't.
 */
export async function CheckBlackjackSilly(message: Message) {
    if (!message.content.toLowerCase().includes('should i hit')) return;

    // get their game if they have one
    if (!GamesActive.has(message.author.id)) return;
    const game = GamesActive.get(message.author.id)!;

    if (TallyCards(game.user) == 21) return message.reply(":cat: Well, seeing as you've got a blackjack, no");

    const amount_to_bust = 21 - TallyCards(game.user);

    const deck: Array<HandCard> = CloneArray(game.deck);

    // put okabot's cards back in the deck so you can't cheat to figure out what he has
    for (const card of game.dealer) deck.push(card);

    let winning_cards = 0;
    let losing_cards = 0;

    for (const card of deck) {
        // if (card.name == 'ca' && amount_to_bust > 1) card.value = 1; else card.value = 11; // the else probably isn't necessary but it's nice to be able to see

        if (card.value > amount_to_bust) losing_cards++;
        if (card.value <= amount_to_bust) winning_cards++;
    }

    const chance = Math.round(winning_cards/44 * 100);
    let choice = "";

    if (chance <= 40) choice = "so this time I'd probably stand";
    if (chance > 40 && chance < 70) choice = Math.random()>0.5?"so I'd choose to hit":"but I'd choose to stand";
    if (chance >= 70) choice = "so I'd probably hit";

    if (winning_cards > losing_cards) return message.reply(`:cat: Hmmm... Looks like you have a ~${chance}% of winning, ${choice}`);
    if (losing_cards > winning_cards) return message.reply(`:cat: Hmmm... Looks like you have a ~${100-chance}% of losing, ${choice}`);
}


/*
*
* START BLACKJACK V2 (COMPONENTS V2 REWRITE)
*
* */



/**
 * Command handler for blackjack using components v2
 * @param interaction The interaction object from Discord.js
 */
export async function HandleCommandBlackjackV2(interaction: ChatInputCommandInteraction) {
    // if the locale isn't english or the user prefers to use the classic game display
    // non-english users can choose to force the components v2 version by setting the "classic" option to false
    // const locale_supported = interaction.locale == 'en-US' || interaction.locale == 'en-GB';
    const use_classic = interaction.options.getBoolean('classic') || false;
    if (use_classic) return SetupBlackjackMessage(interaction);

    // check for cooldowns
    const d = new Date();
    let cooldown = false;

    if (LastGameFinished.get(interaction.user.id) || 0 > (d.getTime() / 1000) + 7_000) cooldown = true;
    if (PassesActive.get(interaction.user.id) || 0 > d.getTime() / 1000) cooldown = false;

    // declare the reply up here
    // this is because the reply object
    // will be kinda weird if there is
    // a cooldown
    let reply;

    // start setup of blackjack game
    const bet = interaction.options.getNumber('bet', true);

    if (bet.toString().includes('.')) return interaction.reply({
        content:`:x: **${interaction.user.displayName}**, I don't have change!`,
        flags: [MessageFlags.SuppressNotifications]
    });

    const profile = GetUserProfile(interaction.user.id);
    const wallet = profile.okash.wallet;
    if (wallet < bet) return interaction.reply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have that much in your wallet!`,
        flags: [MessageFlags.SuppressNotifications]
    });

    RemoveFromWallet(interaction.user.id, bet);

    // shuffle deck of cards
    const deck: Array<HandCard> = CloneArray(DECK);
    ShuffleCards(deck);

    // create buttons
    const hitButton = new ButtonBuilder()
        .setCustomId('blackjack-hit')
        .setLabel(await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_BUTTON_HIT, interaction.okabot.translateable_locale))
        .setStyle(ButtonStyle.Primary);

    const standButton = new ButtonBuilder()
        .setCustomId('blackjack-stand')
        .setLabel(await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_BUTTON_STAND, interaction.okabot.translateable_locale))
        .setStyle(ButtonStyle.Secondary);

    const standButtonWin = new ButtonBuilder()
        .setCustomId('blackjack-stand')
        .setLabel(await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_BUTTON_BLACKJACK, interaction.okabot.translateable_locale))
        .setStyle(ButtonStyle.Success);

    const doubleDownButton = new ButtonBuilder()
        .setCustomId('blackjack-double')
        .setLabel(await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_BUTTON_DOUBLE, interaction.okabot.translateable_locale))
        .setStyle(ButtonStyle.Primary);

    // does the user have a trackable deck equipped?
    const trackable_serial = profile.customization.games.equipped_trackable_deck!='none'?profile.customization.games.equipped_trackable_deck:undefined;

    // create game object
    const game: BlackjackGame = {
        deck,
        dealer: [],
        user: [],
        bet,
        gameActive: true,
        expires: d.getTime() + 60_000,
        card_theme: profile.customization.games.card_deck_theme,
        trackable_serial,
        okabot_has_hit: false,
        buttons: {
            hit: hitButton,
            stand_blackjack: standButtonWin,
            stand: standButton,
            dd: doubleDownButton
        },
        language: interaction.okabot.translateable_locale
    }

    // deal two cards to okabot and user
    game.dealer.push(game.deck.shift()!, game.deck.shift()!);
    game.user.push(game.deck.shift()!, game.deck.shift()!);
    if (game.trackable_serial) UpdateTrackedItem(game.trackable_serial, {property:"dealt_cards",amount:4});

    // save game
    GamesActive.set(interaction.user.id, game);

    // activate cooldown if needed
    if (cooldown) {
        reply = await interaction.reply({
            components: [
                new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(await LangGetAutoTranslatedString(LANG_GAMES.ANY_COOLDOWN, game.language!))
                )
            ],
            flags: [MessageFlags.SuppressNotifications, MessageFlags.IsComponentsV2]
        });

        await new Promise((resolve) => setTimeout(resolve, LastGameFinished.get(interaction.user.id)! * 1000 - d.getTime()));
    }

    // split the creation of the container outside
    // of this function so it's not too messy
    const BlackjackContainer = await BuildBlackjackContainer(game, wallet - bet >= bet);

    if (cooldown) {
        reply = await interaction.editReply({
            components: [BlackjackContainer],
            flags:[MessageFlags.IsComponentsV2]
        });
    } else {
        reply = await interaction.reply({
            components: [BlackjackContainer],
            flags:[MessageFlags.IsComponentsV2]
        });
    }

    setTimeout(() => GameIdleCheckV2(interaction.user.id, reply), 60_000)

    // listen for buttons
    const collector = reply.createMessageComponentCollector({
        filter: (i: any) => i.user.id === interaction.user.id,
        time: 60_000
    });

    collector.on('collect', (i) => {
        switch (i.customId) {
            case 'blackjack-hit':
                HitV2(interaction, i as ButtonInteraction);
                break;
            
            case 'blackjack-stand':
                StandV2(interaction, i as ButtonInteraction);
                break;
                
            case 'blackjack-double':
                HitV2(interaction, i as ButtonInteraction, true);
                break;
        }
    });
}

async function GameIdleCheckV2(user_id: Snowflake, reply: any) {
    const game = GamesActive.get(user_id);
    if (!game) return;

    const now = (new Date()).getTime();

    if (now > game.expires) {
        reply.edit({
            components: [
                new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`⌛ This inactive blackjack game has expired.\nThe bet of ${GetEmoji(EMOJI.OKASH)} OKA**${game.bet}** was refunded.`)
                )
            ],
            flags: [MessageFlags.IsComponentsV2]
        });

        AddToWallet(user_id, game.bet);
        GamesActive.delete(user_id);
    } else {
        // add another 10 seconds before checking for expired games
        // if the game was still active when checked
        setTimeout(() => GameIdleCheckV2(user_id, reply), 10_000);
    }
}

async function HitV2(interaction: ChatInputCommandInteraction, i: ButtonInteraction, double_down = false) {
    const game = GamesActive.get(interaction.user.id)!;

    // did the user double down?
    if (double_down) {
        RemoveFromWallet(interaction.user.id, game.bet);
        game.bet = game.bet * 2;
    }

    // chose to hit, so deal a card to the user
    game.user.push(game.deck.shift()!);
    if (game.trackable_serial) UpdateTrackedItem(game.trackable_serial, {property:"dealt_cards",amount:1});

    // check if the user has bust
    if (TallyCards(game.user) > 21) return LoseV2(i, game, 'bust');

    // user hasn't bust
    // build new embed
    const BlackjackContainer = await BuildBlackjackContainer(game);
    
    // update message
    i.update({
        components: [BlackjackContainer],
        flags: [MessageFlags.IsComponentsV2]
    });
}

async function StandV2(interaction: ChatInputCommandInteraction, i: ButtonInteraction) {
    const game = GamesActive.get(interaction.user.id)!;

    // deal until okabot is at or above 17
    while (TallyCards(game.dealer) < 17) {
        game.dealer.push(game.deck.shift()!);
        if (game.trackable_serial) UpdateTrackedItem(game.trackable_serial, {property:"dealt_cards",amount:1});
    }

    // did okabot bust?
    if (TallyCards(game.dealer) > 21) {
        // yes, so user wins
        const streak = WinStreak.get(i.user.id) || 0;
        WinStreak.set(i.user.id, streak + 1);

        if (streak+1 == 2) GrantAchievement(i.user, Achievements.STREAK_2, i.client.channels.cache.get(i.channelId) as TextChannel);
        if (streak+1 == 5) GrantAchievement(i.user, Achievements.STREAK_5, i.client.channels.cache.get(i.channelId) as TextChannel);
        if (streak+1 == 10) GrantAchievement(i.user, Achievements.STREAK_10, i.client.channels.cache.get(i.channelId) as TextChannel);
        if (streak+1 == 25) GrantAchievement(i.user, Achievements.STREAK_25, i.client.channels.cache.get(i.channelId) as TextChannel);
        
        const BlackjackContainer = await BuildBlackjackContainer(game, false, 'win', i.user.id);
        
        // give the reward money!
        AddToWallet(i.user.id, game.bet * ((TallyCards(game.user) == 21)?3:2));
        AddXP(i.user.id, i.channel as TextChannel, TallyCards(game.user)==21?20:15);

        if (game.bet >= 12_500) GrantAchievement(i.user, Achievements.MAX_WIN, i.channel as TextChannel);
        
        // remove their game
        GamesActive.delete(i.user.id);

        // cooldown
        LastGameFinished.set(i.user.id, (new Date()).getTime()/1000);

        // update reply
        return await i.update({
            components: [BlackjackContainer],
            flags: [MessageFlags.IsComponentsV2]
        });
    }

    const user_total = TallyCards(game.user);
    const dealer_total = TallyCards(game.dealer);

    // okabot didn't bust, did we get less?
    if (user_total < dealer_total) return LoseV2(i, game, 'value');
    // did we get equal?
    if (user_total == dealer_total) return LoseV2(i, game, 'value');
    // we got more

    // must do streak before container
    const streak = WinStreak.get(i.user.id) || 0;
    WinStreak.set(i.user.id, streak + 1);

    if (streak+1 == 2) GrantAchievement(i.user, Achievements.STREAK_2, i.client.channels.cache.get(i.channelId) as TextChannel);
    if (streak+1 == 5) GrantAchievement(i.user, Achievements.STREAK_5, i.client.channels.cache.get(i.channelId) as TextChannel);
    if (streak+1 == 10) GrantAchievement(i.user, Achievements.STREAK_10, i.client.channels.cache.get(i.channelId) as TextChannel);
    if (streak+1 == 25) GrantAchievement(i.user, Achievements.STREAK_25, i.client.channels.cache.get(i.channelId) as TextChannel);

    // build new embed
    const BlackjackContainer = await BuildBlackjackContainer(game, false, 'win', i.user.id);
    AddCasinoWin(i.user.id, game.bet, 'blackjack');

    // update reply
    await i.update({
        components: [BlackjackContainer],
        flags: [MessageFlags.IsComponentsV2]
    });

    // achievement for max bet (remember max can be 25_000 due to dd)
    if (game.bet >= 12_500) GrantAchievement(i.user, Achievements.MAX_WIN, i.channel as TextChannel);

    // give the reward money!
    AddToWallet(i.user.id, game.bet * ((user_total == 21)?3:2));
    AddXP(i.user.id, i.channel as TextChannel, user_total==21?20:15);

    DoRandomDrops(await i.fetchReply(), i.user);

    // remove their game
    GamesActive.delete(i.user.id);

    // cooldown
    LastGameFinished.set(i.user.id, (new Date()).getTime()/1000);
}

async function LoseV2(i: ButtonInteraction, game: BlackjackGame, reason: 'bust' | 'value') {
    WinStreak.set(i.user.id, 0);
    console.log(i.user.id, 'streak now 0');

    // build embed
    const BlackjackContainer = await BuildBlackjackContainer(game, false, reason, i.user.id);

    // update interaction
    await i.update({
        components: [BlackjackContainer],
        flags: [MessageFlags.IsComponentsV2]
    });

    // did they tie?
    if (TallyCards(game.user) == TallyCards(game.dealer)) {
        // yes, return their bet
        AddToWallet(i.user.id, game.bet);
    } else {
        // didn't tie, so we add a blackjack loss to
        // the casino database
        AddCasinoLoss(i.user.id, game.bet, 'blackjack');
        if (GetWallet(i.user.id, true) == 0) GrantAchievement(i.user, Achievements.NO_MONEY, i.channel as TextChannel);
    }

    DoRandomDrops(await i.fetchReply(), i.user);

    // delete their game
    GamesActive.delete(i.user.id);

    // cooldown
    LastGameFinished.set(i.user.id, (new Date()).getTime()/1000);
}

async function BuildBlackjackContainer(game: BlackjackGame, can_double_down = false, gameover: 'no' | 'bust' | 'value' | 'win' = 'no', user_id?: Snowflake) {
    const BlackjackContainer = new ContainerBuilder();
    const Header = new TextDisplayBuilder().setContent([
        await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_TOP, game.language!),
        await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_BET, game.language!, game.bet)
    ].join('\n'));

    BlackjackContainer.addTextDisplayComponents(Header);

    let okabot_cards = `${GetCardThemed(game.dealer[0].name, game.card_theme)} ${GetCardThemed('cb', game.card_theme)}`;
    if (gameover != 'no') {
        // show all of okabot's cards if we end
        okabot_cards = GetCardEmojis(game.dealer, game.card_theme);
    }

    const CardDisplaysTexts = new TextDisplayBuilder().setContent([
        await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_OKABOT, game.language!, okabot_cards),
        await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_TOTAL, game.language!, TallyCards(game.dealer)),
        await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_YOU, game.language!, GetCardEmojis(game.user, game.card_theme)),
        await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_TOTAL, game.language!, TallyCards(game.user)),
    ].join('\n'));

    BlackjackContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    BlackjackContainer.addTextDisplayComponents(CardDisplaysTexts);

    const streak = WinStreak.get(user_id!) || 0;
    const streak_text = streak>1?await LangGetAutoTranslatedString(LANG_GAMES.ANY_WIN_STREAK, game.language!, streak):'';
    // console.log(streak);

    if (gameover == 'win') {
        BlackjackContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        BlackjackContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(TallyCards(game.user)==21?
                await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_WIN_BLACKJACK, game.language!, game.bet*3, streak_text)
                :
                await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_WIN, game.language!, game.bet*2, streak_text)
            ));
    } else if (gameover != 'no') {
        BlackjackContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        const tie = TallyCards(game.user) == TallyCards(game.dealer);

        BlackjackContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(gameover=='value'?
                (tie?
                    await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_TIED, game.language!)
                    :
                    await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_LOSS, game.language!)
                ) :
                await LangGetAutoTranslatedString(LANG_GAMES.BLACKJACKV2_BUST, game.language!)
            )
        );
    }

    const is_blackjack = TallyCards(game.user)==21;
    const default_buttons = [game.buttons.hit, game.buttons.stand];
    if (can_double_down) default_buttons.push(game.buttons.dd);

    if (gameover == 'no') {
        BlackjackContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        BlackjackContainer.addActionRowComponents(row => row.addComponents(
            is_blackjack?[game.buttons.stand_blackjack]:default_buttons
        ));
    }

    return BlackjackContainer;
}




export const BlackjackSlashCommand = new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play a game of blackjack for a chance at increasing your money!')
    .addNumberOption(option => option
        .setName('bet')
        .setRequired(true)
        .setDescription('The amount of okash to bet')
        .setMaxValue(12_500).setMinValue(1))
    .addBooleanOption(option => option
        .setName('classic')
        .setRequired(false)
        .setDescription('Use the classic blackjack game instead of the Components V2 version.'))