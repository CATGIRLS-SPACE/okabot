import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Interaction,
    SlashCommandBuilder,
    TextChannel
} from "discord.js";
import {ClaimDaily} from "../okash/daily";
import {quickdraw, ScheduleDailyReminder} from "../tasks/dailyRemind";
import {Achievements, GrantAchievement} from "../passive/achievement";
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import {GetUserSupportStatus, GetUserTesterStatus} from "../../util/users";
import {CheckFeatureAvailability, ServerFeature} from "../system/serverPrefs";
import {AddXP} from "../levels/onMessage";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {AddOneToInventory, AddToWallet} from "../okash/wallet";
import {ITEMS} from "../okash/items";
import {CompleteDailyMission, CurrentMissions, DAILY_MISSIONS_EASY} from "../tasks/dailyMissions";
import {t} from "../i18n/translation";

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

        if (all_scrap_count != 0) {
            AddXP(interaction.user.id, interaction.channel as TextChannel, Math.ceil(all_scrap_count * 0.5));
            AddToWallet(interaction.user.id, all_scrap_count * 5);

            if (interaction.channel!.isSendable()) interaction.channel.send({
                content: `:grey_exclamation: **${interaction.user.displayName}**, due to the removal of scraps, your **${all_scrap_count} scraps** have been converted to ${GetEmoji(EMOJI.OKASH)} OKA**${all_scrap_count * 5}** and **${Math.ceil(all_scrap_count * 0.5)} XP**. **(+${Math.ceil(all_scrap_count * 0.5)}XP)**`,
            });
        }
    }

    await interaction.deferReply();
    const d = new Date();

    const result: number = ClaimDaily(interaction.user.id, false, interaction.channel as TextChannel);

    if (result < 0) {
        const localizedRemindButton = new ButtonBuilder()
            .setCustomId('remindme')
            .setStyle(ButtonStyle.Primary)
            .setLabel(await t('interactions.daily.reminder.buttons.remind_soon', interaction.okabot.translateable_locale))

        const earlyBar = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                localizedRemindButton
            );

        // must wait
        console.log(result);
        const response = await interaction.editReply({
            content: await t('interactions.daily.too_early', interaction.okabot.translateable_locale, {
                name: interaction.user.displayName,
                time: -result,
                days: profile.daily.streak
            }),
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
            if ((GetUserSupportStatus(i.user.id) != 'ko-fi' && GetUserTesterStatus(i.user.id) != 'cgc-beta') && hours_until > 6) return i.update({
                content: await t('interactions.daily.reminder.not_premium', interaction.okabot.translateable_locale, {name: interaction.user.displayName}),
                components: []
            });

            const ready = -(result * 1000);
            const success = ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel);
        
            if (!success) GrantAchievement(i.user, Achievements.ANGER_OKABOT, i.channel as TextChannel);

            const scheduled = await t('interactions.daily.reminder.scheduled', interaction.okabot.translateable_locale, {
                cat_sunglasses: GetEmoji(EMOJI.CAT_SUNGLASSES)
            });

            i.update({
                content: success ? scheduled : await t('interactions.daily.reminder.already_scheduled', interaction.okabot.translateable_locale, {name: interaction.user.displayName}),
                components:[]
            });
        });

        return;
    }

    if (CurrentMissions.easy.selected == DAILY_MISSIONS_EASY.GET_DAILY_REWARD)
        CompleteDailyMission(interaction.user, 'e', interaction.channel as TextChannel);

    const remindButtonNext = new ButtonBuilder()
        .setCustomId('remindmen')
        .setStyle(ButtonStyle.Primary)
        .setLabel(await t('interactions.daily.reminder.buttons.remind_next', interaction.okabot.translateable_locale));

    const onClaimBar = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            remindButtonNext
        );

    if (result == 1500) {
        // 1500 = no streak (technically 1 day)
        GrantAchievement(interaction.user, Achievements.DAILY, interaction.channel as TextChannel);

        if (quickdraw.has(interaction.user.id) && quickdraw.get(interaction.user.id)! + 60_000 > d.getTime()) GrantAchievement(interaction.user, Achievements.FAST_CLAIM_REMINDER, interaction.channel as TextChannel);

        let reply_content = await t('interactions.daily.init', interaction.okabot.translateable_locale, {
            cat_sunglasses: GetEmoji(EMOJI.CAT_SUNGLASSES),
            okash: GetEmoji(EMOJI.OKASH),
            coin: await t('items.wc.name', interaction.okabot.translateable_locale)
        });
        reply_content += ` **(+250XP)**\n`;

        if (Math.round(Math.random() * 25) == 23) {
            reply_content += await t('interactions.daily.got_shard', interaction.okabot.translateable_locale);
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

            const scheduled = await t('interactions.daily.reminder.scheduled', interaction.okabot.translateable_locale, {
                cat_sunglasses: GetEmoji(EMOJI.CAT_SUNGLASSES)
            });
        
            i.update({
                content: `${previous_content}\n\n` + scheduled,
                components:[]
            });
        });

        return;
    }

    // plus streak bonus
    const bonus = result - 1500;
    const streak_count = profile.daily.streak;

    GrantAchievement(interaction.user, Achievements.DAILY, interaction.channel as TextChannel);
    if (streak_count >= 7) GrantAchievement(interaction.user, Achievements.DAILY_7, interaction.channel as TextChannel);

    let percentage = 100+(100*0.05*(streak_count-1));
    if (percentage > 200) percentage = 200;

    if (quickdraw.has(interaction.user.id) && quickdraw.get(interaction.user.id)! + 60_000 > d.getTime()) GrantAchievement(interaction.user, Achievements.FAST_CLAIM_REMINDER, interaction.channel as TextChannel);

    let content = await t('interactions.daily.init', interaction.okabot.translateable_locale, {
        cat_sunglasses: GetEmoji(EMOJI.CAT_SUNGLASSES),
        okash: GetEmoji(EMOJI.OKASH),
        coin: await t('items.wc.name', interaction.okabot.translateable_locale)
    }) + '\n' + await t('interactions.daily.streak', interaction.okabot.translateable_locale, {
        length: streak_count,
        okash: GetEmoji(EMOJI.OKASH),
        bonus,
        xp: 250 + (Math.min(2*(profile.daily.streak+1), 500)),
    });

    AddToWallet(interaction.user.id, bonus);

    if (Math.round(Math.random() * 25) == 23) {
        content += '\n' + await t('interactions.daily.got_shard', interaction.okabot.translateable_locale, {
            token: GetEmoji(EMOJI.BLACK_MARKET_TOKEN_SHARD)
        });
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
        if ((GetUserSupportStatus(i.user.id) != 'ko-fi' && GetUserTesterStatus(i.user.id) != 'cgc-beta' && GetUserSupportStatus(i.user.id) != 'granted')) return i.update({
            content: `${previous_content}\n\n${await t('interactions.daily.reminder.not_premium', interaction.okabot.translateable_locale, {name: i.user.displayName})}`,
            components: []
        });

        const d = new Date();
        const ready = d.getTime() + (24*60*60*1000);
        ScheduleDailyReminder(ready, interaction.user.id, interaction.channel as TextChannel);

        i.update({
            content: `${previous_content}\n\n` + await t('interactions.daily.reminder.scheduled', interaction.okabot.translateable_locale, {
                cat_sunglasses: GetEmoji(EMOJI.CAT_SUNGLASSES)
            }),
            components:[]
        });
    });
}

export const DailySlashCommand = 
    new SlashCommandBuilder()
        .setName('daily').setNameLocalization('ja', '日常の褒美')
        .setDescription('Get your daily okash reward').setDescriptionLocalization('ja', '日常の褒美をゲットする');