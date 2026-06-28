/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    ContainerBuilder,
    MessageFlags,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SlashCommandBuilder,
    Snowflake,
    TextChannel,
    TextDisplayBuilder
} from "discord.js";
// import {Logger} from "okayulogger";
import {AddToWallet, GetWallet, RemoveFromWallet} from "../wallet";
import {AddXP} from "../../levels/onMessage";
import {GetUserProfile} from "../../user/prefs";
import {GetEmoji} from "../../../util/emoji";
import {Achievements, GrantAchievement} from "../../passive/achievement";
import {AddCasinoLoss, AddCasinoWin} from "../casinodb";
import {CUSTOMIZATION_UNLOCKS} from "../items";
import {UpdateTrackedItem} from "../trackedItem";
import {DoRandomDrops} from "../../passive/onMessage";
import {CheckGambleLock, SetGambleLock} from "./_lock";
import {CheckFeatureAvailability, ServerFeature} from "../../system/serverPrefs";
import {
    CompleteDailyMission,
    CurrentMissions,
    DAILY_MISSIONS_EASY, DAILY_MISSIONS_HARD,
    DAILY_MISSIONS_INTERMEDIATE, TrackedItemCounters
} from "../../tasks/dailyMissions";
import {t} from "../../i18n/translation";

// const L = new Logger('blackjack');


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
    language?: string,
    doubled_down?: boolean,
}

// user_id and game
const GamesActive = new Map<string, BlackjackGame>();
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

