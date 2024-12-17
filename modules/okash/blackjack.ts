import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Message, MessageFlags, TextChannel, User } from "discord.js";
import { Logger } from "okayulogger";
import { AddToWallet, GetWallet, RemoveFromWallet } from "./wallet";
import { AddXP } from "../levels/onMessage";
import { DEV } from "../..";
import { CheckOkashRestriction, OKASH_ABILITY } from "../user/prefs";
import { GetEmoji } from "../../util/emoji";


const L = new Logger('blackjack');


interface HandCard {
    value: number, name: string
}

const CARDS: Array<HandCard> = [
    { value: 1, name: 'ca' },
    { value: 2, name: 'c2' },
    { value: 3, name: 'c3' },
    { value: 4, name: 'c4' },
    { value: 5, name: 'c5' },
    { value: 6, name: 'c6' },
    { value: 7, name: 'c7' },
    { value: 8, name: 'c8' },
    { value: 9, name: 'c9' },
    { value: 10, name: 'c10' },
    { value: 10, name: 'cr' } // redundant to have all the royalty
]

// 52-card deck
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

    { value: 10, name: 'cr' },
    { value: 10, name: 'cr' },
    { value: 10, name: 'cr' },
    { value: 10, name: 'cr' },
    // 48
    { value: 10, name: 'cr' },
    { value: 10, name: 'cr' },
    { value: 10, name: 'cr' },
    { value: 10, name: 'cr' },
    // 52
]

interface BlackjackGame {
    dealer: Array<HandCard>,
    user: Array<HandCard>,
    bet: number,
    gameActive: boolean,
    expires: number,
    deck: Array<HandCard>
}
const GamesActive = new Map<string, BlackjackGame>(); // user_id and game
const BetRecovery = new Map<string, number>(); // user_id and bet

