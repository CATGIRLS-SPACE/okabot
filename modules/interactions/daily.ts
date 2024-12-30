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
            content: `:white_check_mark: Got your daily reward of <:okash:1315058783889657928> OKA**750** and a <:cff_green:1315843280776462356> Weighted Coin!\n-# Your daily streak will increase your okash by 5% for every day, up to 100%`
        });
    }

    // plus streak bonus
    const bonus = result - 750;
    let percentage = 100+(100*0.05*(streak_count-1));
    if (percentage > 200) percentage = 200;
    const streak_count = GetDailyStreak(interaction.user.id);
    interaction.editReply({
        content: `:white_check_mark: Got your daily reward of <:okash:1315058783889657928> OKA**750** (**PLUS OKA${bonus}**) and a <:cff_green:1315843280776462356> Weighted Coin!\n:chart_with_upwards_trend: You currently have a daily streak of ${streak_count} days, meaning you get ${percentage}% of the usual daily!\n-# Your daily streak will increase your okash by 5% for every day, up to 100%`
    });
}