function ShuffleCards(array: Array<HandCard>) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        const randomIndex = Math.floor(Math.random() * currentIndex);
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
    // const use_classic = interaction.options.getBoolean('classic') || false;
    // if (use_classic) return SetupBlackjackMessage(interaction);

    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.blackjack)) return interaction.reply({
        content: await t('system.errors.command.disabled', interaction.okabot.translateable_locale)
    });

    await interaction.deferReply();

    if (CheckGambleLock(interaction.user.id)) return interaction.editReply({
        content: await t('games.gamble_locked', interaction.okabot.translateable_locale, {name: interaction.user.displayName})
    });

    // check for cooldowns
    const d = new Date();
    const now = Date.now(); // ms
    const last = LastGameFinished.get(interaction.user.id) || 0;
    const passExpiresAt = (PassesActive.get(interaction.user.id) || 0) * 1000; // convert to ms

    let cooldown = (now - last < 7000); // less than 7 seconds since last game
    if (passExpiresAt > now) cooldown = false; // override with active pass

    // declare the reply up here
    // this is because the reply object
    // will be kinda weird if there is
    // a cooldown
    let reply;

    // start setup of blackjack game
    const bet = interaction.options.getNumber('bet', true);

    if (bet.toString().includes('.')) return interaction.editReply({
        content: await t('games.blackjack.bet_float', interaction.okabot.translateable_locale, {name: interaction.user.displayName})
    });

    const profile = GetUserProfile(interaction.user.id);
    const wallet = profile.okash.wallet;
    if (wallet < bet) return interaction.editReply({
        content: await t('games.not_enough_okash', interaction.okabot.translateable_locale, {name: interaction.user.displayName})
    });

    RemoveFromWallet(interaction.user.id, bet);
    SetGambleLock(interaction.user.id, true);

    // shuffle deck of cards
    const deck: Array<HandCard> = CloneArray(DECK);
    ShuffleCards(deck);

    // create buttons
    const hitButton = new ButtonBuilder()
        .setCustomId('blackjack-hit')
        .setLabel(await t('games.blackjack.buttons.hit', interaction.okabot.translateable_locale))
        .setStyle(ButtonStyle.Primary)
        .setEmoji(GetCardThemed('cb', profile.customization.games.card_deck_theme));

    const standButton = new ButtonBuilder()
        .setCustomId('blackjack-stand')
        .setLabel(await t('games.blackjack.buttons.stand', interaction.okabot.translateable_locale))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🛑');

    const standButtonWin = new ButtonBuilder()
        .setCustomId('blackjack-stand')
        .setLabel(await t('games.blackjack.buttons.stand', interaction.okabot.translateable_locale))
        .setStyle(ButtonStyle.Success)
        .setEmoji('✨');

    const doubleDownButton = new ButtonBuilder()
        .setCustomId('blackjack-double')
        .setLabel(await t('games.blackjack.buttons.double', interaction.okabot.translateable_locale))
        .setStyle(ButtonStyle.Primary)
        .setEmoji('‼️');

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
    if (game.trackable_serial) UpdateTrackedItem(game.trackable_serial, {property:"dealt_cards",amount:4}, interaction.channel as TextChannel);
    if (
        game.user.length === 2 &&
        game.user[0].value === 1 && game.user[0].name === 'ca' &&
        game.user[1].value === 1 && game.user[1].name === 'ca'
    ) GrantAchievement(interaction.user, Achievements.TWO_ACES, interaction.channel as TextChannel);

    // save game
    GamesActive.set(interaction.user.id, game);

    // activate cooldown if needed
    if (cooldown) {
        // L.debug(`cooldown is ${LastGameFinished.get(interaction.user.id)! - d.getTime()}ms`) <-- no
        reply = await interaction.editReply({
            components: [
                new ContainerBuilder().addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(await t('games.blackjack.cooldown', game.language!))
                )
            ],
            flags: [MessageFlags.IsComponentsV2]
        });

        await new Promise((resolve) => setTimeout(resolve, LastGameFinished.get(interaction.user.id)! + 7_000 - (new Date()).getTime() ));
    }

    // split the creation of the container outside
    // of this function so it's not too messy
    const BlackjackContainer = await BuildBlackjackContainer(game, wallet - bet >= bet);

    reply = await interaction.editReply({
        components: [BlackjackContainer],
        flags:[MessageFlags.IsComponentsV2]
    });

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
                    new TextDisplayBuilder().setContent(await t('games.blackjack.game_expired', game.language))
                )
            ],
            flags: [MessageFlags.IsComponentsV2]
        });

        AddToWallet(user_id, game.bet);
        GamesActive.delete(user_id);
        SetGambleLock(user_id, false);
        WinStreak.set(user_id, 0); // idling and expiring a game could potentially be abused to get high winstreaks
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
        game.doubled_down = true;
        GamesActive.set(interaction.user.id, game);
    }

    // chose to hit, so deal a card to the user
    game.user.push(game.deck.shift()!);
    if (game.trackable_serial) UpdateTrackedItem(game.trackable_serial, {property:"dealt_cards",amount:1}, interaction.channel as TextChannel);
    if (double_down && game.user.at(-1)!.value == 4) GrantAchievement(interaction.user, Achievements.TWO_BY_FOUR, interaction.channel as TextChannel);

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
        if (game.trackable_serial) UpdateTrackedItem(game.trackable_serial, {property:"dealt_cards",amount:1}, interaction.channel as TextChannel);
    }

    const user_total = TallyCards(game.user);
    const dealer_total = TallyCards(game.dealer);

    // did okabot bust?
    if (dealer_total > 21) {
        // yes, so user wins
        const streak = WinStreak.get(i.user.id) || 0;
        WinStreak.set(i.user.id, streak + 1);
        console.log(`Blackjack winstreak is now ${streak+1}.`);

        if (streak+1 == 2) GrantAchievement(i.user, Achievements.STREAK_2, i.client.channels.cache.get(i.channelId) as TextChannel);
        if (streak+1 == 5) GrantAchievement(i.user, Achievements.STREAK_5, i.client.channels.cache.get(i.channelId) as TextChannel);
        if (streak+1 == 10) GrantAchievement(i.user, Achievements.STREAK_10, i.client.channels.cache.get(i.channelId) as TextChannel);
        // if (streak+1 == 25) GrantAchievement(i.user, Achievements.STREAK_25, i.client.channels.cache.get(i.channelId) as TextChannel);

        if (streak+1 == 3 && CurrentMissions.easy.selected == DAILY_MISSIONS_EASY.GAMBLE_STREAK_3) CompleteDailyMission(interaction.user, 'e', interaction.channel as TextChannel);
        if (streak+1 == 5 && CurrentMissions.intermediate.selected == DAILY_MISSIONS_INTERMEDIATE.GAMBLE_STREAK_5) CompleteDailyMission(interaction.user, 'i', interaction.channel as TextChannel);
        if (streak+1 == 7 && CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.GAMBLE_STREAK_7) CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);
        
        const BlackjackContainer = await BuildBlackjackContainer(game, false, 'win', i.user.id);
        
        // give the reward money!
        AddToWallet(i.user.id, game.bet * ((TallyCards(game.user) == 21)?3:2));
        AddXP(i.user.id, i.channel as TextChannel, TallyCards(game.user)==21?20:15);

        if (game.bet >= 12_500) {
            GrantAchievement(i.user, Achievements.MAX_WIN, i.channel as TextChannel);

            if (CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.GAMBLE_WIN_MAX)
                CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);
        }

        if (game.bet * ((TallyCards(game.user) == 21)?3:2) >= 2500 && CurrentMissions.intermediate.selected == DAILY_MISSIONS_INTERMEDIATE.GAMBLE_WIN_2500)
            CompleteDailyMission(interaction.user, 'i', interaction.channel as TextChannel);

        if (CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.BLACKJACK_21 && user_total == 21)
            CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);

        DoDailyTrackableCheck(interaction, game);

        // remove their game
        GamesActive.delete(i.user.id);
        SetGambleLock(i.user.id, false);

        // cooldown
        LastGameFinished.set(i.user.id, (new Date()).getTime());

        // update reply
        return await i.update({
            components: [BlackjackContainer],
            flags: [MessageFlags.IsComponentsV2]
        });
    }

    // okabot didn't bust, did we get less?
    if (user_total < dealer_total) return LoseV2(i, game, 'value');
    // did we get equal?
    if (user_total == dealer_total) return LoseV2(i, game, 'value');
    // we got more

    // must do streak before container
    const streak = WinStreak.get(i.user.id) || 0;
    WinStreak.set(i.user.id, streak + 1);
    console.log(`Blackjack winstreak is now ${streak+1}.`);

    if (streak+1 == 2) GrantAchievement(i.user, Achievements.STREAK_2, i.client.channels.cache.get(i.channelId) as TextChannel);
    if (streak+1 == 5) GrantAchievement(i.user, Achievements.STREAK_5, i.client.channels.cache.get(i.channelId) as TextChannel);
    if (streak+1 == 10) GrantAchievement(i.user, Achievements.STREAK_10, i.client.channels.cache.get(i.channelId) as TextChannel);
    // if (streak+1 == 25) GrantAchievement(i.user, Achievements.STREAK_25, i.client.channels.cache.get(i.channelId) as TextChannel);

    if (streak+1 == 3 && CurrentMissions.easy.selected == DAILY_MISSIONS_EASY.GAMBLE_STREAK_3) CompleteDailyMission(interaction.user, 'e', interaction.channel as TextChannel);
    if (streak+1 == 5 && CurrentMissions.intermediate.selected == DAILY_MISSIONS_INTERMEDIATE.GAMBLE_STREAK_5) CompleteDailyMission(interaction.user, 'i', interaction.channel as TextChannel);
    if (streak+1 == 7 && CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.GAMBLE_STREAK_7) CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);

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
    if (user_total == 21) GrantAchievement(i.user, Achievements.BLACKJACK, i.channel as TextChannel);

    if (CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.BLACKJACK_21 && user_total == 21)
        CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);

    if (TallyCards([game.user[0],game.user[1],game.dealer[0],game.dealer[1]]) == 21) GrantAchievement(i.user, Achievements.SHARED_21, i.channel as TextChannel);

    // give the reward money!
    AddToWallet(i.user.id, game.bet * ((user_total == 21)?3:2));
    AddXP(i.user.id, i.channel as TextChannel, user_total==21?20:15);

    DoRandomDrops(await i.fetchReply(), i.user);

    DoDailyTrackableCheck(interaction, game);

    // remove their game
    GamesActive.delete(i.user.id);
    SetGambleLock(i.user.id, false);

    // cooldown
    LastGameFinished.set(i.user.id, (new Date()).getTime());
}

