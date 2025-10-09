import {join} from "path";
import {BASE_DIRNAME} from "../../index";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {
    ChatInputCommandInteraction,
    InteractionContextType,
    PermissionsBitField,
    SlashCommandBuilder
} from "discord.js";
import {ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder} from "@discordjs/builders";

/**
 * A configuration interface that allows server administrators to define
 * which features their server members can use on okabot.
 */
export interface ServerPreferences {
    version: number,
    allowed_features: {
        okash: boolean,
        gambling: boolean,
        games: {
            coinflip: boolean,
            blackjack: boolean,
            roulette: boolean,
            slots: boolean,
            magicball: boolean,
            pixel_guess: boolean,
        },
        earthquakes: boolean,
        easter_eggs: boolean,
        voice_xp: boolean,
        ai_responses: boolean,
        reminders: boolean,
        catgirl: boolean,
    }
}

const FORCED_ELLIGIBILITY_LIST = {
    '961833542491463720': {
        earthquakes: false
    },
    '1348652647963561984': {
        // pixel guessing game is disabled in fsg because it was totally copied from that horse bot
        // and i would feel pretty bad allowing it to be used.
        // if fsg member reading this and thinks it should be otherwise, open an issue.
        pixel_guess: false
    }
}


let SERVER_PREFERENCES_DB: {[key: string]: ServerPreferences} = {};

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
            .setValue('game')
            .setLabel('Games')
            .setDescription('Games, such as blackjack, pixel guessing'),

        new StringSelectMenuOptionBuilder()
            .setValue('extra')
            .setLabel('Extras')
            .setDescription('Extras, such as easter eggs, Gemini features')

    )

export async function HandleServerPrefsCommand(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    if (!interaction.guild) return interaction.reply('Must be in a server to use this command.');
    const guild = await interaction.client.guilds.fetch(interaction.guild.id);
    const guildMember = await guild.members.fetch(interaction.user.id);
    if (!guildMember.permissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply('Must have the "Manage Server" permission to use this command.');

    const reply = await interaction.editReply({
        content: '# Server Configurator Tool\nPlease choose your category:',
        components: [dropdown_section as any]
    });
}

export const ServerPreferencesSlashCommand = new SlashCommandBuilder()
    .setName('server-preferences')
    .setDescription('(admin only) change okabot server preferences')
    .setContexts(InteractionContextType.Guild);