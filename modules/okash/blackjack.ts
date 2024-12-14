import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Message, User } from "discord.js";
import { Logger } from "okayulogger";
import { AddToWallet } from "./wallet";


const L = new Logger('blackjack');


enum CARD {
    ACE = 1,
    TWO = 2,
    THREE = 3,
    FOUR = 4,
    FIVE = 5,
    SIX = 6,
    SEVEN = 7,
    EIGHT = 8,
    NINE = 9,
    TEN = 10,
    ROYALTY = 10 // redundant to have all the royalty
}

interface BlackjackGame {
    dealer: Array<CARD>,
    user: Array<CARD>,
    bet: number,
    gameActive: boolean
}

const UsersActive = new Map<string, boolean>(); // user_id 
const GamesActive = new Map<string, BlackjackGame>(); // user_id and game


function TallyCards(cards: Array<CARD>): number {
    let total = 0;
    let aces = 0;

    // add up values and count aces
    for (const card of cards) {
        if (card === CARD.ACE) {
            aces++;
        } else {
            total += card;
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



export async function SetupBlackjackMessage(interaction: ChatInputCommandInteraction) {
    const bet = interaction.options.getNumber('bet')!;

    // create a blackjack game
    const game: BlackjackGame = {
        dealer: [],
        user: [],
        bet,
        gameActive: true
    }

    // dealer gets two cards at first:
    game.dealer.push(
        Math.floor(Math.random() * 11) + 1, 
        Math.floor(Math.random() * 11) + 1
    );

    // player also gets two cards
    game.user.push(
        Math.floor(Math.random() * 11) + 1, 
        Math.floor(Math.random() * 11) + 1
    );

    GamesActive.set(interaction.user.id, game);

    const response = await interaction.reply({
        content:`**(BETA)** Blackjack | Bet <:okash:1315058783889657928> OKA**${bet}** | Blackjack pays 3x, win pays 2x\n**DEALER**: [ ?? ]\n**__Y O U__**: [ ${TallyCards(game.user)} ]`,
        components: [row as any]
    });

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;


    try {
        const confirmation = await response.awaitMessageComponent({filter: collectorFilter, time: 60_000});

        L.info(confirmation.customId);

        switch (confirmation.customId) {
            case 'blackjack-hit':
                Hit(interaction, confirmation);
                break;
        
            case 'blackjack-stand':
                Stand(interaction, confirmation);
                break;
        }
    } catch (e) {
        await interaction.editReply({content:`*This blackjack game has expired. okabot will no longer respond to it.*`});
    }
}


async function Hit(interaction: ChatInputCommandInteraction, confirmation: any) {
    const game = GamesActive.get(interaction.user.id)!;
    
    // deal a card to the user
    game.user.push(Math.floor(Math.random() * 11) + 1);

    const player_busted = TallyCards(game.user) > 21;
    const player_blackjack = TallyCards(game.user) == 21;
    const dealer_blackjack = TallyCards(game.dealer) == 21;

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;

    if (player_busted) {
        await confirmation.update({
            content:`**(BETA)** Blackjack | Bet <:okash:1315058783889657928> OKA**${game.bet}** | Blackjack pays 3x, win pays 2x\n**DEALER**: [ ${TallyCards(game.dealer)} ] ${dealer_blackjack?' ***Blackjack!***':''}\n**__Y O U__**: [ ${TallyCards(game.user)} ] ${player_blackjack?' ***Blackjack!***':''}\n\nYou busted!`,
            components: []
        });
    } else {
        const response = await confirmation.update({
            content:`**(BETA)** Blackjack | Bet <:okash:1315058783889657928> OKA**${game.bet}** | Blackjack pays 3x, win pays 2x\n**DEALER**: [ ?? ]\n**__Y O U__**: [ ${TallyCards(game.user)} ] ${player_blackjack?' ***Blackjack!***':''}`,
            components: [row as any]
        });

        const conf = await response.awaitMessageComponent({filter: collectorFilter, time: 60_000});

        switch (conf.customId) {
            case 'blackjack-hit':
                Hit(interaction, confirmation);
                break;
        
            case 'blackjack-stand':
                Stand(interaction, confirmation);
                break;
        }
    }
}

async function Stand(interaction: ChatInputCommandInteraction, confirmation: any) {
    // await confirmation.deferUpdate();

    // get the game
    const game = GamesActive.get(confirmation.user.id)!;

    // dealer must get to 17 to stand
    while (TallyCards(game.dealer) < 17) {
        L.info('auto hit dealer...');

        // add random card
        game.dealer.push(Math.floor(Math.random() * 11) + 1);
    }

    const dealer_bust: boolean = TallyCards(game.dealer) > 21;
    const win = dealer_bust || TallyCards(game.user) > TallyCards(game.dealer);
    const tie = !win && TallyCards(game.user) == TallyCards(game.dealer);
    const player_blackjack = TallyCards(game.user) == 21;
    const dealer_blackjack = TallyCards(game.dealer) == 21;

    // the player themselves cannot bust at this point

    await confirmation.update({
        content:`**(BETA)** Blackjack | Bet <:okash:1315058783889657928> OKA**${game.bet}** | Blackjack pays 3x, win pays 2x\n**DEALER**: [ ${TallyCards(game.dealer)} ] ${dealer_blackjack?' ***Blackjack!***':''}\n**__Y O U__**: [ ${TallyCards(game.user)} ] ${player_blackjack?' ***Blackjack!***':''}\n\nYou ${tie?'tied!':(win?'won!':'lost!')}`,
        components: []
    });

    if (win) {
        if (player_blackjack) AddToWallet(confirmation.user.id, game.bet*3);
        else AddToWallet(confirmation.user.id, game.bet*2);
    } else if (tie) {
        if (player_blackjack) AddToWallet(confirmation.user.id, Math.floor(game.bet*1.5));
        else AddToWallet(confirmation.user.id, game.bet*1);
    } else {
        if (dealer_bust) AddToWallet(confirmation.user.id, game.bet);
    }
}