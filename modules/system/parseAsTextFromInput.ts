import {
    ChatInputCommandInteraction, InteractionContextType,
    Message,
    MessagePayload,
    MessageReplyOptions,
    SlashCommandBuilder, TextChannel
} from "discord.js";
import {CheckForFunMessages} from "../passive/funResponses";

/**
 * Allows running a command to emulate a message. Useful for DMs. Not necessary but I had an idea.
 * It's so dumb, isn't it?
 * @param interaction
 * @constructor
 */
export async function ParseAsTextFromInput(interaction: ChatInputCommandInteraction) {
    const reply = await interaction.reply({
        content: `${interaction.user.displayName}: ${interaction.options.getString('message', true)}`
    });
    const faked = {
        author: interaction.user,
        content: interaction.options.getString('message', true),
        channelId: interaction.channel!.id,
        channel: interaction.channel as TextChannel,
        reply: (data: string | MessagePayload) => {
            reply.edit(data);
        },
        isDMBased: () => {
            return interaction.channel!.isDMBased();
        },
        guild: interaction.guild,
        guildId: interaction.guildId
    } as unknown as Message;
    CheckForFunMessages(faked, true);
}

export const EmulateMessageSlashCommand = new SlashCommandBuilder()
    .setName('emulate-message')
    .setDescription('Emulate a text-based message via a command. Useful for DMs.')
    .addStringOption(option => option
        .setName('message')
        .setDescription('The message to emulate.')
        .setRequired(true)
    )
    .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel);