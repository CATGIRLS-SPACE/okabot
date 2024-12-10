import { ChatInputCommandInteraction, Client, EmbedBuilder, TextChannel } from "discord.js";
import { AddToWallet, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { GetUserProfile } from "../user/prefs";


export async function HandleCommandPay(interaction: ChatInputCommandInteraction, client: Client) {
    await interaction.deferReply();

    const sender_id = interaction.user.id;
    const receiver_id = interaction.options.getUser('user')!.id;

    if (receiver_id == client.user!.id) {
        return interaction.editReply({
            content: `:bangbang: <@!${sender_id}>... I'm flattered, but I don't accept payments...`,
        });
    }

    if (sender_id == receiver_id) {
        return interaction.editReply({
            content: `:crying_cat_face: <@!${sender_id}>, do you need a friend..?`,
        });
    }

    if (interaction.options.getUser('user')!.bot) {
        return interaction.editReply({
            content: `:rotating_light: <@!${sender_id}>, what do you think you're doing?!`,
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
            content: `:interrobang: <@!${sender_id}>! That's just plain mean!`,
        });
    }
    
    if (sender_bank_amount < pay_amount) {
        return interaction.editReply({
            content: ':crying_cat_face: You don\'t have that much money!',
        });
    }
    
    RemoveFromWallet(sender_id, pay_amount);
    AddToWallet(receiver_id, pay_amount);

    const interaction_embed = new EmbedBuilder()
        .setColor(0x9d60cc)
        .setTitle(`okash Transfer of OKA${pay_amount}`)
        .addFields(
            {name:'⬆️ Sender', value:interaction.user.username, inline: true},
            {name:'⬇️ Receiver', value:interaction.options.getUser('user')!.username, inline: true},
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
            {name:'⬇️ Receiver', value:interaction.options.getUser('user')!.username, inline: true},
        )
        .setDescription(`okash Transfer of OKA${pay_amount} | Your new balance is OKA${receiver_bank_amount+pay_amount}.`);


    const sender_embed = new EmbedBuilder()
        .setColor(0x9d60cc)
        .setTitle(`You sent some okash!`)
        .addFields(
            {name:'⬆️ Sender', value:interaction.user.username, inline: true},
            {name:'⬇️ Receiver', value:interaction.options.getUser('user')!.username, inline: true},
        )
        .setDescription(`okash Transfer of OKA${pay_amount} | Your new balance is OKA${sender_bank_amount-pay_amount}.`);

    if (receiver_prefs.okash_notifications) interaction.options.getUser('user')!.send({
        embeds:[receiver_embed]
    }).catch(() => {
        (interaction.channel as TextChannel).send({content:`:crying_cat_face: <@!${receiver_id}>, your DMs are closed, so I have to send your receipt here!`, embeds:[receiver_embed]});
    });
    
    if (sender_prefs.okash_notifications) interaction.user.send({
        embeds:[sender_embed]
    }).catch(() => {
        (interaction.channel as TextChannel).send({content:`:crying_cat_face: <@!${sender_id}>, your DMs are closed, so I have to send your receipt here!`, embeds:[sender_embed]});
    });
}
