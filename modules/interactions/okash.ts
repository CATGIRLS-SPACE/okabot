import {ChatInputCommandInteraction, Locale, MessageFlags, SlashCommandBuilder, TextChannel} from "discord.js";
import {GetBank, GetWallet} from "../okash/wallet";
import {Achievements, GrantAchievement} from "../passive/achievement";
import {LANG_INTERACTION, LangGetAutoTranslatedString} from "../../util/language";
import {GetCurrentFines} from "../okash/games/rob";


export async function HandleCommandOkash(interaction: ChatInputCommandInteraction) {
    // await interaction.deferReply();

    const bank = GetBank(interaction.user.id);

    if (bank >= 1_000_000) GrantAchievement(interaction.user, Achievements.CAPITALISM, interaction.channel as TextChannel);

    const wallet = GetWallet(interaction.user.id);

    await interaction.reply({
        content: await LangGetAutoTranslatedString(LANG_INTERACTION.OKASH,
            interaction.okabot.locale,
            interaction.user.displayName,
            wallet.toString(),
            bank.toString(),
            GetCurrentFines().toString()
        )
    });
}


export const OkashSlashCommand = 
    new SlashCommandBuilder()
        .setName('okash').setNameLocalization('ja', 'okash')
        .setDescription('See how much okash you have on you').setDescriptionLocalization('ja', 'ポケットにと銀行にokash持ち見ます');