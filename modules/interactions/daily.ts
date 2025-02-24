import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Locale, SlashCommandBuilder, TextChannel } from "discord.js";
import { ClaimDaily, GetDailyStreak } from "../okash/daily";
import { GetEmoji } from "../../util/emoji";
import { quickdraw, ScheduleDailyReminder } from "../tasks/dailyRemind";
import { Achievements, GrantAchievement } from "../passive/achievement";

const remindButton = new ButtonBuilder()
    .setCustomId('remindme')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Remind Me');

const remindButtonNext = new ButtonBuilder()
    .setCustomId('remindmen')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Remind Me Again');

const earlyBar = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
        remindButton
    );

const onClaimBar = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
        remindButtonNext
    );

export async function HandleCommandDaily(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const d = new Date();

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
            const success = ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel); // 5 seconds for testing purposes
        
            if (!success) GrantAchievement(i.user, Achievements.ANGER_OKABOT, i.channel as TextChannel);

            i.update({
                content: success?`:white_check_mark: Okaaay! I'll remind you when your daily is ready <t:${Math.floor(ready/1000)}:R>!`
                :`:pouting_cat: **${interaction.user.displayName}**, I already told you I'd remind you!!`,
                components:[]
            });
        });

        return;
    }

    if (result == 750) {
        // 750 = no streak (technically 1 day)
        GrantAchievement(interaction.user, Achievements.DAILY, interaction.channel as TextChannel);

        if (quickdraw.has(interaction.user.id) && quickdraw.get(interaction.user.id)! + 60_000 > d.getTime()) GrantAchievement(interaction.user, Achievements.FAST_CLAIM_REMINDER, interaction.channel as TextChannel);

        let response;

        let content= `:white_check_mark: Got your daily reward of ${GetEmoji('okash')} OKA**750** and a ${GetEmoji('cff_green')} Weighted Coin!\n-# Your daily streak will increase your okash by 5% for every day, up to 100%`;
        if (interaction.locale == Locale.Japanese) content = `:white_check_mark: あなたの日常の褒美で${GetEmoji('okash')} OKA**750**と${GetEmoji('cff_green')} 1枚の重いコインをゲットしました！`;

        response =  await interaction.editReply({
            content,
            components: [onClaimBar]
        });

        const collectorFilter = (i: any) => i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter: collectorFilter, time: 30_000 });
        collector.on('collect', async i => {
            const d = new Date();
            const ready = d.getTime() + (24*60*60*1000);
            ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel);
        
            i.update({
                content: `${content}\n\n:white_check_mark: Okaaay! I'll remind you when your daily is ready <t:${Math.floor(ready/1000)}:R>!`,
                components:[]
            });
        });

        return;
    }

    // plus streak bonus
    const bonus = result - 750;
    const streak_count = GetDailyStreak(interaction.user.id);

    if (streak_count >= 7) GrantAchievement(interaction.user, Achievements.DAILY_7, interaction.channel as TextChannel);
    if (streak_count >= 30) GrantAchievement(interaction.user, Achievements.DAILY_30, interaction.channel as TextChannel);
    if (streak_count >= 61) GrantAchievement(interaction.user, Achievements.DAILY_61, interaction.channel as TextChannel);
    if (streak_count >= 100) GrantAchievement(interaction.user, Achievements.DAILY_100, interaction.channel as TextChannel);
    if (streak_count >= 365) GrantAchievement(interaction.user, Achievements.DAILY_365, interaction.channel as TextChannel);


    
    let percentage = 100+(100*0.05*(streak_count-1));
    if (percentage > 200) percentage = 200;

    if (quickdraw.has(interaction.user.id) && quickdraw.get(interaction.user.id)! + 60_000 > d.getTime()) GrantAchievement(interaction.user, Achievements.FAST_CLAIM_REMINDER, interaction.channel as TextChannel);

    let response;

    let content = `:white_check_mark: Got your daily reward of ${GetEmoji('okash')} OKA**750** (**PLUS OKA${bonus}**) and a ${GetEmoji('cff_green')} Weighted Coin!\n:chart_with_upwards_trend: You currently have a daily streak of ${streak_count} days, meaning you get ${percentage}% of the usual daily!\n-# Your daily streak will increase your okash by 5% for every day, up to 100%`;
    if (interaction.locale == Locale.Japanese) content = `:white_check_mark: あなたの日常の褒美で${GetEmoji('okash')} OKA**${750+bonus}**（ボーナス${bonus}）と${GetEmoji('cff_green')} 1枚の重いコインをゲットしました！\nあなたの日刊連勝は${streak_count}日。褒美＋${100-percentage}%をゲットしました！`;

    response = await interaction.editReply({
        content,
        components: [onClaimBar]
    });

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;
    const collector = response.createMessageComponentCollector({ filter: collectorFilter, time: 30_000 });
    collector.on('collect', async i => {
        const d = new Date();
        const ready = d.getTime() + (24*60*60*1000);
        ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel);
    
        i.update({
            content: `${content}\n\n:white_check_mark: Okaaay! I'll remind you when your daily is ready <t:${Math.floor(ready/1000)}:R>!`,
            components:[]
        });
    });
}


export const DailySlashCommand = 
    new SlashCommandBuilder()
        .setName('daily').setNameLocalization('ja', '日常の褒美')
        .setDescription('Get your daily okash reward').setDescriptionLocalization('ja', '日常の褒美をゲットする');