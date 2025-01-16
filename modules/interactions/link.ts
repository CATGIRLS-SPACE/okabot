import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { LinkWSToUserId } from "../http/server";


export async function HandleCommandLink(interaction: ChatInputCommandInteraction) {
    const link_code = interaction.options.getString('code', true);

    LinkWSToUserId(interaction.user, link_code);

    interaction.reply({
        content:`:white_check_mark: Linked to browser page!`,
        flags: [MessageFlags.Ephemeral]
    });
}