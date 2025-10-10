import {ChatInputCommandInteraction, Message, SlashCommandBuilder, TextChannel} from "discord.js";
import {GetBank, GetWallet} from "../okash/wallet";
import {Achievements, GrantAchievement} from "../passive/achievement";
import {GetCurrentFines} from "../okash/games/rob";
import {LANGV2_INTERACTION, LangV2GetFormatted} from "../../util/langv2";
import {CheckFeatureAvailability, ServerFeature} from "../system/serverPrefs";


export async function HandleCommandOkash(interaction: ChatInputCommandInteraction) {
    // await interaction.deferReply();

    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.okash)) return interaction.reply({
        content: 'This feature isn\'t available in this server. Mabye ask a server admin to enable it?'
    });

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


export async function TextBasedOkash(message: Message) {
    if (!CheckFeatureAvailability(message.guild!.id, ServerFeature.okash)) return message.reply({
        content: 'This feature isn\'t available in this server. Mabye ask a server admin to enable it?'
    });

    const bank = GetBank(message.author.id);
    const wallet = GetWallet(message.author.id);

    if (bank >= 1e6) GrantAchievement(message.author, Achievements.CAPITALISM, message.channel as TextChannel)

    await message.reply({
        content: LangV2GetFormatted(LANGV2_INTERACTION.OKASH,
            'en',
            message.author.displayName,
            wallet.toString(),
            bank.toString(),
            GetCurrentFines().toString()
        )
    })
}


export const OkashSlashCommand = 
    new SlashCommandBuilder()
        .setName('okash').setNameLocalization('es-ES', 'okash')
        .setDescription('See how much okash you have on you').setDescriptionLocalization('es-ES', 'Ver tú cantidad de okash en tú billetero y tú banco');