// users bet on a number, color (red/black), or section (odd/even, 1-18, 19-36). 
// a virtual wheel spins, and if the ball lands on their chosen option, they win based on the payout odds (e.g., betting on a single number pays 35:1).

import { ActionRowBuilder, ChatInputCommandInteraction, ComponentType, Message, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../wallet";
import { EMOJI, GetEmoji, GetEmojiID } from "../../../util/emoji";

enum RouletteGameType {
    COLOR = 'color',
    LARGE_SECTION = 'large-section', // lg sect has a lower payout eg 1-18
    SMALL_SECTION = 'small-section', // sm sect has a higher payout eg 1-12
    NUMBER = 'number',
}

enum RouletteColor {
    RED = 'red',        // has remainder
    BLACK = 'black'     // has no remainder
}

enum RouletteSection {
    ONE_TO_EIGHTEEN = 0,
    NINETEEN_TO_THIRTYSIX = 1,
    ONE_TO_TWELVE = 2,
    THIRTEEN_TO_TWENTYFOUR = 3,
    TWENTYFIVE_TO_THIRTYSIX = 4
}

interface RouletteGame {
    game_type: RouletteGameType,
    selection: RouletteColor | RouletteSection | number,
    bet: number,
    interaction: ChatInputCommandInteraction
}


/**
 * Determine whether a user has won a game based on their RouletteGame and the rolled number
 * @param game user's game object
 * @param number_picked the number which the "ball landed on"
 * @returns an object with the win case and the multiplier
 */
function DetermineWinCase(game: RouletteGame, number_picked: number): {win: boolean, multiplier: number} {
    let win = false;
    let multiplier = 0;

    console.log(`roulette game time is ${game.game_type}`);
    switch (game.game_type) {
        case RouletteGameType.COLOR:
            // RED if has remainder, BLACK if no remainder
            const rolled_color = number_picked%2==0?RouletteColor.BLACK:RouletteColor.RED;
            console.log(`rolled color is ${rolled_color}, user picked ${game.selection}`)
            win = rolled_color == game.selection;
            multiplier = 2;
            break;

        case RouletteGameType.NUMBER:
            win = number_picked == game.selection;
            multiplier = 35;
            break;
            
        case RouletteGameType.LARGE_SECTION:
            // 1-18, 19-36
            const rolled_section = number_picked<19?RouletteSection.ONE_TO_EIGHTEEN:RouletteSection.NINETEEN_TO_THIRTYSIX;
            win = rolled_section == game.selection;
            multiplier = 2;
            break;

        case RouletteGameType.SMALL_SECTION:
            // 1-12, 13-24, 25-36
            let rolled_section_small: RouletteSection;

            if (number_picked < 13) rolled_section_small = RouletteSection.ONE_TO_TWELVE;
            else if (number_picked < 25) rolled_section_small = RouletteSection.THIRTEEN_TO_TWENTYFOUR;
            else rolled_section_small = RouletteSection.TWENTYFIVE_TO_THIRTYSIX;

            win = rolled_section_small == game.selection;
            multiplier = 3;

            break;
    }

    return {win, multiplier};
}


async function StartRoulette(game: RouletteGame) {
    // take their money !!!
    RemoveFromWallet(game.interaction!.user.id, game.bet);

    let second_half = '';

    switch (game.game_type) {
        case RouletteGameType.COLOR:
            second_half = `betting on the ball landing on a **${game.selection==RouletteColor.RED?'red':'black'} number**...`;
            break;

        case RouletteGameType.NUMBER:
            second_half = `betting on the ball landing on the number **${game.selection}**...`;
            break;

        case RouletteGameType.LARGE_SECTION: case RouletteGameType.SMALL_SECTION:
            second_half = `betting on the ball landing between **${['1-18','19-36','1-12','13-24','25-36'][<number> game.selection]}**`;
            break;
    }

    await game.interaction!.editReply({
        content:`:fingers_crossed: **${game.interaction!.user.displayName}** spins the roulette wheel, ${second_half}`
    });

    const roll = Math.round(Math.random() * 36);
    const win = DetermineWinCase(game, roll);

    // TODO: XP

    setTimeout(async () => {        
        if (win.win) {
            AddToWallet(game.interaction.user.id, game.bet * win.multiplier);
            await game.interaction!.editReply({
                content:`:fingers_crossed: **${game.interaction!.user.displayName}** spins the roulette wheel, ${second_half}\nand wins ${GetEmoji(EMOJI.OKASH)} OKA**${game.bet * win.multiplier}**! ${GetEmoji(EMOJI.CAT_MONEY_EYES)}`
            });
        } else {
            await game.interaction!.editReply({
                content:`:fingers_crossed: **${game.interaction!.user.displayName}** spins the roulette wheel, ${second_half}\nand loses their money! :crying_cat_face:`
            });
        }

        GAMES_ACTIVE.delete(game.interaction.user.id);
    }, 5000);
}


// -- handling client-side display --

const InitialTypePicker = new StringSelectMenuBuilder()
    .setCustomId('game_type')
    .setPlaceholder('How would you like to bet?')
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setLabel('A specific number (pays 35:1)')
            .setValue('number')
            .setEmoji('🔢')
            .setDescription('The highest risk, but highest reward option. The ball must land exactly on that number or you lose.'),
            
        new StringSelectMenuOptionBuilder()
            .setLabel('Red or Black (pays 2:1)')
            .setValue('color')
            .setEmoji(GetEmojiID(EMOJI.ROULETTE_COLORS))
            .setDescription('The lowest risk, but lowest reward option. The ball must land on either odds or evens, or you lose.'),

        new StringSelectMenuOptionBuilder()
            .setLabel('A large section (pays 2:1)')
            .setValue('large-section')
            .setEmoji('🔆')
            .setDescription('A low risk with mediocre reward. The ball must land within your chosen section or you lose.'),

        new StringSelectMenuOptionBuilder()
            .setLabel('A small section (pays 3:1)')
            .setValue('small-section')
            .setEmoji('🔅')
            .setDescription('A medium risk with medium reward. The ball must land within your chosen section or you lose.'),
    );


