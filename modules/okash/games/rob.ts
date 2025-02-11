import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, TextChannel } from "discord.js";
import { AddToWallet, GetBank, GetWallet, RemoveFromBank, RemoveFromWallet } from "../wallet";
import { EMOJI, GetEmoji } from "../../../util/emoji";
import { Achievements, GrantAchievement } from "../../passive/achievement";


const MESSAGES = [
    '**#USER1** robs <@#USER2> of #OKASH! Ouch!',
    '**#USER1** steals #OKASH from <@#USER2>! Yikes!',
    'Holy beans, **#USER1** takes a fat #OKASH from <@#USER2>!',
    '<@#USER2> is robbed of #OKASH by **#USER1**! I wouldn\'t let that slide!',
    'Well, <@#USER2> can say goodbye to their #OKASH after being robbed by **#USER1**!'
];

const COOLDOWNS = new Map<string, number>();

export function HandleCommandRob(interaction: ChatInputCommandInteraction) {
    const d = new Date();
    if (COOLDOWNS.has(interaction.user.id) && COOLDOWNS.get(interaction.user.id)! > Math.floor(d.getTime()/1000)) return interaction.reply({
        content: `:hourglass: **${interaction.user.displayName}**, you need to wait a bit before trying to rob! Come back in <t:${COOLDOWNS.get(interaction.user.id)}:R>`,
        flags: [MessageFlags.Ephemeral]
    });

    const robbed_user = interaction.options.getUser('user', true);

    if (robbed_user.id == interaction.user.id) return interaction.reply({
        content: `:x: **${interaction.user.displayName}**, you can't rob yourself!`,
        flags: [MessageFlags.Ephemeral]
    });

    if (robbed_user.bot) return interaction.reply({
        content: `:x: **${interaction.user.displayName}**, you can't rob this person!`,
        flags: [MessageFlags.Ephemeral]
    });

    const robbed_user_balance = GetWallet(robbed_user.id);

    if (robbed_user_balance < 250) {
        return interaction.reply({
            content: `:crying_cat_face: **${robbed_user.displayName}** has too little okash in their pockets to rob!`,
            flags: [MessageFlags.Ephemeral]
        });
    }

    const wallet = GetWallet(interaction.user.id);
    const bank = GetBank(interaction.user.id);
    const total = wallet + bank;

    if (total < 250) {
        return interaction.reply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you have too little okash to your name to rob! You need at least ${GetEmoji(EMOJI.OKASH)} OKA**250**!`,
            flags: [MessageFlags.Ephemeral]
        });
    }

    // set cooldown
    COOLDOWNS.set(interaction.user.id, Math.floor(d.getTime() / 1000) + 3600);

    // chance to fail the rob
    if (Math.random() < 0.34) { 
        const fine = Math.floor(Math.random() * total - 250) + 250;
        
        // calculate how much can be removed from wallet
        if (wallet >= fine) {
            // only need to remove from wallet
            RemoveFromWallet(interaction.user.id, fine);
        } else if (wallet > 0) {
            // can remove some from wallet but not all
            RemoveFromWallet(interaction.user.id, wallet);
            const remaining = fine - wallet;
            RemoveFromBank(interaction.user.id, remaining);
        } else {
            // nothing in wallet, must use the bank
            RemoveFromBank(interaction.user.id, fine);
        }

        interaction.reply({
            content: `:scream_cat: **${interaction.user.displayName}** tries to rob <@${robbed_user.id}>, but fails and is fined ${GetEmoji(EMOJI.OKASH)} OKA**${fine}**!\n-# If your pockets wasn't enough to pay your fine, the remainder was automatically removed from your bank.`
        });
        return GrantAchievement(interaction.user, Achievements.ROB_FINED, interaction.channel as TextChannel); 
    }

    const robbed_amount = Math.floor(Math.random() * (robbed_user_balance * 0.85)) + 15; // min of 15 okash, max of 85% balance

    if (robbed_amount >= 25_000) GrantAchievement(interaction.user, Achievements.ROB_HIGH, interaction.channel as TextChannel); 

    RemoveFromWallet(robbed_user.id, robbed_amount);
    AddToWallet(interaction.user.id, robbed_amount);

    const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
        .replace('#USER1', interaction.user.displayName)
        .replace('#USER2', robbed_user.id)
        .replace('#OKASH', `${GetEmoji(EMOJI.OKASH)} OKA**${robbed_amount}**`);
    
    interaction.reply({
        content: `:bangbang: ${msg}`
    });
}



export const RobSlashCommand = new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Try and rob someone for some okash')
    .addUserOption(o => o
        .setName('user')
        .setDescription('who you want to rob')
        .setRequired(true)
    );