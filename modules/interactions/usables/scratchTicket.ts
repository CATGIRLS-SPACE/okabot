import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GetUserProfile } from "../../user/prefs";
import { ITEMS } from "../../okash/items";
import { AddToWallet, RemoveOneFromInventory } from "../../okash/wallet";
import { EMOJI, GetEmoji } from "../../../util/emoji";


enum MAIN_REWARD {
    LOSS,
    SMALL,
    MEDIUM,
    LARGE,
    JACKPOT
};

enum SUB_REWARD {
    SMALL,
    MEDIUM,
    LARGE
}

const PAYOUTS = {
    SMALL: [
        100,
        250,
        500
    ],
    MEDIUM: [
        1_000,
        3_000,
        5_000,
    ],
    LARGE: [
        5_000,
        10_000,
        15_000
    ],
    JACKPOT: [
        25_000,
        50_000,
        100_000
    ]
};

export async function scratch_ticket(interaction: ChatInputCommandInteraction) {
    const profile = GetUserProfile(interaction.user.id);
    if (!profile.inventory.includes(ITEMS.LOT_SCRATCH)) return interaction.reply({
        content:`:crying_cat_face: **${interaction.user.displayName}**, you don't have a :ticket: **Scratch Ticket**!`,
        flags: [MessageFlags.SuppressNotifications]
    });

    RemoveOneFromInventory(interaction.user.id, ITEMS.LOT_SCRATCH);

    const reward_tier_roll = Math.floor((Math.random() * 50) - 1) + 1;
    let reward_tier = MAIN_REWARD.LOSS;

    if (reward_tier_roll > 15) reward_tier = MAIN_REWARD.SMALL;
    if (reward_tier_roll > 30) reward_tier = MAIN_REWARD.MEDIUM; 
    if (reward_tier_roll > 37) reward_tier = MAIN_REWARD.LARGE; 
    if (reward_tier_roll > 45) reward_tier = MAIN_REWARD.JACKPOT; 

    const reward_value = <SUB_REWARD> (Math.floor((Math.random() * 3) - 1) + 1);

    const reply = await interaction.reply({
        content:`:grey_question: **${interaction.user.displayName}** scratches their :ticket: **Scratch Ticket**...`,
        flags: [MessageFlags.SuppressNotifications]
    });

    await new Promise(r => setTimeout(r, 3000));

    switch (reward_tier) {
        case MAIN_REWARD.LOSS:
            reply.edit(`:crying_cat_face: **${interaction.user.displayName}** scratches their :ticket: **Scratch Ticket**... and nothing good comes of it...`);
            break;

        case MAIN_REWARD.SMALL:
            reply.edit(`${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}** scratches their :ticket: **Scratch Ticket**... and gets a small payout of ${GetEmoji(EMOJI.OKASH)} OKA**${PAYOUTS.SMALL[reward_value]}**!`);
            AddToWallet(interaction.user.id, PAYOUTS.SMALL[reward_value]);
            break;

        case MAIN_REWARD.MEDIUM:
            reply.edit(`${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}** scratches their :ticket: **Scratch Ticket**... and gets a decent payout of ${GetEmoji(EMOJI.OKASH)} OKA**${PAYOUTS.MEDIUM[reward_value]}**!`);
            AddToWallet(interaction.user.id, PAYOUTS.MEDIUM[reward_value]);
            break;

        case MAIN_REWARD.LARGE:
            reply.edit(`${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}** scratches their :ticket: **Scratch Ticket**... and gets a big payout of ${GetEmoji(EMOJI.OKASH)} OKA**${PAYOUTS.LARGE[reward_value]}**!`);
            AddToWallet(interaction.user.id, PAYOUTS.LARGE[reward_value]);
            break;

        case MAIN_REWARD.JACKPOT:
            reply.edit(`${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}** scratches their :ticket: **Scratch Ticket**... and gets a **jackpot** of ${GetEmoji(EMOJI.OKASH)} OKA**${PAYOUTS.JACKPOT[reward_value]}**!`);
            AddToWallet(interaction.user.id, PAYOUTS.JACKPOT[reward_value]);
            break;
    }
}