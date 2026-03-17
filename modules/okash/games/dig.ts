/**
 * oh my goodness, you can get a J*B on okabot?!??!?!
 */
import {
    ActionRowBuilder,
    ApplicationIntegrationType, ButtonBuilder, ButtonInteraction, ButtonStyle,
    ChatInputCommandInteraction,
    InteractionContextType, MessageFlags,
    SlashCommandBuilder,
    Snowflake
} from "discord.js";
import {EMOJI, GetEmoji} from "../../../util/emoji";


enum Digables {
    NOTHING,
    SCRAP,
    OKASH,
    LOOTBOX_COMMON,
    LOOTBOX_RARE,
    LOOTBOX_EX,
    SHARD,
}

interface DigGame {
    first: Array<Digables>,
    second: Array<Digables>,
    third: Array<Digables>,
    fourth: Array<Digables>,
    fifth: Array<Digables>,
    wager: number,
    picked: Array<{
        display: string,
        has: Digables,
    }>
}

const ActiveDigs = new Map<Snowflake, DigGame>();
const Cooldowns = new Map<Snowflake, number>();

function GenerateDigGame(wager: number): DigGame {
    const game: DigGame = {
        'first':[],
        'second':[],
        'third':[],
        'fourth':[],
        'fifth':[],
        picked:[],
        wager
    };

    const MIN = 5_000;
    const MAX = 50_000;

    const normalized = (wager - 5000) / (50000 - 5000)

    for (const row of ['first', 'second', 'third', 'fourth', 'fifth']) {
        for (let c = 0; c < 5; c++) {
            const t = Math.max(0, Math.min(1, (normalized - MIN) / (MAX - MIN)));
            const r = Math.pow(Math.random(), 1 - t);
            // @ts-expect-error this is jank but i know it will work fine
            game[row][c] = Math.floor(r * 6);
        }
    }

    console.log(game);
    return game;
}

const BASE_BUTTON_ROW_TOP = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('A1').setCustomId('first:0').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('A2').setCustomId('first:1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('A3').setCustomId('first:2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('A4').setCustomId('first:3').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('A5').setCustomId('first:4').setStyle(ButtonStyle.Primary),
);
const BASE_BUTTON_ROW_SECOND = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('B1').setCustomId('second:0').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('B2').setCustomId('second:1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('B3').setCustomId('second:2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('B4').setCustomId('second:3').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('B5').setCustomId('second:4').setStyle(ButtonStyle.Primary),
);
const BASE_BUTTON_ROW_THIRD = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('C1').setCustomId('third:0').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('C2').setCustomId('third:1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('C3').setCustomId('third:2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('C4').setCustomId('third:3').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('C5').setCustomId('third:4').setStyle(ButtonStyle.Primary),
);
const BASE_BUTTON_ROW_FOURTH = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('D1').setCustomId('fourth:0').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('D2').setCustomId('fourth:1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('D3').setCustomId('fourth:2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('D4').setCustomId('fourth:3').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('D5').setCustomId('fourth:4').setStyle(ButtonStyle.Primary),
);
const BASE_BUTTON_ROW_FIFTH = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('E1').setCustomId('fifth:0').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('E2').setCustomId('fifth:1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('E3').setCustomId('fifth:2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('E4').setCustomId('fifth:3').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setLabel('E5').setCustomId('fifth:4').setStyle(ButtonStyle.Primary),
);


const FINAL_BUTTON_ROW = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Take it!').setStyle(ButtonStyle.Success).setCustomId('yes').setEmoji('✅'),
    new ButtonBuilder().setLabel('Ehh... nevermind.').setStyle(ButtonStyle.Danger).setCustomId('no').setEmoji('❌'),
);


const ID_COORDINATE_MAPPINGS: {[key: string]: string} = {
    'first':'A',
    'second':'B',
    'third':'C',
    'fourth':'D',
    'fifth':'E',
}

export async function HandleCommandDig(interaction: ChatInputCommandInteraction) {
    if (ActiveDigs.has(interaction.user.id)) return interaction.reply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you've already got a dig session going!`,
        flags: [MessageFlags.SuppressNotifications]
    });

    const game = GenerateDigGame(interaction.options.getNumber('wager', true));
    ActiveDigs.set(interaction.user.id, game);

    const reply = await interaction.reply({
        content: '# Time to dig! Wonder what you\'ll find...\n-# **Early Beta!** Bugs may arise!\nSelect three spots to dig.\nChosen: ?? ?? ??',
        components: [
            BASE_BUTTON_ROW_TOP,
            BASE_BUTTON_ROW_SECOND,
            BASE_BUTTON_ROW_THIRD,
            BASE_BUTTON_ROW_FOURTH,
            BASE_BUTTON_ROW_FIFTH,
        ] as Array<never>
    });

    // listen for buttons
    const collector = reply.createMessageComponentCollector({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filter: (i: any) => i.user.id === interaction.user.id,
        time: 120_000
    });

    collector.on('collect', (i: ButtonInteraction) => {
        const id = i.customId;
        const g = ActiveDigs.get(interaction.user.id)!;

        if (id == 'yes' || id == 'no') {
            if (id == 'yes') {

            }

            return;
        }

        const x = ID_COORDINATE_MAPPINGS[id.split(':')[0]];
        const y = parseInt(id.split(':')[1]) + 1;

        if (!g.picked.some(p => p.display == x+y)) g.picked.push({
            display: x+y,
            // @ts-expect-error this is jank but i know it will work fine
            has: g[id.split(':')[0]][y-1]
        });

        if (g.picked.length == 3) {
            i.update({
                content: `# Time to dig! Wonder what you'll find...\n-# **Early Beta!** Bugs may arise!\nYou chose **${g.picked[0].display}**, **${g.picked[1].display}**, and **${g.picked[2].display}**.\nNow, do you wanna spend your ${GetEmoji(EMOJI.OKASH)} OKA**${g.wager}** to take what you got, or just reveal what you could've gotten?`,
                components: [FINAL_BUTTON_ROW] as Array<never>
            });
        } else {
            const picked_part = `**${g.picked[0].display}**, **${(g.picked[1] || {display:'??'}).display}**, and **${(g.picked[2] || {display:'??'}).display}**`
            i.update({
                content:`# Dig for stuff!\n-# **Early Beta!** Bugs may arise!\nSelect three spots to dig.\nChosen: ${picked_part}`
            });
        }
    });
}


export const DigSlashCommand = new SlashCommandBuilder()
    .setName("dig")
    .setDescription("Dig up some stuff for a chance to get some rare items!")
    .addNumberOption(option => option
        .setName("wager")
        .setDescription("The more okash you wager, the higher chance to get rare items.")
        .setMinValue(5_000)
        .setMaxValue(50_000)
        .setRequired(true)
    ).setContexts(InteractionContextType.Guild).setIntegrationTypes(ApplicationIntegrationType.GuildInstall);