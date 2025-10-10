import {join} from "path";
import {BASE_DIRNAME} from "../../index";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction, ComponentType, Interaction,
    InteractionContextType,
    PermissionsBitField,
    SlashCommandBuilder, Snowflake, StringSelectMenuInteraction
} from "discord.js";
import {
    ActionRowBuilder, ButtonBuilder,
    ModalBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "@discordjs/builders";

/**
 * A configuration interface that allows server administrators to define
 * which features their server members can use on okabot.
 */
export interface ServerPreferences {
    version: number,
    allowed_features: {
        okash: boolean,
        daily: boolean,
        msg_xp: boolean,
        levelup_msg: boolean,
        drops: boolean,
        gambling: boolean,
        coinflip: boolean,
        blackjack: boolean,
        roulette: boolean,
        slots: boolean,
        magicball: boolean,
        pixel_guess: boolean,
        earthquakes: boolean,
        easter_eggs: boolean,
        voice_xp: boolean,
        ai_responses: boolean,
        reminders: boolean,
        catgirl: boolean,
    }
}

export enum ServerFeature {
    okash = 'okash',
    daily = 'daily',
    msg_xp = 'msg_xp',
    levelup_msg = 'levelup_msg',
    drops = 'drops',
    gambling = 'gambling',
    coinflip = 'coinflip',
    blackjack = 'blackjack',
    roulette = 'roulette',
    slots = 'slots',
    magicball = 'magicball',
    pixelguess = 'pixel_guess',
    earthquakes = 'earthquakes',
    easter_eggs = 'easter_eggs',
    voice_xp = 'voice_xp',
    gemini = 'ai_responses',
    reminders = 'reminders',
    catgirl = 'catgirl',
}

const DEFAULT_PREFERENCES: ServerPreferences = {
    version: 1,
    allowed_features: {
        okash: true,
        daily: true,
        msg_xp: true,
        levelup_msg: true,
        drops: true,
        gambling: true,
        coinflip: true,
        blackjack: true,
        roulette: true,
        slots: true,
        magicball: true,
        pixel_guess: true,
        earthquakes: true,
        easter_eggs: true,
        voice_xp: true,
        ai_responses: true,
        reminders: true,
        catgirl: true,
    }
};

const FORCED_ELLIGIBILITY_LIST: {[key: Snowflake]: {[key: string]: boolean}} = {
    '961833542491463720': {
        'earthquakes': true
    },
    '1348652647963561984': {
        // pixel guessing game is disabled in fsg because it was totally copied from that horse bot
        // and i would feel pretty bad allowing it to be used.
        // if fsg member reading this and thinks it should be otherwise, open an issue.
        'pixel_guess': false
    },
    '748284249487966282': {
        'pixel_guess': false
    }
}


let SERVER_PREFERENCES_DB: {[key: string]: ServerPreferences} = {};
let DB_LOADED_YET = false;

function LoadServerPreferencesDB() {
    const db_path = join(BASE_DIRNAME, 'db', 'server_prefs.oka');
    if (!existsSync(db_path)) writeFileSync(db_path, '{}');
    SERVER_PREFERENCES_DB = JSON.parse(readFileSync(db_path, 'utf-8'));
}

function SaveServerPreferencesDB() {
    const db_path = join(BASE_DIRNAME, 'db', 'server_prefs.oka');
    writeFileSync(db_path, JSON.stringify(SERVER_PREFERENCES_DB));
}

const dropdown_section = new StringSelectMenuBuilder()
    .setPlaceholder('Select a feature section')
    .setCustomId('feature_selection')
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setValue('base')
            .setLabel('Base okabot Features')
            .setDescription('Basic okabot features, such as okash, voice xp'),

        new StringSelectMenuOptionBuilder()
            .setValue('games')
            .setLabel('Games')
            .setDescription('Games, such as blackjack, pixel guessing'),

        new StringSelectMenuOptionBuilder()
            .setValue('extra')
            .setLabel('Extras')
            .setDescription('Extras, such as easter eggs, Gemini features')
    );

