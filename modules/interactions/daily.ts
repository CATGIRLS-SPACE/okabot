import { ChatInputCommandInteraction, Locale, TextChannel } from "discord.js";
import { ClaimDaily, GetDailyStreak } from "../okash/daily";
import { GetEmoji } from "../../util/emoji";


export async function HandleCommandDaily(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const result: number = ClaimDaily(interaction.user.id, false, interaction.channel as TextChannel);

    if (result < 0) {
        // must wait
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, it's too early! Come back <t:${-result}:R> to claim your daily.`
        });
    }

    if (result == 750) {
        // 750 = no streak (technically 1 day)
        if (interaction.locale = Locale.Japanese) return interaction.editReply({
            content: `:white_check_mark: あなたの日常の褒美で${GetEmoji('okash')}OKA**750**と${GetEmoji('cff_green')} 1枚の重いコインをゲットしました！`
        })

        return interaction.editReply({
            content: `:white_check_mark: Got your daily reward of ${GetEmoji('okash')}OKA**750** and a ${GetEmoji('cff_green')} Weighted Coin!\n-# Your daily streak will increase your okash by 5% for every day, up to 100%`
        });
    }

    // plus streak bonus
    const bonus = result - 750;
    const streak_count = GetDailyStreak(interaction.user.id);
    
    let percentage = 100+(100*0.05*(streak_count-1));
    if (percentage > 200) percentage = 200;
    
    interaction.editReply({
        content: `:white_check_mark: Got your daily reward of ${GetEmoji('okash')}OKA**750** (**PLUS OKA${bonus}**) and a ${GetEmoji('cff_green')} Weighted Coin!\n:chart_with_upwards_trend: You currently have a daily streak of ${streak_count} days, meaning you get ${percentage}% of the usual daily!\n-# Your daily streak will increase your okash by 5% for every day, up to 100%`
    });
}