function TallyCards(cards: Array<HandCard>): number {
    let total = 0;
    let aces = 0;

    // add up values and count aces
    for (const card of cards) {
        if (card.name == 'ca') {
            aces++;
        } else {
            total += card.value;
        }
    }

    // aces -- add 11 for each ace if it doesn't bust, otherwise add 1
    while (aces > 0) {
        if (total + 11 <= 21) {
            total += 11;
        } else {
            total += 1;
        }
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
    .setStyle(ButtonStyle.Secondary)

const row = new ActionRowBuilder()
    .addComponents(hitBtn, standBtn);

const row_willbust = new ActionRowBuilder()
    .addComponents(standBtn);



export async function SetupBlackjackMessage(interaction: ChatInputCommandInteraction) {
    if (GamesActive.has(interaction.user.id)) return interaction.reply({
        content: `:bangbang: Woah there, **${interaction.user.displayName}**! You've already got a blackjack game going!`
    });

    const result = await CheckOkashRestriction(interaction, OKASH_ABILITY.GAMBLE);
    if (result) return;

    const bet = interaction.options.getNumber('bet')!;

    const wallet = GetWallet(interaction.user.id);
    if (wallet < bet) return interaction.reply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have that much!`
    });


    RemoveFromWallet(interaction.user.id, bet);

    BetRecovery.set(interaction.user.id, bet);
    const d = new Date();

    let this_deck = CloneArray(DECK);
    ShuffleCards(this_deck);

    // create a blackjack game
    const game: BlackjackGame = {
        dealer: [],
        user: [],
        bet,
        gameActive: true,
        expires: d.getTime() + 120_000,
        deck: this_deck
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

    GamesActive.set(interaction.user.id, game);

    const response = await interaction.reply({
        content: `okabot Blackjack | Bet ${GetEmoji('okash')} OKA**${bet}** | Blackjack pays 3x, win pays 2x\n**DEALER**: [ ?? ]\n**__Y O U__**: [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)} ${TallyCards(game.user) == 21 ? '***Blackjack!***' : ''}`,
        components: [TallyCards(game.user) == 21 ? row_willbust : row as any],
        flags: [MessageFlags.SuppressNotifications]
    });

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

async function Hit(interaction: ChatInputCommandInteraction, confirmation: any) {
    const game = GamesActive.get(interaction.user.id)!;

    if (!game) {
        const recovered_bet = BetRecovery.get(interaction.user.id);
        return confirmation.update({
            content: `:x: Something went wrong: game is undefined.\nIt looks like your bet was OKA**${recovered_bet}**, so that's what I'm going to refund you. If this is incorrect, please let a bot admin know.`,
            components: []
        });
    }

    // deal a card to the user
    game.user.push(game.deck.shift()!);

    const player_busted = TallyCards(game.user) > 21;
    const player_blackjack = TallyCards(game.user) == 21;
    const dealer_blackjack = TallyCards(game.dealer) == 21;

    if (player_busted) {
        await confirmation.update({
            content: `okabot Blackjack | Bet ${GetEmoji('okash')} OKA**${game.bet}** | Blackjack pays 3x, win pays 2x\n**DEALER**: [ ${TallyCards(game.dealer)} ] ${GetCardEmojis(game.dealer)} ${dealer_blackjack ? ' ***Blackjack!***' : ''}\n**__Y O U__**: [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)}\n\nYou busted! **(+15XP)**`,
            components: []
        });

        AddXP(interaction.user.id, interaction.channel as TextChannel, 10);

        GamesActive.delete(interaction.user.id);
    } else {
        await confirmation.update({
            content: `okabot Blackjack | Bet ${GetEmoji('okash')} OKA**${game.bet}** | Blackjack pays 3x, win pays 2x\n**DEALER**: [ ?? ]\n**__Y O U__**: [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)} ${player_blackjack ? ' ***Blackjack!***' : ''}`,
            components: [player_blackjack ? row_willbust : row]
        });
    }
}

async function Stand(interaction: ChatInputCommandInteraction, confirmation: any) {
    // await confirmation.deferUpdate();

    // get the game
    const game = GamesActive.get(confirmation.user.id)!;

    // dealer must get to 17 to stand
    while (TallyCards(game.dealer) < 17) {
        // add random card
        game.dealer.push(game.deck.shift()!);
    }

    const dealer_bust: boolean = TallyCards(game.dealer) > 21;
    const win = dealer_bust || TallyCards(game.user) > TallyCards(game.dealer);
    const tie = !win && TallyCards(game.user) == TallyCards(game.dealer);
    const player_blackjack = TallyCards(game.user) == 21;
    const dealer_blackjack = TallyCards(game.dealer) == 21;

    // the player themselves cannot bust at this point

    let earned_xp = tie ? 5 : (win ? 15 : 10);
    if (player_blackjack) earned_xp += 5;

    await confirmation.update({
        content: `okabot Blackjack | Bet ${GetEmoji('okash')} OKA**${game.bet}** | Blackjack pays 3x, win pays 2x\
        \n**DEALER**: [ ${TallyCards(game.dealer)} ] ${GetCardEmojis(game.dealer)} ${dealer_blackjack ? ' ***Blackjack!***' : ''}\
        \n**__Y O U__**: [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)} ${player_blackjack ? ' ***Blackjack!***' : ''}\
        \n\nYou ${tie ? 'tied!' : (win ? 'won ' + GetEmoji('okash') + ' OKA**' + game.bet * (player_blackjack ? 3 : 2) + '**!' : 'lost!')} **(+${earned_xp}XP)**`,
        components: []
    });

    if (win) {
        if (player_blackjack) AddToWallet(confirmation.user.id, game.bet * 3);
        else AddToWallet(confirmation.user.id, game.bet * 2);
    } else if (tie) {
        if (player_blackjack) AddToWallet(confirmation.user.id, Math.floor(game.bet * 1.5));
        else AddToWallet(confirmation.user.id, game.bet * 1);
    }

    AddXP(interaction.user.id, interaction.channel as TextChannel, earned_xp);
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