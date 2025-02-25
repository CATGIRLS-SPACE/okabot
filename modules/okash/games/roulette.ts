// users bet on a number, color (red/black), or section (odd/even, 1-18, 19-36). 
// a virtual wheel spins, and if the ball lands on their chosen option, they win based on the payout odds (e.g., betting on a single number pays 35:1).

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, InteractionCollector, InteractionResponse, Message, MessageFlags, SlashCommandBuilder, Snowflake, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder, TextChannel } from "discord.js";
import { AddToWallet, GetBank, GetWallet, RemoveFromWallet } from "../wallet";
import { EMOJI, GetEmoji, GetEmojiID } from "../../../util/emoji";
import { AddXP } from "../../levels/onMessage";
import { client } from "../../..";
import { CheckOkashRestriction, OKASH_ABILITY } from "../../user/prefs";
import { EventType, RecordMonitorEvent } from "../../../util/monitortool";
import { Achievements, GrantAchievement } from "../../passive/achievement";
import {AddCasinoLoss, AddCasinoWin} from "../casinodb";

enum RouletteGameType {
    COLOR = 'color',
    LARGE_SECTION = 'large-section', // lg sect has a lower payout eg 1-18
    SMALL_SECTION = 'small-section', // sm sect has a higher payout eg 1-12
    NUMBER = 'number',
    NUMBER_MULTIPLE = 'number-multiple',
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
    selection: RouletteColor | RouletteSection | number | Array<number>,
    bet: number,
    interaction: ChatInputCommandInteraction,
    response?: InteractionResponse,
    picked: boolean
}

const GAMES_ACTIVE = new Map<string, RouletteGame>();

/**
 * Determine whether a user has won a game based on their RouletteGame and the rolled number
 * @param game user's game object
 * @param number_picked the number which the "ball landed on"
 * @returns an object with the win case and the multiplier
 */
