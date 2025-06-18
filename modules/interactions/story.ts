import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { ReadChapterData } from "../story/lorebook";
import { GetUserProfile } from "../user/prefs";


export async function HandleCommandStory(interaction: ChatInputCommandInteraction) {
    const profile = GetUserProfile(interaction.user.id);
    const story_number = interaction.options.getNumber('story', true) - 1;
    const page_number = interaction.options.getNumber('page', true) - 1;
    if (!profile.story_unlocks.includes(story_number + 1)) return interaction.reply({
        content: `:crying_cat_face: You don't have that story unlocked, or it doesn't exist yet!`,
        flags: [MessageFlags.Ephemeral]
    });

    const story_data = await ReadChapterData(story_number, page_number);
    interaction.reply({
        content: story_data,
        flags: [MessageFlags.Ephemeral]
    });
}


export const StorySlashCommand = new SlashCommandBuilder()
    .setName('story')
    .setDescription('Read a story from the okabot lorebook')
    .addNumberOption(option => option.setName('story').setDescription('Which story to read').setRequired(true))
    .addNumberOption(option => option.setName('page').setDescription('Which page to read').setRequired(true))