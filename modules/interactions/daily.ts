import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Locale,
    SlashCommandBuilder,
    TextChannel
} from "discord.js";
import {ClaimDaily, GetDailyStreak} from "../okash/daily";
import {GetEmoji} from "../../util/emoji";
import {quickdraw, ScheduleDailyReminder} from "../tasks/dailyRemind";
import {Achievements, GrantAchievement} from "../passive/achievement";
import {LANG_INTERACTION, LANG_ITEMS, LangGetFormattedString} from "../../util/language";

const remindButton = new ButtonBuilder()
    .setCustomId('remindme')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Remind Me');

const remindButtonNext = new ButtonBuilder()
    .setCustomId('remindmen')
    .setStyle(ButtonStyle.Primary)
    .setLabel('Remind Me Again');

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

        const localizedRemindButton = new ButtonBuilder()
            .setCustomId('remindme')
            .setStyle(ButtonStyle.Primary)
            .setLabel(LangGetFormattedString(LANG_INTERACTION.DAILY_REMINDER_BUTTON, interaction.okabot.locale));

        const earlyBar = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                localizedRemindButton
            );

        // must wait
        console.log(result);
        response = await interaction.editReply({
            content: LangGetFormattedString(LANG_INTERACTION.DAILY_TOO_EARLY, interaction.okabot.locale, interaction.user.displayName, -result),
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
                content: success?LangGetFormattedString(LANG_INTERACTION.DAILY_REMINDER_SCHEDULED, interaction.okabot.locale)
                :LangGetFormattedString(LANG_INTERACTION.DAILY_REMINDER_ANGRY, interaction.okabot.locale, interaction.user.displayName),
                components:[]
            });
        });

        return;
    }

    if (result == 1500) {
        // 1500 = no streak (technically 1 day)
        GrantAchievement(interaction.user, Achievements.DAILY, interaction.channel as TextChannel);

        if (quickdraw.has(interaction.user.id) && quickdraw.get(interaction.user.id)! + 60_000 > d.getTime()) GrantAchievement(interaction.user, Achievements.FAST_CLAIM_REMINDER, interaction.channel as TextChannel);

        let response;

        response = await interaction.editReply({
            content: LangGetFormattedString(LANG_INTERACTION.DAILY, interaction.okabot.locale, LangGetFormattedString(LANG_ITEMS.WEIGHTED_COIN, interaction.okabot.locale)),
            components: [onClaimBar]
        });

        const collectorFilter = (i: any) => i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter: collectorFilter, time: 30_000 });
        collector.on('collect', async i => {
            const d = new Date();
            const ready = d.getTime() + (24*60*60*1000);
            ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel);

            let previous_content = i.message;
        
            i.update({
                content: `${previous_content}\n\n` + LangGetFormattedString(LANG_INTERACTION.DAILY_REMINDER_SCHEDULED, interaction.okabot.locale),
                components:[]
            });
        });

        return;
    }

    // plus streak bonus
    const bonus = result - 1500;
    const streak_count = GetDailyStreak(interaction.user.id);

    GrantAchievement(interaction.user, Achievements.DAILY, interaction.channel as TextChannel);
    if (streak_count >= 7) GrantAchievement(interaction.user, Achievements.DAILY_7, interaction.channel as TextChannel);
    if (streak_count >= 30) GrantAchievement(interaction.user, Achievements.DAILY_30, interaction.channel as TextChannel);
    if (streak_count >= 61) GrantAchievement(interaction.user, Achievements.DAILY_61, interaction.channel as TextChannel);
    if (streak_count >= 100) GrantAchievement(interaction.user, Achievements.DAILY_100, interaction.channel as TextChannel);
    if (streak_count >= 365) GrantAchievement(interaction.user, Achievements.DAILY_365, interaction.channel as TextChannel);


    
    let percentage = 100+(100*0.05*(streak_count-1));
    if (percentage > 200) percentage = 200;

    if (quickdraw.has(interaction.user.id) && quickdraw.get(interaction.user.id)! + 60_000 > d.getTime()) GrantAchievement(interaction.user, Achievements.FAST_CLAIM_REMINDER, interaction.channel as TextChannel);

    let response;

    let content = LangGetFormattedString(LANG_INTERACTION.DAILY, interaction.okabot.locale, LangGetFormattedString(LANG_ITEMS.WEIGHTED_COIN, interaction.okabot.locale)) + '\n' + LangGetFormattedString(LANG_INTERACTION.DAILY_STREAK, interaction.okabot.locale, streak_count, bonus);

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
        let previous_content = i.message;
    
        i.update({
            content: `${previous_content}\n\n` + LangGetFormattedString(LANG_INTERACTION.DAILY_REMINDER_SCHEDULED, interaction.okabot.locale),
            components:[]
        });
    });
}


export const DailySlashCommand = 
    new SlashCommandBuilder()
        .setName('daily').setNameLocalization('ja', '日常の褒美')
        .setDescription('Get your daily okash reward').setDescriptionLocalization('ja', '日常の褒美をゲットする');