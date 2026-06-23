import { ChatInputCommandInteraction, Client, SlashCommandBuilder, Snowflake, TextChannel } from "discord.js";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { CheckOkashRestriction, CheckUserIdOkashRestriction, OKASH_ABILITY } from "../user/prefs";
import { Logger } from "okayulogger";
import { Achievements, GrantAchievement } from "../passive/achievement";
import {CheckFeatureAvailability, ServerFeature} from "../system/serverPrefs";
import {CompleteDailyMission, CurrentMissions, DAILY_MISSIONS_EASY} from "../tasks/dailyMissions";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {t} from "../i18n/translation";

const L = new Logger('payment');
const PAYMENT_HISTORY = new Map<Snowflake, {paid: string, time: number}>();

export async function HandleCommandPay(interaction: ChatInputCommandInteraction, client: Client) {
    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.okash)) return interaction.reply({
        content: await t('system.errors.command.disabled', interaction.okabot.translateable_locale)
    });
    
    const has_restriction = await CheckOkashRestriction(interaction, OKASH_ABILITY.TRANSFER);
    if (has_restriction) return;

    const d = new Date();

    await interaction.deferReply();

    const sender_id = interaction.user.id;
    const receiver_id = interaction.options.getUser('user')!.id;

    if (receiver_id == interaction.client.user.id) {
        return interaction.editReply({
            content: await t('interactions.pay.errors.paid_okabot', interaction.okabot.translateable_locale, {user: interaction.user.displayName}),
        });
    }

    if (sender_id == receiver_id) {
        return interaction.editReply({
            content: await t('interactions.pay.errors.paid_self', interaction.okabot.translateable_locale, {user: interaction.user.displayName}),
        });
    }

    if (interaction.options.getUser('user')!.bot) {
        return interaction.editReply({
            content: await t('interactions.pay.errors.paid_bot', interaction.okabot.translateable_locale, {user: interaction.user.displayName}),
        });
    }

    const receiver_has_restriction = CheckUserIdOkashRestriction(receiver_id);
    if (receiver_has_restriction) {
        return interaction.editReply({
            content: await t('interactions.pay.errors.paid_banned', interaction.okabot.translateable_locale, {user: interaction.user.displayName}),
        });
    }

    const sender_bank_amount = GetWallet(sender_id);

    const pay_amount = Math.floor(interaction.options.getNumber('amount')!);

    if (pay_amount < 0) {
        return interaction.editReply({
            content: ':broken_heart:',
        });
    }

    if (pay_amount == 0) {
        return interaction.editReply({
            content: await t('interactions.pay.errors.paid_zero', interaction.okabot.translateable_locale, {user: interaction.user.displayName}),
        });
    }
    
    if (sender_bank_amount < pay_amount) {
        return interaction.editReply({
            content: await t('interactions.pay.errors.paid_too_much', interaction.okabot.translateable_locale, {user: interaction.user.displayName}),
        });
    }

    GrantAchievement(interaction.user, Achievements.PAY_USER, interaction.channel as TextChannel);
    if (CurrentMissions.easy.selected == DAILY_MISSIONS_EASY.PAY_USER_OKASH)
        CompleteDailyMission(interaction.user, 'e', interaction.channel as TextChannel);
    
    const receiver_user = interaction.options.getUser('user')!;
    L.info(`PAYMENT SUCCESS FOR OKA${pay_amount} | ${interaction.user.username}(${interaction.user.id}) --> ${receiver_user.username}(${receiver_user.id})`);

    RemoveFromWallet(sender_id, pay_amount);
    AddToWallet(receiver_id, pay_amount);

    PAYMENT_HISTORY.set(sender_id, {paid: receiver_id, time:d.getTime()});

    interaction.editReply({
        content: await t('interactions.pay.success', interaction.okabot.translateable_locale, {
            user: interaction.user.displayName,
            receiver: receiver_user.displayName,
            okash: GetEmoji(EMOJI.OKASH),
            amount: pay_amount
        })
    });
}


export const PaySlashCommand = 
    new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Pay someone some okash')
        .addUserOption(option => 
            option.setName('user')
            .setDescription('The person to pay')
            .setRequired(true)
        )
        .addNumberOption(option => 
            option.setName('amount')
            .setDescription('The amount to pay them')
            .setRequired(true)
            .setMaxValue(1_000_000)
        );