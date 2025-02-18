import { ChatInputCommandInteraction, Client, EmbedBuilder, SlashCommandBuilder, Snowflake, TextChannel } from "discord.js";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { CheckOkashRestriction, CheckUserIdOkashRestriction, GetUserProfile, ManageDebt, OKASH_ABILITY } from "../user/prefs";
import { Logger } from "okayulogger";
import { Achievements, GrantAchievement } from "../passive/achievement";

const L = new Logger('payment');
const PAYMENT_HISTORY = new Map<Snowflake, {paid: string, time: number}>();

export async function HandleCommandPay(interaction: ChatInputCommandInteraction, client: Client) {
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

    const receiver_has_restriction = CheckUserIdOkashRestriction(receiver_id, OKASH_ABILITY.TRANSFER);
    if (receiver_has_restriction) {
        return interaction.editReply({
            content: `:x: **${interaction.user.displayName}**, failed to transfer money to this person.`,
        });
    }

    let sender_bank_amount = GetWallet(sender_id);
    let receiver_bank_amount = GetWallet(receiver_id);
    
    const sender_prefs = GetUserProfile(interaction.user.id);
    const receiver_prefs = GetUserProfile(receiver_id);

    let pay_amount = Math.floor(interaction.options.getNumber('amount')!);

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
    
    const receiver_user = interaction.options.getUser('user')!;
    L.info(`PAYMENT SUCCESS FOR OKA${pay_amount} | ${interaction.user.username}(${interaction.user.id}) --> ${receiver_user.username}(${receiver_user.id})`);

    ManageDebt(sender_id, receiver_id, pay_amount);

    RemoveFromWallet(sender_id, pay_amount);
    AddToWallet(receiver_id, pay_amount);

    PAYMENT_HISTORY.set(sender_id, {paid: receiver_id, time:d.getTime()});

    const interaction_embed = new EmbedBuilder()
        .setColor(0x9d60cc)
        .setTitle(`okash Transfer of OKA${pay_amount}`)
        .addFields(
            {name:'⬆️ Sender', value:interaction.user.username, inline: true},
            {name:'⬇️ Receiver', value:receiver_user.username, inline: true},
        )
        .setDescription('The payment has been successful and the funds were transferred.');

    interaction.editReply({
        embeds:[interaction_embed]
    });

    const receiver_embed = new EmbedBuilder()
        .setColor(0x9d60cc)
        .setTitle(`You received some okash!`)
        .addFields(
            {name:'⬆️ Sender', value:interaction.user.username, inline: true},
            {name:'⬇️ Receiver', value:receiver_user.username, inline: true},
        )
        .setDescription(`okash Transfer of OKA${pay_amount} | Your new balance is OKA${receiver_bank_amount+pay_amount}.`);


    const sender_embed = new EmbedBuilder()
        .setColor(0x9d60cc)
        .setTitle(`You sent some okash!`)
        .addFields(
            {name:'⬆️ Sender', value:interaction.user.username, inline: true},
            {name:'⬇️ Receiver', value:receiver_user.username, inline: true},
        )
        .setDescription(`okash Transfer of OKA${pay_amount} | Your new balance is OKA${sender_bank_amount-pay_amount}.`);

    if (receiver_prefs.okash_notifications) receiver_user.send({
        embeds:[receiver_embed]
    }).catch(() => {
        (interaction.channel as TextChannel).send({content:`:crying_cat_face: <@!${receiver_id}>, your DMs are closed, so I have to send your receipt here!`, embeds:[receiver_embed]});
    });
    
    if (sender_prefs.okash_notifications) interaction.user.send({
        embeds:[sender_embed]
    }).catch(() => {
        (interaction.channel as TextChannel).send({content:`:crying_cat_face: **${interaction.user.displayName}**, your DMs are closed, so I have to send your receipt here!`, embeds:[sender_embed]});
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
            .setMaxValue(50_000)
        );