const base_selection = new StringSelectMenuBuilder()
    .setPlaceholder('Select a base feature')
    .setCustomId('base_selection')
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setValue('okash')
            .setLabel('okash Features')
            .setDescription('okash features, such as bank, robbing, payments'),

        new StringSelectMenuOptionBuilder()
            .setValue('leveling')
            .setLabel('Leveling/XP')
            .setDescription('Earn XP with messaging and voice XP'),

        new StringSelectMenuOptionBuilder()
            .setValue('levelup_msg')
            .setLabel('"Level Up" Messages')
            .setDescription('Show level up messages (requires leveling to be on)'),

        new StringSelectMenuOptionBuilder()
            .setValue('daily')
            .setLabel('Daily')
            .setDescription('Daily features, such as daily reward, reminders'),

        new StringSelectMenuOptionBuilder()
            .setValue('drops')
            .setLabel('Drops')
            .setDescription('Enable or disable okash and lootbox drops'),
    );

const games_selection = new StringSelectMenuBuilder()
    .setPlaceholder('Select a game-related feature')
    .setCustomId('game_selection')
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setValue('coinflip')
            .setLabel('Coinflip')
            .setDescription('Enable or disable coinflip'),

        new StringSelectMenuOptionBuilder()
            .setValue('blackjack')
            .setLabel('Blackjack')
            .setDescription('Enable or disable blackjack'),

        new StringSelectMenuOptionBuilder()
            .setValue('roulette')
            .setLabel('Roulette')
            .setDescription('Enable or disable roulette'),

        new StringSelectMenuOptionBuilder()
            .setValue('slots')
            .setLabel('Slots')
            .setDescription('Enable or disable slots'),

        new StringSelectMenuOptionBuilder()
            .setValue('magicball')
            .setLabel('8 Ball')
            .setDescription('Enable or disable the Magic 8 Ball'),

        new StringSelectMenuOptionBuilder()
            .setValue('pixel_guess')
            .setLabel('Guessing Game')
            .setDescription('Enable or disable the pixel guessing game'),
    );

const extra_selection = new StringSelectMenuBuilder()
    .setPlaceholder('Select an extra feature')
    .setCustomId('extra_selection')
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setValue('earthquakes')
            .setLabel('Earthquakes')
            .setDescription('Enable or disable earthquake features'),

        new StringSelectMenuOptionBuilder()
            .setValue('catgirl')
            .setLabel('/catgirl')
            .setDescription('Enable or disable the /catgirl command'),

        new StringSelectMenuOptionBuilder()
            .setValue('eastereggs')
            .setLabel('Easter Eggs')
            .setDescription('Enable or disable the text-based easter eggs'),

        new StringSelectMenuOptionBuilder()
            .setValue('gemini')
            .setLabel('AI Responses')
            .setDescription('Enable or disable AI responses'),

        new StringSelectMenuOptionBuilder()
            .setValue('reminders')
            .setLabel('Reminders')
            .setDescription('Enable or disable the o.remind command'),
    )

export async function HandleServerPrefsCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    if (!interaction.guild) return interaction.editReply('Must be in a server to use this command.');
    const guild = await interaction.client.guilds.fetch(interaction.guild.id);
    const guildMember = await guild.members.fetch(interaction.user.id);
    if (!guildMember.permissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.editReply('Must have the "Manage Server" permission to use this command.');

    if (!DB_LOADED_YET) LoadServerPreferencesDB();
    if (SERVER_PREFERENCES_DB[guild.id]) {
        SERVER_PREFERENCES_DB[guild.id] = DEFAULT_PREFERENCES;
        SaveServerPreferencesDB();
    }

    const reply = await interaction.editReply({
        content: '# Server Configurator Tool\nThis tool will allow you to customize okabot in your server to your liking.\nThis configurator will expire in 3 minutes.\nPlease choose your category:',
        components: [new ActionRowBuilder().addComponents(dropdown_section) as any]
    });

    const collectorFilter = (i: Interaction) => i.user.id === interaction.user.id;
    const collector = reply.createMessageComponentCollector({componentType: ComponentType.StringSelect, time: 180_000, filter: collectorFilter});

    collector.on('collect', async (i) => {
        if (i.customId == 'feature_selection') FeatureSelectionDropDown(i);
        if (i.customId == 'base_selection') BaseSelectDropDown(i);
        if (i.customId == 'game_selection') GameSelectDropDown(i);
        if (i.customId == 'extra_selection') ExtraSelectDropDown(i);
    });
    collector.on('dispose', () => {
        reply.edit({
            content: 'This configurator is no longer active. Please run `/server-preferences` again to make more changes.'
        })
    });

    const buttonCollector = reply.createMessageComponentCollector({componentType: ComponentType.Button, time: 180_000, filter: collectorFilter});
    buttonCollector.on('collect', async i => ChangeSettingTo(i));
}

