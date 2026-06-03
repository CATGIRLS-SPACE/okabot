import {
    ApplicationIntegrationType,
    ChatInputCommandInteraction,
    InteractionContextType,
    SlashCommandBuilder
} from "discord.js";
import {ESLGetDictionary} from "./dictionary";

export async function HandleCommandESL(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand(true);

    switch (sub) {
        case 'dictionary':
            ESLGetDictionary(interaction);
            break;

        case 'tense':
            break;

        case 'pronounce':
            break;
    }
}

export const ESLSlashCommand = new SlashCommandBuilder()
    .setName('esl')
    .setDescription('Tools for assisting with English as a Second Language')
    .setContexts(InteractionContextType.Guild, InteractionContextType.PrivateChannel)
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall)
    .addSubcommand(sc => sc
        .setName('dictionary')
        .setDescription('Get the top definition(s) of a word')
        .addStringOption(input => input
            .setName('word')
            .setDescription('The word to look up')
            .setRequired(true)
        )
    )
    .addSubcommand(sc => sc
        .setName('tense')
        .setDescription('Get the base or alternative tenses of a word')
        .addStringOption(input => input
            .setName('word')
            .setDescription('The word to look up')
            .setRequired(true)
        )
    )
    .addSubcommand(sc => sc
        .setName('pronounce')
        .setDescription('Get the pronunciation of a word')
        .addStringOption(input => input
            .setName('word')
            .setDescription('The word to look up')
            .setRequired(true)
        )
    )