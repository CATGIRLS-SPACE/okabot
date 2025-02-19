import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { RestoreLastDailyStreak } from "../okash/daily";
import { ITEM_TYPE, ITEMS } from "../okash/items";
import { AddOneToInventory, AddToWallet, GetInventory, RemoveOneFromInventory } from "../okash/wallet";
import { FLAG, GetUserProfile, UpdateUserProfile, USER_PROFILE } from "../user/prefs";
import { commonLootboxReward, LOOTBOX_REWARD_TYPE, rareLootboxReward } from "../okash/lootboxes";
import { GetEmoji, EMOJI } from "../../util/emoji";

export async function HandleCommandUse(interaction: ChatInputCommandInteraction) {
    switch (interaction.options.getString('item')!.toLowerCase()) {
        case 'streak restore': case 'sr':
            item_streak_restore(interaction);
            break;

        case 'weighted coin': case 'wc':
            item_weighted_coin(interaction);
            break;

        case 'common lootbox': case 'clb': case 'lb':
            item_common_lootbox(interaction);
            break;
        
        case 'rare lootbox': case 'rlb':
            item_rare_lootbox(interaction);
            break;

        default:
            interaction.reply({
                content:':x: No such item exists, silly!',
                flags: [MessageFlags.Ephemeral]
            });
            break;
    }
}

// was GEMS.STREAK_RESTORE, now is ITEMS.STREAK_RESTORE
async function item_streak_restore(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);

    if (inventory.other.indexOf(ITEMS.STREAK_RESTORE) == -1)
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have a ${GetEmoji(EMOJI.STREAK_RESTORE_GEM)} **Streak Restore**!`
        });

    const success = await RestoreLastDailyStreak(interaction);

    if (success) RemoveOneFromInventory(interaction.user.id, ITEMS.STREAK_RESTORE);
}


async function item_weighted_coin(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);
    const preferences: USER_PROFILE = GetUserProfile(interaction.user.id);

    if (inventory.other.indexOf(ITEMS.WEIGHTED_COIN_ONE_USE) == -1) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have any <:cff_green:1315843280776462356> **Weighted Coin**s!`
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

    RemoveOneFromInventory(interaction.user.id, ITEMS.WEIGHTED_COIN_ONE_USE);

    interaction.editReply({
        content: `<:cat_sunglasses:1315853022324326482> **${interaction.user.displayName}** can feel their luck increasing already as they equip their <:cff_green:1315843280776462356> **Weighted Coin**.`
    });
}

async function item_common_lootbox(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);
    // const preferences: USER_PROFILE = GetUserProfile(interaction.user.id);

    if (inventory.other.indexOf(ITEMS.LOOTBOX_COMMON) == -1) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have any :package: **Common Lootboxes**!`
        });
    }

    RemoveOneFromInventory(interaction.user.id, ITEMS.LOOTBOX_COMMON);
    
    await interaction.editReply({
        content: `**${interaction.user.displayName}** opened their :package: **Common Lootbox** and found...`
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const reward = commonLootboxReward();
    let rewardMessage = '';

    switch (reward.type) {
        case LOOTBOX_REWARD_TYPE.ITEM:
            AddOneToInventory(interaction.user.id, reward.value)
            rewardMessage = `a ${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} **Weighted Coin**!`
            break;
    
        case LOOTBOX_REWARD_TYPE.OKASH:
            AddToWallet(interaction.user.id, reward.value)
            rewardMessage = `${GetEmoji(EMOJI.OKASH)} OKA**${reward.value}**`;
            break;

        default:
            break;
    }


    await interaction.editReply({
        content: `**${interaction.user.displayName}** opened their **Common Lootbox** and found ${rewardMessage}`
    })
}
async function item_rare_lootbox(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);
    // const preferences: USER_PROFILE = GetUserProfile(interaction.user.id);

    if (inventory.other.indexOf(ITEMS.LOOTBOX_RARE) == -1) {
        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have any :package: **Rare Lootboxes**!`
        });
    }

    RemoveOneFromInventory(interaction.user.id, ITEMS.LOOTBOX_RARE);
    
    await interaction.editReply({
        content: `**${interaction.user.displayName}** opened their :package: **Rare Lootbox** and found...`
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const reward = rareLootboxReward();
    let rewardMessage = '';

    switch (reward.type) {
        case LOOTBOX_REWARD_TYPE.ITEM:
            AddOneToInventory(interaction.user.id, reward.value);

            // Dynamic message based on the item received
            if (reward.value === ITEMS.WEIGHTED_COIN_ONE_USE) {
                rewardMessage = `a ${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} **Weighted Coin**!`;
            } else if (reward.value === ITEMS.SHOP_VOUCHER) {
                rewardMessage = `a ${GetEmoji(EMOJI.SHOP_VOUCHER)} **Shop Voucher**!`;
            }
            break;
    
        case LOOTBOX_REWARD_TYPE.OKASH:
            AddToWallet(interaction.user.id, reward.value)
            rewardMessage = `${GetEmoji(EMOJI.OKASH)} OKA**${reward.value}**`;
            break;

        default:
            break;
    }
    await interaction.editReply({
        content: `**${interaction.user.displayName}** opened their **Rare Lootbox** and found ${rewardMessage}`
    })
}


export const UseSlashCommand = new SlashCommandBuilder()
    .setName('use').setNameLocalization('ja', '使う')
    .setDescription('Use an item from your pockets!').setDescriptionLocalization('ja', 'ポケットでアイテムを使う')
    .addStringOption(option => 
        option.setName('item').setNameLocalization('ja', 'アイテム')
        .setDescription('The item to use').setDescriptionLocalization('ja', 'どのアイテムを使う')
        .setRequired(true)
    )