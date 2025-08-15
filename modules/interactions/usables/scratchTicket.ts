import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { GetUserProfile } from "../../user/prefs";
import { ITEMS } from "../../okash/items";
import { RemoveOneFromInventory } from "../../okash/wallet";


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

}

export async function scratch_ticket(interaction: ChatInputCommandInteraction) {
    const profile = GetUserProfile(interaction.user.id);
    if (!profile.inventory.includes(ITEMS.LOT_SCRATCH)) return interaction.reply({
        content:`:crying_cat_face: **${interaction.user.displayName}**, you don't have a :ticket: **Scratch Ticket**!`,
        flags: [MessageFlags.SuppressNotifications]
    });

    RemoveOneFromInventory(interaction.user.id, ITEMS.LOT_SCRATCH);

    const reward_tier_roll = Math.floor((Math.random() * 50) - 1) + 1;
    let reward_tier = MAIN_REWARD.LOSS;

    if (reward_tier_roll > 10) reward_tier = MAIN_REWARD.SMALL;
    if (reward_tier_roll > 25) reward_tier = MAIN_REWARD.MEDIUM; 
    if (reward_tier_roll > 37) reward_tier = MAIN_REWARD.LARGE; 
    if (reward_tier_roll > 45) reward_tier = MAIN_REWARD.JACKPOT; 

    const reward_value = <SUB_REWARD>  (Math.floor((Math.random() * 3) - 1) + 1);

    interaction.reply({
        content:`:grey_question: **${interaction.user.displayName}** scratches their :ticket: **Scratch Ticket**...`,
        flags: [MessageFlags.SuppressNotifications]
    });

    await new Promise(r => setTimeout(r, 3000));

    switch (reward_tier) {
        
    }
}