function DetermineWinCase(game: RouletteGame, number_picked: number): {win: boolean, multiplier: number} {
    let win = false;
    let multiplier = 0;

    // console.log(`roulette game type is ${game.game_type}`);
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

        case RouletteGameType.NUMBER_MULTIPLE:
            win = (game.selection as Array<number>).indexOf(number_picked) != -1;
            multiplier = (36/(game.selection as Array<number>).length)-1;
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
    let second_half = '';

    switch (game.game_type) {
        case RouletteGameType.COLOR:
            second_half = `betting on the ball landing on a **${game.selection==RouletteColor.RED?'red':'black'} number**...`;
            break;

        case RouletteGameType.NUMBER:
            second_half = `betting on the ball landing on the number **${game.selection}**...`;
            break;

        case RouletteGameType.NUMBER_MULTIPLE:
            second_half = `betting on the ball landing on the numbers **${(game.selection as Array<number>).join(', ')}**...`;
            break;

        case RouletteGameType.LARGE_SECTION: case RouletteGameType.SMALL_SECTION:
            second_half = `betting on the ball landing between **${['1-18','19-36','1-12','13-24','25-36'][<number> game.selection]}**...`;
            break;
    }

    RecordMonitorEvent(EventType.GAMBLE, {user_id: game.interaction.user.id, bet:game.bet});

    await game.interaction!.editReply({
        content:`:fingers_crossed: **${game.interaction!.user.displayName}** spins the roulette wheel, ${second_half}`,
        components: []
    });

    const roll = Math.floor(Math.random() * 36) + 1;
    const win = DetermineWinCase(game, roll);

    let earned_xp = win.win?10:5;
    earned_xp += win.win?({
        'color': 10,
        'number': 35,
        'number-multiple': Math.floor((1 - ((game.selection as Array<number>).length/36)) * 35),
        'large-section': 15,
        'small-section': 20
    }[<string> game.game_type]!):0;

    // console.log(win);

    setTimeout(async () => {        
        if (win.win) {
            AddToWallet(game.interaction.user.id, game.bet * win.multiplier);
            AddCasinoWin(game.interaction.user.id, game.bet * win.multiplier, 'roulette');
            await game.interaction!.editReply({
                content:`:fingers_crossed: **${game.interaction!.user.displayName}** spins the roulette wheel, ${second_half} and it lands on **${roll%2==0?':black_large_square: BLACK':':red_square: RED'} ${roll}**, winning ${GetEmoji(EMOJI.OKASH)} OKA**${Math.floor(game.bet * win.multiplier)}**! ${GetEmoji(EMOJI.CAT_MONEY_EYES)} **(+${earned_xp}XP)**`
            });
            if (game.bet == 50000) GrantAchievement(game.interaction.user, Achievements.MAX_WIN, game.interaction.channel as TextChannel);
            if (game.game_type == RouletteGameType.NUMBER) GrantAchievement(game.interaction.user, Achievements.ROULETTE_ONE, game.interaction.channel as TextChannel);
            if (game.game_type == RouletteGameType.NUMBER_MULTIPLE && (game.selection as Array<number>).length < 8 && (game.selection as Array<number>).length > 1) GrantAchievement(game.interaction.user, Achievements.ROULETTE_MULTI, game.interaction.channel as TextChannel);
        } else {
            if (GetWallet(game.interaction.user.id) == 0 && GetBank(game.interaction.user.id) == 0) GrantAchievement(game.interaction.user, Achievements.NO_MONEY, game.interaction.channel as TextChannel);
            AddCasinoLoss(game.interaction.user.id, game.bet, 'roulette');
            await game.interaction!.editReply({
                content:`:fingers_crossed: **${game.interaction!.user.displayName}** spins the roulette wheel, ${second_half} and it lands on **${roll%2==0?':black_large_square: BLACK':':red_square: RED'} ${roll}**, losing the money! :crying_cat_face: **(+${earned_xp}XP)**`
            });
        }

        AddXP(game.interaction.user.id, game.interaction.channel as TextChannel, earned_xp);

        GAMES_ACTIVE.delete(game.interaction.user.id);
        RecordMonitorEvent(EventType.ROULETTE_END, {user_id: game.interaction.user.id, bet:game.bet}, `${game.interaction.user.username} ended roulette`);
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
            .setEmoji('1️⃣')
            .setDescription('The highest risk, but highest reward option. The ball must land exactly on that number or you lose.'),

        new StringSelectMenuOptionBuilder()
            .setLabel('Pick multiple numbers (pays relative to amount)')
            .setValue('number-multiple')
            .setEmoji('🔢')
            .setDescription('The ball must land on one of the numbers you chose or you lose.'),
            
        new StringSelectMenuOptionBuilder()
            .setLabel('Red or Black (pays 2:1)')
            .setValue('color')
            .setEmoji(GetEmojiID(EMOJI.ROULETTE_COLORS))
            .setDescription('The lowest risk, but lowest reward option. The ball must land on either odds or evens, or you lose.'),

        new StringSelectMenuOptionBuilder()
            .setLabel('A large section (pays 2:1)')
            .setValue('large-section')
            .setEmoji('🔆')
            .setDescription('The lowest risk but lowest reward. The ball must land within your chosen section or you lose.'),

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

const LargeSectionPick = new StringSelectMenuBuilder()
    .setCustomId('large-section')
    .setPlaceholder('What section do you want to bet on?')
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setLabel('1-18')
            .setDescription('The ball landing on any number within 1-18')
            .setValue('0'),

        new StringSelectMenuOptionBuilder()
            .setLabel('19-36')
            .setDescription('The ball landing on any number within 19-36')
            .setValue('1'),
    )

const SmallSectionPick = new StringSelectMenuBuilder()
    .setCustomId('large-section')
    .setPlaceholder('What section do you want to bet on?')
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setLabel('1-12')
            .setDescription('The ball landing on any number within 1-12')
            .setValue('0'),

        new StringSelectMenuOptionBuilder()
            .setLabel('13-24')
            .setDescription('The ball landing on any number within 13-24')
            .setValue('1'),

        new StringSelectMenuOptionBuilder()
            .setLabel('25-36')
            .setDescription('The ball landing on any number within 25-36')
            .setValue('2'),
    )


const InitialTypeRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(InitialTypePicker);

const ColorRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(ColorPick);

const LargeSectionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(LargeSectionPick);

const SmallSectionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(SmallSectionPick);


// confirmation components
const ConfirmButton = new ButtonBuilder()
    .setCustomId('accept')
    .setStyle(ButtonStyle.Success)
    .setLabel('Spin the wheel!');

const CancelButton = new ButtonBuilder()
    .setCustomId('decline')
    .setStyle(ButtonStyle.Danger)
    .setLabel('Wait, I changed my mind!');

const CancelWaitButton = new ButtonBuilder()
    .setCustomId('cancel')
    .setStyle(ButtonStyle.Danger)
    .setLabel('Nevermind');

const ConfirmationBar = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
        ConfirmButton,
        CancelButton
    );

const CancelNumericBar = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
        CancelWaitButton
    );

