import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Message, MessageFlags, TextChannel, User } from "discord.js";
import { Logger } from "okayulogger";
import { AddToWallet, RemoveFromWallet } from "./wallet";
import { AddXP } from "../levels/onMessage";
import { DEV } from "../..";
import { CheckOkashRestriction, OKASH_ABILITY } from "../user/prefs";


const L = new Logger('blackjack');


interface HandCard {
    value: number, name: string
}

const CARDS: Array<HandCard> = [
    {value:1,name:'ca'},
    {value:2,name:'c2'},
    {value:3,name:'c3'},
    {value:4,name:'c4'},
    {value:5,name:'c5'},
    {value:6,name:'c6'},
    {value:7,name:'c7'},
    {value:8,name:'c8'},
    {value:9,name:'c9'},
    {value:10,name:'c10'},
    {value:10,name:'cr'} // redundant to have all the royalty
]

interface BlackjackGame {
    dealer: Array<HandCard>,
    user: Array<HandCard>,
    bet: number,
    gameActive: boolean
}
const GamesActive = new Map<string, BlackjackGame>(); // user_id and game


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
        if (card.name === 'ca') final += GetEmojiIDByName('ca');
        else if (card.name === 'cr') final += GetEmojiIDByName('cr');
        else final += GetEmojiIDByName(`${card.name}`);
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
    RemoveFromWallet(interaction.user.id, bet);

    // create a blackjack game
    const game: BlackjackGame = {
        dealer: [],
        user: [],
        bet,
        gameActive: true
    }

    // dealer gets two cards at first:
    game.dealer.push(
        CARDS[Math.floor(Math.random() * 11)], 
        CARDS[Math.floor(Math.random() * 11)]
    );

    // player also gets two cards
    game.user.push(
        CARDS[Math.floor(Math.random() * 11)], 
        CARDS[Math.floor(Math.random() * 11)]
    );

    GamesActive.set(interaction.user.id, game);

    const response = await interaction.reply({
        content:`**(BETA)** Blackjack | Bet <:okash:1315058783889657928> OKA**${bet}** | Blackjack pays 3x, win pays 2x\n**DEALER**: [ ?? ]\n**__Y O U__**: [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)}`,
        components: [row as any],
        flags:[MessageFlags.SuppressNotifications]
    });

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;

    const collector = response.createMessageComponentCollector({filter: collectorFilter, time:120_000});

    collector.on('collect', async (i) => {
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
        const game = GamesActive.get(interaction.user.id);

        if (game != undefined && game.gameActive) {
        await interaction.editReply({content:`*This incomplete blackjack game has expired. okabot will no longer respond to it. Your bet has been refunded.*`});
            AddToWallet(interaction.user.id, game.bet);
        }

        GamesActive.delete(interaction.user.id);
    });
}

async function Hit(interaction: ChatInputCommandInteraction, confirmation: any) {
    const game = GamesActive.get(interaction.user.id)!;

    if (!game) {
        return confirmation.update({
            content:':x: Something went wrong: game is undefined.',
            components:[]
        });
    }
    
    // deal a card to the user
    game.user.push(CARDS[Math.floor(Math.random() * 11)]);

    const player_busted = TallyCards(game.user) > 21;
    const player_blackjack = TallyCards(game.user) == 21;
    const dealer_blackjack = TallyCards(game.dealer) == 21;

    if (player_busted) {
        await confirmation.update({
            content:`**(BETA)** Blackjack | Bet <:okash:1315058783889657928> OKA**${game.bet}** | Blackjack pays 3x, win pays 2x\n**DEALER**: [ ${TallyCards(game.dealer)} ] ${GetCardEmojis(game.dealer)} ${dealer_blackjack?' ***Blackjack!***':''}\n**__Y O U__**: [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)}\n\nYou busted! **(+15XP)**`,
            components: []
        });

        AddXP(interaction.user.id, interaction.channel as TextChannel, 10);

        GamesActive.delete(interaction.user.id);
    } else {
        await confirmation.update({
            content:`**(BETA)** Blackjack | Bet <:okash:1315058783889657928> OKA**${game.bet}** | Blackjack pays 3x, win pays 2x\n**DEALER**: [ ?? ]\n**__Y O U__**: [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)} ${player_blackjack?' ***Blackjack!***':''}`,
            components: [player_blackjack?row_willbust:row]
        });
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
        game.dealer.push(CARDS[Math.floor(Math.random() * 11)]);
    }

    const dealer_bust: boolean = TallyCards(game.dealer) > 21;
    const win = dealer_bust || TallyCards(game.user) > TallyCards(game.dealer);
    const tie = !win && TallyCards(game.user) == TallyCards(game.dealer);
    const player_blackjack = TallyCards(game.user) == 21;
    const dealer_blackjack = TallyCards(game.dealer) == 21;

    // the player themselves cannot bust at this point

    let earned_xp = tie?20:(win?30:15);
    if (player_blackjack) earned_xp += 5;

    await confirmation.update({
        content:`**(BETA)** Blackjack | Bet <:okash:1315058783889657928> OKA**${game.bet}** | Blackjack pays 3x, win pays 2x\
        \n**DEALER**: [ ${TallyCards(game.dealer)} ] ${GetCardEmojis(game.dealer)} ${dealer_blackjack?' ***Blackjack!***':''}\
        \n**__Y O U__**: [ ${TallyCards(game.user)} ] ${GetCardEmojis(game.user)} ${player_blackjack?' ***Blackjack!***':''}\
        \n\nYou ${tie?'tied!':(win?'won <:okash:1315058783889657928> OKA**' + game.bet*(player_blackjack?3:2) + '**!':'lost!')} **(+${earned_xp}XP)**`,
        components: []
    });

    if (win) {
        if (player_blackjack) AddToWallet(confirmation.user.id, game.bet*3);
        else AddToWallet(confirmation.user.id, game.bet*2);
    } else if (tie) {
        if (player_blackjack) AddToWallet(confirmation.user.id, Math.floor(game.bet*1.5));
        else AddToWallet(confirmation.user.id, game.bet*1);
    }

    AddXP(interaction.user.id, interaction.channel as TextChannel, earned_xp);

    GamesActive.delete(interaction.user.id);
}


interface EMOJI {
    prod: string,
    dev: string
}
const emojis: {
    [key: string]: EMOJI
} = {
    'ca':{prod:'1317726303541006367',dev:'1317728258652901447'},
    'c2':{prod:'1317726214240206848',dev:'1317728181352009788'},
    'c3':{prod:'1317726223744630834',dev:'1317728189912711208'},
    'c4':{prod:'1317726232409800745',dev:'1317728197185634355'},
    'c5':{prod:'1317726240714784828',dev:'1317728203967692852'},
    'c6':{prod:'1317726251883958273',dev:'1317728211995459747'},
    'c7':{prod:'1317726264844353566',dev:'1317728221537501344'},
    'c8':{prod:'1317726276663906314',dev:'1317728233738731611'},
    'c9':{prod:'1317726285799227493',dev:'1317728241359917126'},
    'c10':{prod:'1317726293542047756',dev:'1317728249551388683'},
    'cr':{prod:'1317726312986837033',dev:'1317728273823698974'},
};

function GetEmojiIDByName(name: string): string {
    return `<:${name}:${emojis[name][DEV?'dev':'prod']}>`;
}