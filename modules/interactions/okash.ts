import {ChatInputCommandInteraction, Locale, MessageFlags, SlashCommandBuilder, TextChannel} from "discord.js";
import {GetBank, GetWallet} from "../okash/wallet";
import {Achievements, GrantAchievement} from "../passive/achievement";
import {GetCurrentFines} from "../okash/games/rob";
import { LANGV2_INTERACTION, LangV2GetFormatted } from "../../util/langv2";


export async function HandleCommandOkash(interaction: ChatInputCommandInteraction) {
    // await interaction.deferReply();

    const bank = GetBank(interaction.user.id);
    const wallet = GetWallet(interaction.user.id);

    if (bank >= 1_000_000) GrantAchievement(interaction.user, Achievements.CAPITALISM, interaction.channel as TextChannel);

    await interaction.reply({
        content: LangV2GetFormatted(LANGV2_INTERACTION.OKASH,
            'en',
            interaction.user.displayName,
            wallet.toString(),
            bank.toString(),
            GetCurrentFines().toString()
        )
    });
}


export const OkashSlashCommand = 
    new SlashCommandBuilder()
        .setName('okash').setNameLocalization('es-ES', 'okash')
        .setDescription('See how much okash you have on you').setDescriptionLocalization('es-ES', 'Ver tú cantidad de okash en tú billetero y tú banco');