//
// EXPORTED START
//

/**
 * Check whether a server is allowed to execute a given feature.
 * shittiest function i've ever written
 */
export function CheckFeatureAvailability(guild_id: Snowflake, feature: ServerFeature) {
    if (!DB_LOADED_YET) LoadServerPreferencesDB();
    if (!SERVER_PREFERENCES_DB[guild_id]) {
        if (FORCED_ELLIGIBILITY_LIST[guild_id]) return FORCED_ELLIGIBILITY_LIST[guild_id][feature] || true;
        else return true;
    }
    return SERVER_PREFERENCES_DB[guild_id].allowed_features[feature];
}

//
// CONFIG HANDLER START
//

function ChangeSettingTo(i: ButtonInteraction) {
    const sections = i.customId.split('-');

    if (FORCED_ELLIGIBILITY_LIST[i.guild!.id]) {
        if (FORCED_ELLIGIBILITY_LIST[i.guild!.id][sections[0]] != undefined) return i.update({
            content: ':warning: Something went wrong while changing your setting: This feature is ' +
                (FORCED_ELLIGIBILITY_LIST[i.guild!.id][sections[0]] ? 'required to be enabled ' : 'not available ') +
                'in this server.\nPlease contact a bot admin for help.',
            components: []
        });
    }

    if (!SERVER_PREFERENCES_DB[i.guild!.id]) SERVER_PREFERENCES_DB[i.guild!.id] = DEFAULT_PREFERENCES;

    const enabled = sections.at(-1) == 'on';
    switch (sections[0]) {
        // Base features
        case 'okash':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.okash = enabled;
            break;
        case 'leveling':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.msg_xp = enabled;
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.voice_xp = enabled;
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.levelup_msg = enabled;
            break;
        case 'levelup_msg':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.levelup_msg = enabled;
            break;
        case 'daily':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.daily = enabled;
            break;
        case 'drops':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.drops = enabled;
            break;

        // Games
        case 'coinflip':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.coinflip = enabled;
            break;
        case 'blackjack':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.blackjack = enabled;
            break;
        case 'roulette':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.roulette = enabled;
            break;
        case 'slots':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.slots = enabled;
            break;
        case 'magicball':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.magicball = enabled;
            break;
        case 'pixel_guess':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.pixel_guess = enabled;
            break;

        // Extras
        case 'earthquakes':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.earthquakes = enabled;
            break;
        case 'catgirl':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.catgirl = enabled;
            break;
        case 'eastereggs':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.easter_eggs = enabled;
            break;
        case 'gemini':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.ai_responses = enabled;
            break;
        case 'reminders':
            SERVER_PREFERENCES_DB[i.guild!.id].allowed_features.reminders = enabled;
            break;
    }

    SaveServerPreferencesDB();
    i.update({
        content:'✅ Your change has been recorded successfully.',
        components: []
    });
}

//
// PAGES START
//

