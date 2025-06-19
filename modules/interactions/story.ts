import {
    ActionRowBuilder, AnyComponentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction, InteractionContextType,
    MessageFlags,
    SlashCommandBuilder
} from "discord.js";
import { ReadChapterData } from "../story/lorebook";
import { GetUserProfile } from "../user/prefs";


const NextPageButton = new ButtonBuilder()
    .setEmoji('➡️')
    .setCustomId('next-page')
    .setStyle(ButtonStyle.Primary);

const PrevPageButton = new ButtonBuilder()
    .setEmoji('⬅️')
    .setCustomId('prev-page')
    .setStyle(ButtonStyle.Primary);

const LastPageButton = new ButtonBuilder()
    .setEmoji('⏭️')
    .setCustomId('last-page')
    .setStyle(ButtonStyle.Secondary);

const FirstPageButton = new ButtonBuilder()
    .setEmoji('⏮️')
    .setCustomId('first-page')
    .setStyle(ButtonStyle.Secondary);


const componentRowFirst = new ActionRowBuilder()
    .addComponents(NextPageButton, LastPageButton);

const componentRowLast = new ActionRowBuilder()
    .addComponents(FirstPageButton, PrevPageButton);

const componentRowDefault = new ActionRowBuilder()
    .addComponents(FirstPageButton, PrevPageButton, NextPageButton, LastPageButton);

export async function HandleCommandStory(interaction: ChatInputCommandInteraction) {
    const profile = GetUserProfile(interaction.user.id);
    const story_number = interaction.options.getNumber('story', true) - 1;
    const page_number = interaction.options.getNumber('page', true) - 1;
    if (!profile.story_unlocks.includes(story_number + 1)) return interaction.reply({
        content: `:crying_cat_face: You don't have that story unlocked, or it doesn't exist yet!`,
        flags: [MessageFlags.Ephemeral]
    });

    const story_data = await ReadChapterData(story_number, page_number);

    if (!story_data.success) return interaction.reply({
        content: `:x: An error occurred loading the story.\nError: ${story_data.data}`,
        flags: [MessageFlags.Ephemeral]
    });

    let componentRow = componentRowDefault;

    if (page_number == 0) componentRow = componentRowFirst;
    if (page_number+1 == story_data.page_count) componentRow = componentRowLast;

    const reply = await interaction.reply({
        content: story_data.data,
        flags: [MessageFlags.Ephemeral],
        components: [componentRow as any]
    });

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;
    const collector = reply.createMessageComponentCollector({filter: collectorFilter, time: 120_000});
    collector.on('collect', async i => {
        await i.deferUpdate();

        const reply_content = (await reply.fetch()).content;
        let current_page = parseInt(reply_content.split('page ')[1].split('/')[0]) - 1;
        let current_chapter = parseInt(reply_content.split('Ch')[1].split(' ')[0]) - 1;

        let new_story_data;

        if (i.customId == 'next-page') current_page++;
        if (i.customId == 'prev-page') current_page--;
        if (i.customId == 'last-page') {
            new_story_data = await ReadChapterData(current_chapter, current_page);
            current_page = new_story_data.page_count-1;
        }
        if (i.customId == 'first-page') current_page = 0;

        new_story_data = await ReadChapterData(current_chapter, current_page);

        let componentRowUpdate = componentRowDefault;
        if (current_page == 0) componentRowUpdate = componentRowFirst;
        if (current_page+1 == new_story_data.page_count) componentRowUpdate = componentRowLast;

        await i.editReply({
            content: new_story_data.data,
            components: [componentRowUpdate as any]
        });
    });
}


export const StorySlashCommand = new SlashCommandBuilder()
    .setName('story')
    .setDescription('Read a story from the okabot lorebook')
    .addNumberOption(option => option.setName('story').setDescription('Which story to read').setRequired(true))
    .addNumberOption(option => option.setName('page').setDescription('Which page to read').setRequired(true))
    .setContexts(InteractionContextType.Guild)