import {ChatInputCommandInteraction, Locale, SlashCommandBuilder} from "discord.js";
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import {CUSTOMIZATION_UNLOCKS, CUSTOMIZTAION_ID_NAMES, ITEM_ID_NAMES, ITEMS} from "../okash/items";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {GetItemFromSerial, TrackableCardDeck} from "../okash/trackedItem";
import {COIN_EMOJIS_DONE} from "../okash/games/coinflip";

export const DECK_EMOJIS: {[key:number]: string} = {
    12: EMOJI.CARD_BACK,
    13: 'cb_t'
}

const tradable_items: {[key: string]: {type:'item'|'cust', id: ITEMS | CUSTOMIZATION_UNLOCKS}} = {
    'red coin': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_RED},
    'rc': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_RED},
    'dark blue coin': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_DBLUE},
    'dbc': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_DBLUE},
    'light blue coin': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_BLUE},
    'lbc': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_BLUE},
    'pink coin': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_PINK},
    'pc': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_PINK},
    'purple coin': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_PURPLE},
    'ppc': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_PURPLE},
    'dark green coin': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_DGREEN},
    'dgc': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_DGREEN},
    'rainbow coin': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_RAINBOW},
    'rbc': {type:'cust',id:CUSTOMIZATION_UNLOCKS.COIN_RAINBOW},

    'common lootbox': {type:'item',id:ITEMS.LOOTBOX_COMMON},
    'clb': {type:'item',id:ITEMS.LOOTBOX_COMMON},
    'rare lootbox': {type:'item',id:ITEMS.LOOTBOX_RARE},
    'rlb': {type:'item',id:ITEMS.LOOTBOX_RARE},
    'ex lootbox': {type:'item',id:ITEMS.LOOTBOX_EX},
    'exlb': {type:'item',id:ITEMS.LOOTBOX_EX},

    'shop voucher': {type:'item',id:ITEMS.SHOP_VOUCHER},
    'sv': {type:'item',id:ITEMS.SHOP_VOUCHER},
    'weighted coin': {type:'item',id:ITEMS.WEIGHTED_COIN_ONE_USE},
    'wc': {type:'item',id:ITEMS.WEIGHTED_COIN_ONE_USE},
    'drop boost 15 minute': {type:'item',id:ITEMS.LOOTBOX_INCREASE_15_MIN},
    'db15': {type:'item',id:ITEMS.LOOTBOX_INCREASE_15_MIN},
    'drop boost 30 minute': {type:'item',id:ITEMS.LOOTBOX_INCREASE_30_MIN},
    'db30': {type:'item',id:ITEMS.LOOTBOX_INCREASE_30_MIN},
    'casino pass 10 minute': {type:'item',id:ITEMS.CASINO_PASS_10_MIN},
    'cp15': {type:'item',id:ITEMS.CASINO_PASS_10_MIN},
    'casino pass 30 minute': {type:'item',id:ITEMS.CASINO_PASS_30_MIN},
    'cp30': {type:'item',id:ITEMS.CASINO_PASS_30_MIN},
    'casino pass 60 minute': {type:'item',id:ITEMS.CASINO_PASS_1_HOUR},
    'cp60': {type:'item',id:ITEMS.CASINO_PASS_1_HOUR},
    'tracking device': {type:'item',id:ITEMS.TRACKED_CONVERTER},
    'td': {type:'item',id:ITEMS.TRACKED_CONVERTER},
    'streak restore': {type:'item',id:ITEMS.STREAK_RESTORE},
    'sr': {type:'item',id:ITEMS.STREAK_RESTORE},
}

export async function HandleCommandTrade(interaction: ChatInputCommandInteraction) {
    const item = interaction.options.getString('item', true).toLowerCase();
    let sender_profile = GetUserProfile(interaction.user.id);
    const receiver = interaction.options.getUser('to', true);

    if (receiver.bot) return interaction.reply({
        content:`:x: You cannot trade with this user.`
    });

    if (receiver.id == interaction.user.id) return interaction.reply({
        content:`${GetEmoji(EMOJI.CAT_RAISED_EYEBROWS)} Um... **${interaction.user.displayName}**... why would you trade this item with yourself, if you already have it?`
    });

    // first off, check if it's a tracked item
    if (sender_profile.trackedInventory.includes(item)) {
        // only execute this block, return afterwards
        await interaction.deferReply();

        const receiver_profile = GetUserProfile(receiver.id);

        const tracked_item = GetItemFromSerial(item)!; // will exist if in inventory, and if it doesn't, we've fucked up BAD somewhere

        sender_profile.trackedInventory.splice(sender_profile.trackedInventory.indexOf(item), 1);
        receiver_profile.trackedInventory.push(item);

        if (sender_profile.customization.games.equipped_trackable_coin == item) {
            sender_profile.customization.games.equipped_trackable_coin = 'none';
            sender_profile.customization.games.coin_color = CUSTOMIZATION_UNLOCKS.COIN_DEF;
        }

        UpdateUserProfile(interaction.user.id, sender_profile);
        UpdateUserProfile(receiver.id, receiver_profile);

        let emoji;

        if (tracked_item.type == "coin") emoji = GetEmoji(COIN_EMOJIS_DONE[tracked_item.data.base]);
        if (tracked_item.type == "deck") emoji = GetEmoji(DECK_EMOJIS[tracked_item.data.base])

        return interaction.editReply({
            content: `${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}**, you gave your **Tracked:tm: ${emoji} ${CUSTOMIZTAION_ID_NAMES[tracked_item.data.base]}** to **${receiver.displayName}**!`
        });
    }

    if (!tradable_items[item]) return interaction.reply(`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but that doesn't seem to be a tradable item!`);

    await interaction.deferReply();

    const receiver_profile = GetUserProfile(receiver.id);

    if (tradable_items[item].type == 'item') {
        if (!sender_profile.inventory.includes(tradable_items[item].id as ITEMS)) return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have any of those!`
        });

        // send it right over!!
        sender_profile.inventory.splice(sender_profile.inventory.indexOf(tradable_items[item].id as ITEMS), 1);
        receiver_profile.inventory.push(tradable_items[item].id as ITEMS);
    }

    if (tradable_items[item].type == 'cust') {
        if (!sender_profile.customization.unlocked.includes(tradable_items[item].id as CUSTOMIZATION_UNLOCKS)) return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have that ${interaction.locale==Locale.EnglishGB?'customisation':'customization'} unlocked!`
        });

        // send it right over!!
        sender_profile.customization.unlocked.splice(sender_profile.customization.unlocked.indexOf(tradable_items[item].id as CUSTOMIZATION_UNLOCKS), 1);
        receiver_profile.customization.unlocked.push(tradable_items[item].id as CUSTOMIZATION_UNLOCKS);
    }

    interaction.editReply({
        content: `${GetEmoji(EMOJI.CAT_MONEY_EYES)} **${interaction.user.displayName}**, you gave your **${tradable_items[item].type=='item'?ITEM_ID_NAMES[tradable_items[item].id]:CUSTOMIZTAION_ID_NAMES[tradable_items[item].id]}** to **${receiver.displayName}**!`
    });

    UpdateUserProfile(interaction.user.id, sender_profile);
    UpdateUserProfile(receiver.id, receiver_profile);
}


export const TradeSlashCommand = new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Give an item to another user')
    .addUserOption(option => option
        .setName('to')
        .setDescription('who to give the item to')
        .setRequired(true)
    )
    .addStringOption(option => option
        .setName('item')
        .setDescription('which item/serial to trade')
        .setRequired(true)
    );