import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Locale, SlashCommandBuilder, TextChannel } from "discord.js";
import { ClaimDaily, GetDailyStreak } from "../okash/daily";
import { GetEmoji } from "../../util/emoji";
import { ScheduleDailyReminder } from "../tasks/dailyRemind";

const remindButton = new ButtonBuilder()
    .setCustomId('remindme')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Remind Me');

const earlyBar = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
        remindButton
    );

export async function HandleCommandDaily(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const result: number = ClaimDaily(interaction.user.id, false, interaction.channel as TextChannel);

    if (result < 0) {
        let response;

        // must wait
        if (interaction.locale == Locale.Japanese) response = await interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, あまりに早くです！あなたの日常の褒美は【<t:${-result}:R>】`,
            components: [earlyBar]
        });
        else response = await interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, it's too early! Come back <t:${-result}:R> to claim your daily.`,
            components: [earlyBar]
        });

        const collectorFilter = (i: any) => i.user.id === interaction.user.id;

        const collector = response.createMessageComponentCollector({ filter: collectorFilter, time: 30_000 });

        collector.on('collect', async i => {
            const d = new Date;
            const ready = -(result * 1000);
            ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel); // 5 seconds for testing purposes
        
            i.update({
                content: `:white_check_mark: Okaaay! I'll remind you when your daily is ready <t:${Math.floor(ready/1000)}:R>!`
            });
        });

        return;
    }

    if (result == 750) {
        // 750 = no streak (technically 1 day)
        if (interaction.locale == Locale.Japanese) return interaction.editReply({
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

    if (interaction.locale == Locale.Japanese) return interaction.editReply({
        content: `:white_check_mark: あなたの日常の褒美で${GetEmoji('okash')}OKA**${750+bonus}**（ボーナス${bonus}）と${GetEmoji('cff_green')} 1枚の重いコインをゲットしました！\nあなたの日刊連勝は${streak_count}日。褒美＋${100-percentage}%をゲットしました！`
    })
    
    interaction.editReply({
        content: `:white_check_mark: Got your daily reward of ${GetEmoji('okash')}OKA**750** (**PLUS OKA${bonus}**) and a ${GetEmoji('cff_green')} Weighted Coin!\n:chart_with_upwards_trend: You currently have a daily streak of ${streak_count} days, meaning you get ${percentage}% of the usual daily!\n-# Your daily streak will increase your okash by 5% for every day, up to 100%`
    });
}


export const DailySlashCommand = 
    new SlashCommandBuilder()
        .setName('daily').setNameLocalization('ja', '日常の褒美')
        .setDescription('Get your daily okash reward').setDescriptionLocalization('ja', '日常の褒美をゲットする');