import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Interaction,
    Message,
    SlashCommandBuilder,
    TextChannel
} from "discord.js";
import {ClaimDaily, GetDailyStreak} from "../okash/daily";
import {quickdraw, ScheduleDailyReminder} from "../tasks/dailyRemind";
import {Achievements, GrantAchievement} from "../passive/achievement";
import {LANG_INTERACTION, LANG_ITEMS, LangGetAutoTranslatedString, LangGetFormattedString} from "../../util/language";
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import {GetUserSupportStatus, GetUserTesterStatus} from "../../util/users";
import {GetLastLocale} from "../..";
import {CheckFeatureAvailability, ServerFeature} from "../system/serverPrefs";
import {AddXP} from "../levels/onMessage";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {AddOneToInventory, AddToWallet} from "../okash/wallet";
import {ITEMS} from "../okash/items";

export async function HandleCommandDaily(interaction: ChatInputCommandInteraction) {
    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.daily)) return interaction.reply({
        content: 'This feature isn\'t available in this server. Maybe ask a server admin to enable it?'
    });

    // scrap removal checks
    const profile = GetUserProfile(interaction.user.id);
    if (profile.inventory_scraps) {
        const p = profile.inventory_scraps;
        const all_scrap_count = p.plastic + p.rubber + p.wood + p.electrical + p.metal;
        profile.inventory_scraps = undefined;
        UpdateUserProfile(interaction.user.id, profile);

        AddXP(interaction.user.id, interaction.channel as TextChannel, Math.ceil(all_scrap_count * 0.5));
        AddToWallet(interaction.user.id, all_scrap_count * 5);

        if (interaction.channel!.isSendable()) interaction.channel.send({
            content: `:grey_exclamation: **${interaction.user.displayName}**, due to the removal of scraps, your **${all_scrap_count} scraps** have been converted to ${GetEmoji(EMOJI.OKASH)} OKA**${all_scrap_count * 5}** and **${Math.ceil(all_scrap_count * 0.5)} XP**. **(+${Math.ceil(all_scrap_count * 0.5)}XP)**`,
        });
    }

    await interaction.deferReply();
    const d = new Date();

    const result: number = ClaimDaily(interaction.user.id, false, interaction.channel as TextChannel);

    if (result < 0) {
        const localizedRemindButton = new ButtonBuilder()
            .setCustomId('remindme')
            .setStyle(ButtonStyle.Primary)
            .setLabel(await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_BUTTON, interaction.okabot.translateable_locale));

        const earlyBar = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                localizedRemindButton
            );

        // must wait
        console.log(result);
        const response = await interaction.editReply({
            content: await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_TOO_EARLY, interaction.okabot.translateable_locale, interaction.user.displayName, -result) + `\nYour current daily streak: ${profile.daily.streak} day(s)`,
            components: [earlyBar]
        });

        const collectorFilter = (i: Interaction) => i.user.id === interaction.user.id;

        const collector = response.createMessageComponentCollector({ filter: collectorFilter, time: 30_000 });

        collector.on('collect', async i => {
            // remind me button
            // requires supporter
            const d = new Date;
            const hours_until = Math.round((-(result*1000) - d.getTime())/1000) / 3600;
            console.log(`${hours_until} hours until...`);
            if ((GetUserSupportStatus(i.user.id) != 'ko-fi' && GetUserTesterStatus(i.user.id) != 'cgc-beta' && i.guildId != '1348652647963561984') && hours_until > 6) return i.update({
                content: `:crying_cat_face: Sorry, **${interaction.user.displayName}**, but in order to get reminders more than 6 hours later, you must be a supporter!`,
                components: []
            });

            const ready = -(result * 1000);
            const success = ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel); // 5 seconds for testing purposes
        
            if (!success) GrantAchievement(i.user, Achievements.ANGER_OKABOT, i.channel as TextChannel);

            const scheduled = interaction.user.id == '1007774901387677778' ?
                await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_SCHEDULED_KROWNED, interaction.okabot.translateable_locale)
                : await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_SCHEDULED, interaction.okabot.translateable_locale);

            i.update({
                content: success ? scheduled
                :await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_ANGRY, interaction.okabot.translateable_locale, interaction.user.displayName),
                components:[]
            });
        });

        return;
    }

    const remindButtonNext = new ButtonBuilder()
        .setCustomId('remindmen')
        .setStyle(ButtonStyle.Primary)
        .setLabel(await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_BUTTON, interaction.okabot.translateable_locale));

    const onClaimBar = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            remindButtonNext
        );

    if (result == 1500) {
        // 1500 = no streak (technically 1 day)
        GrantAchievement(interaction.user, Achievements.DAILY, interaction.channel as TextChannel);

        if (quickdraw.has(interaction.user.id) && quickdraw.get(interaction.user.id)! + 60_000 > d.getTime()) GrantAchievement(interaction.user, Achievements.FAST_CLAIM_REMINDER, interaction.channel as TextChannel);

        let reply_content = await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY, interaction.okabot.translateable_locale, await LangGetAutoTranslatedString(LANG_ITEMS.WEIGHTED_COIN, interaction.okabot.translateable_locale));
        reply_content += ` **(+250XP)**\n`;

        if (Math.round(Math.random() * 25) == 23) {
            reply_content += LangGetFormattedString(LANG_INTERACTION.DAILY_GOT_SHARD, interaction.okabot.translateable_locale);
            AddOneToInventory(interaction.user.id, ITEMS.BLACKMARKET_TOKEN_SHARD);
        }

        const response = await interaction.editReply({
            content: reply_content,
            components: [onClaimBar]
        });

        const collectorFilter = (i: Interaction) => i.user.id === interaction.user.id;
        const collector = response.createMessageComponentCollector({ filter: collectorFilter, time: 30_000 });
        collector.on('collect', async i => {
            const d = new Date();
            const ready = d.getTime() + (24*60*60*1000);
            ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel);

            const previous_content = i.message;

            const scheduled = interaction.user.id == '1007774901387677778' ?
                await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_SCHEDULED_KROWNED, interaction.okabot.translateable_locale)
                : await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_SCHEDULED, interaction.okabot.translateable_locale);
        
            i.update({
                content: `${previous_content}\n\n` + scheduled,
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

    let percentage = 100+(100*0.05*(streak_count-1));
    if (percentage > 200) percentage = 200;

    if (quickdraw.has(interaction.user.id) && quickdraw.get(interaction.user.id)! + 60_000 > d.getTime()) GrantAchievement(interaction.user, Achievements.FAST_CLAIM_REMINDER, interaction.channel as TextChannel);

    let content = await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY, interaction.okabot.translateable_locale, await LangGetAutoTranslatedString(LANG_ITEMS.WEIGHTED_COIN, interaction.okabot.translateable_locale)) + '\n' + await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_STREAK, interaction.okabot.translateable_locale, streak_count, bonus);
    content += ` **(+${250 + (Math.min(2*(profile.daily.streak+1), 1000))}XP)**\n`;

    if (Math.round(Math.random() * 25) == 23) {
        content += LangGetFormattedString(LANG_INTERACTION.DAILY_GOT_SHARD, interaction.okabot.translateable_locale);
        AddOneToInventory(interaction.user.id, ITEMS.BLACKMARKET_TOKEN_SHARD);
    }

    const response = await interaction.editReply({
        content: content,
        components: [onClaimBar]
    });

    const collectorFilter = (i: Interaction) => i.user.id === interaction.user.id;
    const collector = response.createMessageComponentCollector({ filter: collectorFilter, time: 30_000 });
    collector.on('collect', async i => {
        // remind me button
        const previous_content = i.message;

        // requires supporter
        if ((GetUserSupportStatus(i.user.id) != 'ko-fi' && GetUserTesterStatus(i.user.id) != 'cgc-beta' && i.guildId != '1348652647963561984')) return i.update({
            content: `${previous_content}\n\n:crying_cat_face: Sorry, **${interaction.user.displayName}**, but in order to get reminders more than 6 hours later, you must be a supporter!`,
            components: []
        });

        const d = new Date();
        const ready = d.getTime() + (24*60*60*1000);
        ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel);

        i.update({
            content: `${previous_content}\n\n` + await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_REMINDER_SCHEDULED, interaction.okabot.translateable_locale),
            components:[]
        });
    });
}


export async function TextBasedDaily(message: Message) {
    // const d = new Date();
    const result = ClaimDaily(message.author.id, false, message.channel as TextChannel);

    const profile = GetUserProfile(message.author.id);

    if (result < 0) return message.reply({
        content: await LangGetAutoTranslatedString(LANG_INTERACTION.DAILY_TOO_EARLY, GetLastLocale(message.author.id), message.author.displayName, -result) + `\nYour current daily streak: ${profile.daily.streak} day(s)\n-# You can't schedule reminders with text-based commands. Run /daily instead to do so!`
    });
}


export const DailySlashCommand = 
    new SlashCommandBuilder()
        .setName('daily').setNameLocalization('ja', '日常の褒美')
        .setDescription('Get your daily okash reward').setDescriptionLocalization('ja', '日常の褒美をゲットする');