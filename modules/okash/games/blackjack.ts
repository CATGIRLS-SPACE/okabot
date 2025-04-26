import {
    ActionRowBuilder,
    ActivityType,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Message,
    MessageFlags,
    SlashCommandBuilder,
    Snowflake,
    TextChannel
} from "discord.js";
import {Logger} from "okayulogger";
import {AddToWallet, GetBank, GetWallet, RemoveFromWallet} from "../wallet";
import {AddXP} from "../../levels/onMessage";
import {CheckOkashRestriction, GetUserProfile, OKASH_ABILITY} from "../../user/prefs";
import {GetEmoji} from "../../../util/emoji";
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
    trackable_serial?: string
}

// user_id and game
const GamesActive = new Map<string, BlackjackGame>();
// user_id and bet
const BetRecovery = new Map<string, number>();
// user_id and time(d.getTime()/1000)
const LastGameFinished = new Map<string, number>();
// user_id & expiration (epoch sec)
export const PassesActive = new Map<Snowflake, number>();

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

function GetCardEmojis(hand: Array<HandCard>) {
    let final = '';

    hand.forEach(card => {
        if (card.name === 'ca') final += GetEmoji('ca');
        else if (card.name === 'cr') final += GetEmoji('cr');
        else final += GetEmoji(`${card.name}`);
    });

    return final;
}


const hitBtn = new ButtonBuilder()
    .setCustomId('blackjack-hit')
    .setLabel('Hit!')
    .setStyle(ButtonStyle.Primary);

const standBtn = new ButtonBuilder()
    .setCustomId('blackjack-stand')
    .setLabel('Stand!')
    .setStyle(ButtonStyle.Secondary);

const mustStandBtn = new ButtonBuilder()
    .setCustomId('blackjack-stand')
    .setLabel('Stand!')
    .setStyle(ButtonStyle.Secondary);

const mustStandBtnWin = new ButtonBuilder()
    .setCustomId('blackjack-stand')
    .setLabel('✨ Stand!')
    .setStyle(ButtonStyle.Success);

const doubleDownButton = new ButtonBuilder()
    .setCustomId('blackjack-double')
    .setLabel('Double Down!')
    .setStyle(ButtonStyle.Primary);

const row = new ActionRowBuilder()
    .addComponents(hitBtn, standBtn);

const row_can_double = new ActionRowBuilder()
    .addComponents(hitBtn, standBtn, doubleDownButton);

const row_willbust = new ActionRowBuilder()
    .addComponents(mustStandBtn);

const row_blackjack = new ActionRowBuilder()
    .addComponents(mustStandBtnWin);


function GetCardThemed(id: string, theme: CUSTOMIZATION_UNLOCKS) {
    const themes: {[key:number]: string} = {12:'',13:'_t',14:'_s'};
    return GetEmoji(`${id}${themes[theme]}`);
}

export async function SetupBlackjackMessage(interaction: ChatInputCommandInteraction) {
    if (GamesActive.has(interaction.user.id)) return interaction.reply({
        content: `:bangbang: Woah there, **${interaction.user.displayName}**! You've already got a blackjack game going!`,
        flags: [MessageFlags.SuppressNotifications]
    });

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
        trackable_serial: trackable=='none'?undefined:trackable
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

    const first_message_content = `okabot Blackjack | You bet ${GetEmoji('okash')} OKA**${bet}**\n-# Blackjack pays 3x, win pays 2x\n**okabot**: [ ?? ] ${GetCardThemed('cb', game.card_theme)}${GetCardThemed('cb', game.card_theme)}\n**you:** [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)} ${TallyCards(game.user) == 21 ? ':sparkles:' : ''}`;
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
                TallyCards(game.user) == 21 ? row_blackjack
                    : (can_double_down ? row_can_double : row ) as any
            ]
        });

        DoRandomDrops(await response.fetch());
    } else {
        response = await interaction.reply({
            content: first_message_content,
            components: [
                TallyCards(game.user) == 21 ? row_blackjack
                : (can_double_down ? row_can_double : row ) as any
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
        await confirmation.update({
            content: `okabot Blackjack | You bet ${GetEmoji('okash')} OKA**${game.bet}**\n-# Blackjack pays 3x, win pays 2x\n**okabot**: [ ${TallyCards(game.dealer)} ] ${GetCardEmojis(game.dealer)} ${dealer_blackjack ? ' :sparkles:' : ''}\n**you:** [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)}\n\nYou busted! **(+10XP)**`,
            components: []
        });

        if (GetWallet(interaction.user.id) == 0 && GetBank(interaction.user.id) == 0) GrantAchievement(interaction.user, Achievements.NO_MONEY, interaction.channel as TextChannel);

        AddCasinoLoss(interaction.user.id, game.bet, 'blackjack');

        AddXP(interaction.user.id, interaction.channel as TextChannel, 10);

        const d = new Date();
        LastGameFinished.set(interaction.user.id, Math.ceil(d.getTime()/1000));

        GamesActive.delete(interaction.user.id);
    } else {
        // if we doubled down, you cannot hit again

        await confirmation.update({
            content: `okabot Blackjack | You bet ${GetEmoji('okash')} OKA**${game.bet}** \n-# Blackjack pays 3x, win pays 2x\n**okabot**: [ ?? ] ${GetCardThemed('cb', game.card_theme)}${GetCardThemed('cb', game.card_theme)}\n**you:** [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)} ${player_blackjack ? ' :sparkles:' : ''}`,
            components: [player_blackjack || double_down ? row_willbust : row]
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

    const wouldve_been_drawn = `Had you hit, you would've drawn ${GetCardEmojis([game.deck.shift()!,game.deck.shift()!,game.deck.shift()!])}`;

    await confirmation.update({
        content: `okabot Blackjack | You bet ${GetEmoji('okash')} OKA**${game.bet}**\n-# Blackjack pays 3x, win pays 2x\
        \n**okabot**: [ ${TallyCards(game.dealer)} ] ${GetCardEmojis(game.dealer)} ${dealer_blackjack ? ' :sparkles:' : ''}\
        \n**you:** [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)} ${player_blackjack ? ' :sparkles:' : ''}\
        \n\nYou ${tie ? `tied!${player_blackjack?'\n-# You got a blackjack, but we tied. I know this is infuriating, so I refunded you 1.5x your bet.':''}` : (win ? 'won ' + GetEmoji('okash') + ' OKA**' + game.bet * (player_blackjack ? 3 : 2) + '**!' : 'lost!')} **(+${earned_xp}XP)**\
        \n${!game.okabot_has_hit?wouldve_been_drawn:''}`, // <-- show what would've been drawn if no one drew
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


        if (game.bet == 5000) GrantAchievement(interaction.user, Achievements.MAX_WIN, interaction.channel as TextChannel);
    } else if (tie) {
        if (player_blackjack) AddToWallet(confirmation.user.id, Math.floor(game.bet * 1.5));
        else AddToWallet(confirmation.user.id, game.bet);
    } else {
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


export const BlackjackSlashCommand = new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play a game of blackjack for a chance at increasing your money!')
    .addNumberOption(option => option
        .setName('bet')
        .setRequired(true)
        .setDescription('The amount of okash to bet')
        .setMaxValue(5_000).setMinValue(1))