async function LoseV2(i: ButtonInteraction, game: BlackjackGame, reason: 'bust' | 'value') {


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
        WinStreak.set(i.user.id, 0);
        // console.log(i.user.id, 'streak now 0');
    }

    if (TallyCards(game.user) + TallyCards(game.dealer) == 21) GrantAchievement(i.user, Achievements.SHARED_21, i.channel as TextChannel);

    AddXP(i.user.id, i.channel as TextChannel, 10);
    DoRandomDrops(await i.fetchReply(), i.user);

    DoDailyTrackableCheck(i, game);

    // delete their game
    GamesActive.delete(i.user.id);
    SetGambleLock(i.user.id, false);

    // cooldown
    LastGameFinished.set(i.user.id, (new Date()).getTime());
}

async function BuildBlackjackContainer(game: BlackjackGame, can_double_down = false, gameover: 'no' | 'bust' | 'value' | 'win' = 'no', user_id?: Snowflake) {
    const BlackjackContainer = new ContainerBuilder();
    const Header = new TextDisplayBuilder().setContent([
        await t('games.blackjack.top', game.language!, {royalty: GetCardThemed('cr', game.card_theme), ace: GetCardThemed('ca', game.card_theme)}),
        await t('games.blackjack.bet', game.language!, {bet: game.bet})
    ].join('\n'));

    BlackjackContainer.addTextDisplayComponents(Header);

    let okabot_cards = `${GetCardThemed(game.dealer[0].name, game.card_theme)} ${GetCardThemed('cb', game.card_theme)}`;
    if (gameover != 'no') {
        // show all of okabot's cards if we end
        okabot_cards = GetCardEmojis(game.dealer, game.card_theme);
    }

    const CardDisplaysTexts = new TextDisplayBuilder().setContent([
        await t('games.blackjack.okabot_cards', game.language!, {cards: okabot_cards}),
        await t('games.blackjack.okabot_total', game.language!, {total: gameover=='no'?`${game.dealer[0].value} + ??`:TallyCards(game.dealer)}),
        await t('games.blackjack.you_cards', game.language!, {cards: GetCardEmojis(game.user, game.card_theme)}),
        await t('games.blackjack.you_total', game.language!, {total: TallyCards(game.user)}),
    ].join('\n'));

    BlackjackContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    BlackjackContainer.addTextDisplayComponents(CardDisplaysTexts);

    const streak = WinStreak.get(user_id!) || 0;
    const streak_text = streak>1?await t('games.streak', game.language!, {streak}):'';
    // console.log(streak);

    if (gameover == 'win') {
        BlackjackContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        BlackjackContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(TallyCards(game.user)==21?
                await t('games.blackjack.result.blackjack', game.language!, {amount: game.bet * 3})
                :
                await t('games.blackjack.result.win', game.language!, {amount: game.bet * 2})
            ));

            if ((WinStreak.get(user_id || '0') || 0) > 1) {
                BlackjackContainer.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(streak_text)
                )
            }
    } else if (gameover != 'no') {
        BlackjackContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        const tie = TallyCards(game.user) == TallyCards(game.dealer);

        BlackjackContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(gameover=='value'?
                (tie?
                    await t('games.blackjack.result.tie', game.language!)
                    :
                    await t('games.blackjack.result.lost', game.language!)
                ) :
                await t('games.blackjack.result.bust', game.language!)
            )
        );

        if ((WinStreak.get(user_id || '0') || 0) > 1 && (gameover != 'bust') && (gameover != 'value') && (gameover != 'value')) {
            BlackjackContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(streak_text)
            )
        }
    }

    const is_blackjack = TallyCards(game.user)==21;
    const default_buttons = [game.buttons.hit, game.buttons.stand];
    if (can_double_down) default_buttons.push(game.buttons.dd);

    if (gameover == 'no') {
        BlackjackContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

        BlackjackContainer.addActionRowComponents(row => row.addComponents(
            is_blackjack?[game.buttons.stand_blackjack]:(game.doubled_down?[game.buttons.stand]:default_buttons)
        ));
    }

    return BlackjackContainer;
}