function FeatureSelectionDropDown(i: StringSelectMenuInteraction) {
    if (i.values[0] == 'base') {
        i.update({
            content: `# Base Features\nThe bread and butter of okabot.\nPlease select a subcategory:`,
            components: [new ActionRowBuilder().setComponents(base_selection) as any]
        });
    }
    if (i.values[0] == 'games') {
        i.update({
            content: `# Game-related Features\nTurning off games means you'll forever be known as no fun! :crying_cat_face:\nPlease select a subcategory:`,
            components: [new ActionRowBuilder().setComponents(games_selection) as any]
        });
    }
    if (i.values[0] == 'extra') {
        i.update({
            content: `# Extra Features\nI don't blame you if you want to turn some of these off.\nPlease select a subcategory:`,
            components: [new ActionRowBuilder().setComponents(extra_selection) as any]
        });
    }
}

function BaseSelectDropDown(i: StringSelectMenuInteraction) {
    if (i.values[0] == 'okash') {
        i.update({
            content: 'Do you want to enable or disable okash features? This includes:\n' + [
                '- /okash',
                '- /rob',
                '- /shop',
                '- /sell',
                '- /buy',
                '- /move',
                '- /pay'
            ].join('\n'),
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('okash-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('okash-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'levels') {
        i.update({
            content: 'Do you want to enable or disable leveling features? This includes:\n' + [
                '- Messaging XP',
                '- Voice Channel XP',
                'If you wish to only disable the "Level Up" messages, please use the corresponding drop-down option.'
            ].join('\n'),
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('leveling-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('leveling-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'levelup_msg') {
        i.update({
            content: 'Do you want to enable or disable the "Level Up" messages? This includes:\n' + [
                '- "Level Up" messages',
                'If you wish to disable leveling entirely, please use the "Leveling/XP" drop-down option.'
            ].join('\n'),
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('levelup_msg-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('levelup_msg-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'daily') {
        i.update({
            content: 'Do you want to enable or disable the daily features? This includes:\n' + [
                '- /daily',
                '- Daily Reminders',
            ].join('\n'),
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('daily-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('daily-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'drops') {
        i.update({
            content: 'Do you want to enable or disable drop features? This includes:\n' + [
                '- okash Drops',
                '- Lootbox Drops',
            ].join('\n'),
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('drops-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('drops-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
}

function GameSelectDropDown(i: StringSelectMenuInteraction) {
    if (i.values[0] == 'coinflip') {
        i.update({
            content: 'Do you want to enable or disable Coinflip?',
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('coinflip-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('coinflip-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'blackjack') {
        i.update({
            content: 'Do you want to enable or disable Blackjack?',
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('blackjack-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('blackjack-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'roulette') {
        i.update({
            content: 'Do you want to enable or disable Roulette?',
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('roulette-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('roulette-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'slots') {
        i.update({
            content: 'Do you want to enable or disable Slots?',
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('slots-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('slots-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'magicball') {
        i.update({
            content: 'Do you want to enable or disable the Magic 8 Ball?',
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('magicball-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('magicball-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'pixel_guess') {
        i.update({
            content: 'Do you want to enable or disable the Pixel Guessing Game?',
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pixel_guess-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('pixel_guess-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
}

function ExtraSelectDropDown(i: StringSelectMenuInteraction) {
    if (i.values[0] == 'earthquakes') {
        i.update({
            content: 'Do you want to enable or disable /recent-eq?',
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('earthquakes-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('earthquakes-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'catgirl') {
        i.update({
            content: 'Do you want to enable or disable /catgirl?',
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('catgirl-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('catgirl-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'eastereggs') {
        i.update({
            content: 'Do you want to enable or disable text-based easter eggs?',
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('eastereggs-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('eastereggs-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'gemini') {
        i.update({
            content: 'Do you want to enable or disable AI Responses?',
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('gemini-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('gemini-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
    if (i.values[0] == 'reminders') {
        i.update({
            content: 'Do you want to enable or disable the o.remind command?\n**WARNING**: This will prevent all past reminders from being sent in this server!',
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('reminders-on').setLabel('Enable').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('reminders-off').setLabel('Disable').setStyle(ButtonStyle.Danger)
            ) as any]
        });
    }
}

export const ServerPreferencesSlashCommand = new SlashCommandBuilder()
    .setName('server-preferences')
    .setDescription('(admin only) change okabot server preferences')
    .setContexts(InteractionContextType.Guild);