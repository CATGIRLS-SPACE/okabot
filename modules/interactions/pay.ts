import { ChatInputCommandInteraction, Client, SlashCommandBuilder, Snowflake, TextChannel } from "discord.js";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { CheckOkashRestriction, CheckUserIdOkashRestriction, OKASH_ABILITY } from "../user/prefs";
import { Logger } from "okayulogger";
import { Achievements, GrantAchievement } from "../passive/achievement";
import {CheckFeatureAvailability, ServerFeature} from "../system/serverPrefs";
import {CompleteDailyMission, CurrentMissions, DAILY_MISSIONS_EASY} from "../tasks/dailyMissions";
import {EMOJI, GetEmoji} from "../../util/emoji";

const L = new Logger('payment');
const PAYMENT_HISTORY = new Map<Snowflake, {paid: string, time: number}>();

export async function HandleCommandPay(interaction: ChatInputCommandInteraction, client: Client) {
    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.okash)) return interaction.reply({
        content: 'This feature isn\'t available in this server. Maybe ask a server admin to enable it?'
    });
    
    const has_restriction = await CheckOkashRestriction(interaction, OKASH_ABILITY.TRANSFER);
    if (has_restriction) return;

    const d = new Date();

    await interaction.deferReply();

    const sender_id = interaction.user.id;
    const receiver_id = interaction.options.getUser('user')!.id;

    if (receiver_id == client.user!.id) {
        return interaction.editReply({
            content: `:bangbang: **${interaction.user.displayName}**... I'm flattered, but I don't accept payments...`,
        });
    }

    if (sender_id == receiver_id) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, do you need a friend..?`,
        });
    }

    if (interaction.options.getUser('user')!.bot) {
        return interaction.editReply({
            content: `:rotating_light: **${interaction.user.displayName}**, what do you think you're doing?!`,
        });
    }

    const receiver_has_restriction = CheckUserIdOkashRestriction(receiver_id);
    if (receiver_has_restriction) {
        return interaction.editReply({
            content: `:x: **${interaction.user.displayName}**, failed to transfer money to this person.`,
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
            content: `:interrobang: **${interaction.user.displayName}**! That's just plain mean!`,
        });
    }
    
    if (sender_bank_amount < pay_amount) {
        return interaction.editReply({
            content: ':crying_cat_face: You don\'t have that much money!',
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
        content: `:handshake: **${interaction.user.displayName}** paid **${receiver_user.displayName}** ${GetEmoji(EMOJI.OKASH)} OKA**${pay_amount}**! You should say thanks!`
    });
}


export const PaySlashCommand = 
    new SlashCommandBuilder()
        .setName('pay').setNameLocalization('ja', '払う')
        .setDescription('Pay someone some okash')
        .addUserOption(option => 
            option.setName('user').setNameLocalization('ja', 'ユーザ')
            .setDescription('The person to pay').setDescriptionLocalization('ja', '誰を払う')
            .setRequired(true)
        )
        .addNumberOption(option => 
            option.setName('amount').setNameLocalization('ja', '高')
            .setDescription('The amount to pay them').setDescriptionLocalization('ja', 'okashの分量を払う')
            .setRequired(true)
            .setMaxValue(1_000_000)
        );