function DoDailyTrackableCheck(interaction: ChatInputCommandInteraction | ButtonInteraction, game: BlackjackGame) {
    if (CurrentMissions.intermediate.selected == DAILY_MISSIONS_INTERMEDIATE.USE_TRACKED_ITEM_10 || CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.USE_TRACKED_ITEM_30) {
        const profile = GetUserProfile(interaction.user.id);
        if (TrackedItemCounters.has(interaction.user.id) && TrackedItemCounters.get(interaction.user.id)!.some(t => t.uuid == profile.customization.games.equipped_trackable_deck)) {
            const current = TrackedItemCounters.get(interaction.user.id)!;
            current.find(t => t.uuid == profile.customization.games.equipped_trackable_deck)!.count += game.user.length + game.dealer.length;
            TrackedItemCounters.set(interaction.user.id, current);
            console.log('new value:', current.find(t => t.uuid == profile.customization.games.equipped_trackable_deck));

            const count = current.find(t => t.uuid == profile.customization.games.equipped_trackable_deck)!.count;

            if (count >= 10 && CurrentMissions.intermediate.selected == DAILY_MISSIONS_INTERMEDIATE.USE_TRACKED_ITEM_10)
                CompleteDailyMission(interaction.user, 'i', interaction.channel as TextChannel);

            if (count >= 30 && CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.USE_TRACKED_ITEM_30)
                CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);
        } else {
            if (!TrackedItemCounters.has(interaction.user.id)) {
                TrackedItemCounters.set(interaction.user.id, [{
                    count: game.user.length + game.dealer.length,
                    type: 'deck',
                    uuid: profile.customization.games.equipped_trackable_deck
                }]);
            } else {
                const current = TrackedItemCounters.get(interaction.user.id)!;
                current.push({
                    count: game.user.length + game.dealer.length,
                    uuid: profile.customization.games.equipped_trackable_deck,
                    type: 'deck',
                })
                TrackedItemCounters.set(interaction.user.id, current);
            }
        }
    }
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