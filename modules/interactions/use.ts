import { ChatInputCommandInteraction } from "discord.js";
import { RestoreLastDailyStreak, SkipDailyOnce } from "../okash/daily";
import { GEMS, ITEM_TYPE, ITEMS } from "../okash/items";
import { GetInventory, RemoveOneFromInventory } from "../okash/wallet";
import { FLAG, GetUserProfile, UpdateUserProfile, USER_PROFILE } from "../user/prefs";


export async function HandleCommandUse(interaction: ChatInputCommandInteraction) {
    switch (interaction.options.getString('item')!.toLowerCase()) {
        case 'streak restore': case 'g00':
            item_g00(interaction);
            break;

        case 'weighted coin': case 'wc':
            item_weighted_coin(interaction);
            break;
    
        default:
            interaction.reply({
                content:':x: No such item exists, silly!',
                ephemeral: true
            });
            break;
    }
}

// GEMS.STREAK_RESTORE
async function item_g00(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);

    if (inventory.gems.indexOf(GEMS.STREAK_RESTORE) == -1)
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have any <:g00:1315084985589563492> **Streak Restore** gems!`
        });

    const success = await RestoreLastDailyStreak(interaction);

    if (success) RemoveOneFromInventory(interaction.user.id, ITEM_TYPE.GEM, GEMS.STREAK_RESTORE);
}


async function item_weighted_coin(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);
    const preferences: USER_PROFILE = GetUserProfile(interaction.user.id);

    if (inventory.other.indexOf(ITEMS.WEIGHTED_COIN_ONE_USE) == -1) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have any <:cff_green:1315843280776462356> **Weighted Coins**!`
        });
    }

    if (preferences.flags.indexOf(FLAG.WEIGHTED_COIN_EQUIPPED) != -1) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you only need one coin to coinflip!`
        });
    }

    // equip the weighted coin
    preferences.flags.push(FLAG.WEIGHTED_COIN_EQUIPPED);
    UpdateUserProfile(interaction.user.id, preferences);

    RemoveOneFromInventory(interaction.user.id, ITEM_TYPE.ITEM, ITEMS.WEIGHTED_COIN_ONE_USE);    

    interaction.editReply({
        content: `<:cat_sunglasses:1315853022324326482> **${interaction.user.displayName}** can feel their luck increasing already as they equip their <:cff_green:1315843280776462356> **Weighted Coin**.`
    });
}