async function ConfirmMultiNumberGame(user_id: string) {
    const game = GAMES_ACTIVE.get(user_id)!;

    const payout_multiplier = (36/(game.selection as Array<number>).length)-1;
    const win_chance = Math.round(((game.selection as Array<number>).length/36)*100);

    const response = await game.interaction.editReply({
        content:`## okabot Roulette\nPlay Roulette for ${GetEmoji(EMOJI.OKASH)} OKA**${game.bet}**?\nYou bet on numbers **${(game.selection as Array<number>).join(', ')}**.\nYou have a **${win_chance}%** of winning, so you'd get ${GetEmoji(EMOJI.OKASH)} OKA**${Math.floor(game.bet * payout_multiplier)}**.\n\nDo you want to play?`,
        components: [ConfirmationBar]
    });

    const collectorFilter = (i: any) => i.user.id === game.interaction.user.id;
    const collector = response.createMessageComponentCollector({componentType: ComponentType.Button, time: 60_000, filter: collectorFilter});

    collector.on('collect', async i => {
        const selection = i.customId;

        if (selection == 'accept') {
            await i.update({
                content: '*interaction ack\'d, one second...*',
                components: []
            });
            return StartRoulette(game);
        } else if (selection == 'decline') {
            GAMES_ACTIVE.delete(user_id);
            AddToWallet(user_id, game.bet);
            i.update({
                content: 'Game cancelled, your bet has been refunded.',
                components: []
            });
            return;
        }
    });
}



export async function HandleCommandRoulette(interaction: ChatInputCommandInteraction) {
    if (await CheckOkashRestriction(interaction, OKASH_ABILITY.GAMBLE)) return;

    if (GAMES_ACTIVE.has(interaction.user.id)) {
        return interaction.reply({
            content:`:x: Woah there, **${interaction.user.displayName}**, you've already got a roulette game going!`,
            flags:[MessageFlags.SuppressNotifications]
        });
    }

    const bet = interaction.options.getNumber('bet', true);

    if (GetWallet(interaction.user.id) < bet) {
        return interaction.reply({
            content:`:crying_cat_face: **${interaction.user.displayName}**, you don't have enough okash for that!`,
            flags:[MessageFlags.SuppressNotifications]
        });
    }

    // take their money !!!
    RemoveFromWallet(interaction.user.id, bet);

    RecordMonitorEvent(EventType.ROULETTE_START, {user_id: interaction.user.id, bet}, `${interaction.user.username} started roulette`);

    // dummy game so they can't start two
    // selection can't be 0 or the listener will pick up as if it was number
    GAMES_ACTIVE.set(interaction.user.id, {
        bet,
        game_type: RouletteGameType.NUMBER,
        interaction,
        selection: -1,
        picked: false,
    });

    const response = await interaction.reply({
        content: `## :game_die: okabot Roulette\nPlease select how you'd like to bet your ${GetEmoji(EMOJI.OKASH)} OKA**${bet}**.\n-# You have 5 minutes to pick before the game will auto-close.`,
        components: [InitialTypeRow],
        flags: [MessageFlags.SuppressNotifications]
    });

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;
    const collector = response.createMessageComponentCollector({componentType: ComponentType.StringSelect, time: 300_000, filter: collectorFilter});

    collector.on('collect', async i => {
        const selection = i.values[0];
            
        // base initial selection

        switch (selection) {
            case RouletteGameType.NUMBER:
                GAMES_ACTIVE.set(interaction.user.id, {
                    bet,
                    game_type: selection,
                    selection: 0,
                    interaction: interaction,
                    picked: true,
                });
                i.update({
                    content:`:one: Please reply to this message with the number you'd like to bet on (1-36).`,
                    components: [CancelNumericBar],
                });
                const single_collector = response.createMessageComponentCollector({componentType: ComponentType.Button, time: 60_000, filter: collectorFilter});
                single_collector.on('collect', async ii => {
                    await ii.update({content:'Okaaay, your game has been cancelled!',components:[]});
                    GAMES_ACTIVE.delete(interaction.user.id);
                    AddToWallet(interaction.user.id, bet);
                    return;
                });
                break;

            case RouletteGameType.NUMBER_MULTIPLE:
                GAMES_ACTIVE.set(interaction.user.id, {
                    bet,
                    game_type: selection,
                    selection: 0,
                    interaction: interaction,
                    response,
                    picked: true,
                });
                i.update({
                    content:`:1234: Please reply to this message with the numbers you'd like to bet on (1-36, eg: "3, 6, 9").`,
                    components: [CancelNumericBar],
                });
                const multi_collector = response.createMessageComponentCollector({componentType: ComponentType.Button, time: 60_000, filter: collectorFilter});
                multi_collector.on('collect', async ii => {
                    if (ii.customId != 'cancel') return;
                    await ii.update({content:'Okaaay, your game has been cancelled!',components:[]});
                    GAMES_ACTIVE.delete(interaction.user.id);
                    AddToWallet(interaction.user.id, bet);
                    return;
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
                    game.picked = true;
                    GAMES_ACTIVE.set(interaction.user.id, game);
                    StartRoulette(game);
                    return;
                });
                break;

            case RouletteGameType.LARGE_SECTION:
                i.update({
                    content:`:1234: Please choose the section to bet on.`,
                    components: [LargeSectionRow]
                });
                const large_collector = response.createMessageComponentCollector({componentType: ComponentType.StringSelect, time: 60_000, filter: collectorFilter});
                large_collector.on('collect', async ii => {
                    await ii.update({
                        content:`*one second...*`,
                        components: []
                    });
                    const selection = ii.values[0];
                    const game = GAMES_ACTIVE.get(interaction.user.id)!;
                    game.game_type = RouletteGameType.LARGE_SECTION;
                    game.selection = (parseInt(selection)==RouletteSection.ONE_TO_EIGHTEEN)?RouletteSection.ONE_TO_EIGHTEEN:RouletteSection.NINETEEN_TO_THIRTYSIX;
                    game.picked = true;
                    GAMES_ACTIVE.set(interaction.user.id, game);
                    StartRoulette(game);
                    return;
                });
                break;

            case RouletteGameType.SMALL_SECTION:
                i.update({
                    content:`:1234: Please choose the section to bet on.`,
                    components: [SmallSectionRow]
                });
                const small_collector = response.createMessageComponentCollector({componentType: ComponentType.StringSelect, time: 60_000, filter: collectorFilter});
                small_collector.on('collect', async ii => {
                    await ii.update({
                        content:`*one second...*`,
                        components: []
                    });
                    const selection = ii.values[0];
                    const game = GAMES_ACTIVE.get(interaction.user.id)!;
                    game.game_type = RouletteGameType.SMALL_SECTION;
                    game.selection = [
                        RouletteSection.ONE_TO_TWELVE,
                        RouletteSection.THIRTEEN_TO_TWENTYFOUR,
                        RouletteSection.TWENTYFIVE_TO_THIRTYSIX
                    ][parseInt(selection)];
                    game.picked = true;
                    GAMES_ACTIVE.set(interaction.user.id, game);
                    StartRoulette(game);
                    return;
                });
                break;
        }
    });

    collector.on('end', async i => {
        if (!GAMES_ACTIVE.has(interaction.user.id)) return;
        if (GAMES_ACTIVE.get(interaction.user.id)?.picked) return;

        AddToWallet(interaction.user.id, bet);
        GAMES_ACTIVE.delete(interaction.user.id);
        interaction.editReply({
            content:`Ummm, **${interaction.user.displayName}**, you didn't interact, so I cancelled your game...`,
            components: []
        });
        RecordMonitorEvent(EventType.ROULETTE_END, {user_id: interaction.user.id, bet}, `${interaction.user.username} ended roulette`);
    });
}