const ColorPick = new StringSelectMenuBuilder()
    .setCustomId('color')
    .setPlaceholder('What color do you want to bet on?')
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setLabel('Red')
            .setDescription('The ball landing on any red number will win (odds)')
            .setEmoji('🟥')
            .setValue('red'),

        new StringSelectMenuOptionBuilder()
            .setLabel('Black')
            .setDescription('The ball landing on any black number will win (evens)')
            .setEmoji('⬛')
            .setValue('black'),
    )


const InitialTypeRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(InitialTypePicker);

const ColorRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(ColorPick);


// user_id and game
const GAMES_ACTIVE = new Map<string, RouletteGame>();

export async function HandleCommandRoulette(interaction: ChatInputCommandInteraction) {
    if (GAMES_ACTIVE.has(interaction.user.id)) {
        return interaction.reply({
            content:`:x: Woah there, **${interaction.user.displayName}**, you've already got a roulette game going!` 
        });
    }

    const bet = interaction.options.getNumber('bet', true);

    if (GetWallet(interaction.user.id) < bet) {
        return interaction.reply({
            content:`:crying_cat_face: **${interaction.user.displayName}**, you don't have enough okash for that!` 
        });
    }

    // dummy game so they can't start two
    // selection can't be 0 or the listener will pick up as if it was number
    GAMES_ACTIVE.set(interaction.user.id, {
        bet,
        game_type: RouletteGameType.NUMBER,
        interaction,
        selection: -1
    });

    const response = await interaction.reply({
        content: `## okabot Roulette\nPlease select how you'd like to bet your ${GetEmoji(EMOJI.OKASH)} OKA**${bet}**.`,
        components: [InitialTypeRow]
    });

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;
    const collector = response.createMessageComponentCollector({componentType: ComponentType.StringSelect, time: 60_000, filter: collectorFilter});

    collector.on('collect', async i => {
        const selection = i.values[0];
            
        // base initial selection

        switch (selection) {
            case RouletteGameType.NUMBER:
                GAMES_ACTIVE.set(interaction.user.id, {
                    bet,
                    game_type: selection,
                    selection: 0,
                    interaction: interaction
                });
                i.update({
                    content:`:1234: Please reply to this message with the number you'd like to bet on (1-36).`,
                    components: [],
                });
                break;
            
            case RouletteGameType.COLOR:
                i.update({
                    content:`${GetEmoji(EMOJI.ROULETTE_COLORS)} Please choose the color to bet on.`,
                    components: [ColorRow]
                });
                const color_collector = response.createMessageComponentCollector({componentType: ComponentType.StringSelect, time: 60_000, filter: collectorFilter});
                color_collector.on('collect', async ii => {
                    await ii.update({
                        content:`*one second...*`,
                        components: []
                    });
                    const selection = ii.values[0];
                    const game = GAMES_ACTIVE.get(interaction.user.id)!;
                    game.game_type = RouletteGameType.COLOR;
                    game.selection = selection as RouletteColor;
                    GAMES_ACTIVE.set(interaction.user.id, game);
                    StartRoulette(game);
                    return;
                });
                break;
        }
    });
}

// -- reply listener --

export function ListenForRouletteReply(message: Message) {
    if (!GAMES_ACTIVE.has(message.author.id)) return;
    if (GAMES_ACTIVE.get(message.author.id)!.selection != 0) return;

    try {
        const pick = parseInt(message.content);
        if (pick > 36 || pick < 1) throw new Error('bad number'); // unnecessary throw but im lazy
        
        const game = GAMES_ACTIVE.get(message.author.id)!;
        game.selection = pick;
        GAMES_ACTIVE.set(message.author.id, game);

        StartRoulette(game);
    } catch {
        message.react('❌');
    }
}

// -- command for deployment --

export const RouletteSlashCommand = new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Play a game of high-risk-high-reward roulette')
    .addNumberOption(option => option
        .setName('bet')
        .setDescription('how much money to bet')
        .setRequired(true)
    )