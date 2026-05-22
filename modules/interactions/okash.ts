import {ChatInputCommandInteraction, Message, SlashCommandBuilder, TextChannel} from "discord.js";
import {GetBank, GetWallet} from "../okash/wallet";
import {Achievements, GrantAchievement} from "../passive/achievement";
import {GetCurrentFines} from "../okash/games/rob";
import {CheckFeatureAvailability, ServerFeature} from "../system/serverPrefs";
import {t} from "../i18n/translation";
import {EMOJI, GetEmoji} from "../../util/emoji";


export async function HandleCommandOkash(interaction: ChatInputCommandInteraction) {
    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.okash)) return interaction.reply({
        content: 'This feature isn\'t available in this server. Maybe ask a server admin to enable it?'
    });

    await interaction.deferReply();

    const bank = GetBank(interaction.user.id);
    const wallet = GetWallet(interaction.user.id);

    if (bank >= 1_000_000) GrantAchievement(interaction.user, Achievements.CAPITALISM, interaction.channel as TextChannel);

    await interaction.editReply({
        content: await t('interactions.okash', interaction.okabot.translateable_locale, {
            cat_money: GetEmoji(EMOJI.CAT_MONEY_EYES),
            okash: GetEmoji(EMOJI.OKASH),
            bank,
            wallet,
            fines: GetCurrentFines(),
            name: interaction.user.displayName
        })
    });
}


export async function TextBasedOkash(message: Message) {
    if (!CheckFeatureAvailability(message.guild!.id, ServerFeature.okash)) return message.reply({
        content: 'This feature isn\'t available in this server. Maybe ask a server admin to enable it?'
    });

    const bank = GetBank(message.author.id);
    const wallet = GetWallet(message.author.id);

    if (bank >= 1e6) GrantAchievement(message.author, Achievements.CAPITALISM, message.channel as TextChannel)

    await message.reply({
        content: await t('interactions.okash', 'en-US', {
            cat_money: GetEmoji(EMOJI.CAT_MONEY_EYES),
            okash: GetEmoji(EMOJI.OKASH),
            bank,
            wallet,
            fines: GetCurrentFines(),
            name: message.author.displayName
        })
    })
}


export const OkashSlashCommand = 
    new SlashCommandBuilder()
        .setName('okash').setNameLocalization('es-ES', 'okash')
        .setDescription('See how much okash you have on you').setDescriptionLocalization('es-ES', 'Ver tú cantidad de okash en tú billetero y tú banco');