// -- reply listener --

export async function ListenForRouletteReply(message: Message) {
    if (!GAMES_ACTIVE.has(message.author.id)) return;
    if (GAMES_ACTIVE.get(message.author.id)!.selection != 0) return;
    if (!(message.reference && (await message.fetchReference()).author.id == client.user!.id)) return;

    const game = GAMES_ACTIVE.get(message.author.id)!;

    if (game.game_type == RouletteGameType.NUMBER) {        
        try {
            const pick = parseInt(message.content);
            if (isNaN(pick) || pick > 36 || pick < 1) throw new Error('bad number'); // unnecessary throw but im lazy
            
            game.selection = pick;
            GAMES_ACTIVE.set(message.author.id, game);

            if (message.deletable) message.delete();
            StartRoulette(game);
        } catch {
            message.react('❌');
            const reply = await message.reply(':x: Please pick a number between 1-36!');
            setTimeout(() => {
                if (message.deletable) message.delete();
                if (reply.deletable) reply.delete();
            }, 5000);
        }
    }

    if (game.game_type == RouletteGameType.NUMBER_MULTIPLE) {
        game.selection = [];

        try {
            const items = message.content.split(', ');

            for (const item in items) {
                const pick = parseInt(items[item]);
                if (isNaN(pick) || pick > 36 || pick < 1) throw new Error('bad number');

                if (game.selection.indexOf(pick) == -1) game.selection.push(pick);
            }

            GAMES_ACTIVE.set(game.interaction.user.id, game);
            if (message.deletable) message.delete();
            ConfirmMultiNumberGame(game.interaction.user.id);
        } catch {
            message.react('❌');
            const reply = await message.reply(':x: Please pick __numbers__ between 1-36!\nexample reply: `4, 5, 10, 13, 16`');
            setTimeout(() => {
                if (message.deletable) message.delete();
                if (reply.deletable) reply.delete();
            }, 5000);
        }
    }
}

export function ReleaseUserGame(user_id: Snowflake) {
    GAMES_ACTIVE.delete(user_id);
}

// -- command for deployment --

export const RouletteSlashCommand = new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Play a game of high-risk-high-reward roulette')
    .addNumberOption(option => option
        .setName('bet')
        .setDescription('how much money to bet')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(50000)
    )