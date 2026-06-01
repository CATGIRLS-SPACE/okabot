import { ActionRowBuilder, ChatInputCommandInteraction, ComponentType, SelectMenuBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { EMOJI, GetEmojiID } from "../../util/emoji";
import {t} from "../i18n/translation";

export async function HandleCommandHelp(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const select_menu = new StringSelectMenuBuilder()
    .setCustomId('page')
    .setPlaceholder(await t('help.menu.select', interaction.okabot.translateable_locale))
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setLabel(await t('help.menu.okash.name', interaction.okabot.translateable_locale))
            .setDescription(await t('help.menu.okash.desc', interaction.okabot.translateable_locale))
            .setValue('okash')
            .setEmoji(GetEmojiID(EMOJI.OKASH)),

        new StringSelectMenuOptionBuilder()
            .setLabel(await t('help.menu.earthquakes.name', interaction.okabot.translateable_locale))
            .setDescription(await t('help.menu.earthquakes.desc', interaction.okabot.translateable_locale))
            .setValue('earthquakes')
            .setEmoji('🌏'),

        new StringSelectMenuOptionBuilder()
            .setLabel(`${await t('help.menu.games.name', interaction.okabot.translateable_locale)} (1/2)`)
            .setDescription(await t('help.menu.games.desc', interaction.okabot.translateable_locale))
            .setValue('games')
            .setEmoji('🎲'),
        new StringSelectMenuOptionBuilder()
            .setLabel(`${await t('help.menu.games.name', interaction.okabot.translateable_locale)} (2/2)`)
            .setDescription(await t('help.menu.games.desc', interaction.okabot.translateable_locale))
            .setValue('games2')
            .setEmoji('🎲'),

        new StringSelectMenuOptionBuilder()
            .setLabel(await t('help.menu.dailies.name', interaction.okabot.translateable_locale))
            .setDescription(await t('help.menu.dailies.desc', interaction.okabot.translateable_locale))
            .setValue('daily')
            .setEmoji('📅'),

        new StringSelectMenuOptionBuilder()
            .setLabel(await t('help.menu.levels.name', interaction.okabot.translateable_locale))
            .setDescription(await t('help.menu.levels.desc', interaction.okabot.translateable_locale))
            .setValue('level')
            .setEmoji('⬆️'),

        new StringSelectMenuOptionBuilder()
            .setLabel(await t('help.menu.drops.name', interaction.okabot.translateable_locale))
            .setDescription(await t('help.menu.drops.desc', interaction.okabot.translateable_locale))
            .setValue('drops')
            .setEmoji('📦'),

        new StringSelectMenuOptionBuilder()
            .setLabel(await t('help.menu.language.name', interaction.okabot.translateable_locale))
            .setDescription(await t('help.menu.language.desc', interaction.okabot.translateable_locale))
            .setValue('language')
            .setEmoji('🌐'),

        new StringSelectMenuOptionBuilder()
            .setLabel(await t('help.menu.extra.name', interaction.okabot.translateable_locale))
            .setDescription(await t('help.menu.extra.desc', interaction.okabot.translateable_locale))
            .setValue('extra')
            .setEmoji('❓'),
    );

    const row = new ActionRowBuilder<SelectMenuBuilder>()
        .addComponents(select_menu);

    const response = await interaction.editReply({
        content: await t('help.first', interaction.okabot.translateable_locale),
        components: [row]
    });

    const collector = response.createMessageComponentCollector({componentType: ComponentType.StringSelect, time: 300_000});
    collector.on('collect', async i => {
        const selection = i.values[0];
        await i.update({content: await t(`help.${selection}`, interaction.okabot.translateable_locale), components: [row]});
    });  
}


export const HelpSlashCommand = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get information on everything okabot');