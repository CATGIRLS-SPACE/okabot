import { ChatInputCommandInteraction } from "discord.js";
import { ClaimDaily, GetDailyStreak } from "../okash/daily";


export async function HandleCommandDaily(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const result: number = ClaimDaily(interaction.user.id);

    if (result < 0) {
        // must wait
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, it's too early! Come back <t:${-result}:R> to claim your daily.`
        });
    }

    if (result == 750) {
        // 750 = no streak (technically 1 day)
        return interaction.editReply({
            content: `:white_check_mark: Got your daily reward of OKA750!\n-# Your daily streak will increase your okash by 5% for every day, up to 100%`
        });
    }

    // plus streak bonus
    const bonus = result - 750;
    interaction.editReply({
        content: `:white_check_mark: Got your daily reward of OKA750 **PLUS OKA${bonus}**!\n:chart_with_upwards_trend: You currently have a daily streak of ${GetDailyStreak(interaction.user.id)} days!\n-# Your daily streak will increase your okash by 5% for every day, up to 100%`
    });
}
