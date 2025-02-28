import { ChatInputCommandInteraction, Locale, MessageFlags, SlashCommandBuilder } from "discord.js";
import { COIN_COLOR, GetUserProfile, UpdateUserProfile } from "../user/prefs";
import { CUSTOMIZATION_UNLOCKS, ITEMS } from "../okash/items";
import {AddToWallet, GetInventory, RemoveOneFromInventory} from "../okash/wallet";
import { GetEmoji } from "../../util/emoji";
import { format } from "util";

const NAMES: {[key: string]: CUSTOMIZATION_UNLOCKS} = {
    'red coin':CUSTOMIZATION_UNLOCKS.COIN_RED,
    'dark blue coin':CUSTOMIZATION_UNLOCKS.COIN_DBLUE,
    'light blue coin':CUSTOMIZATION_UNLOCKS.COIN_BLUE,
    'pink coin':CUSTOMIZATION_UNLOCKS.COIN_PINK,
    'purple coin':CUSTOMIZATION_UNLOCKS.COIN_PURPLE,
    'rainbow coin':CUSTOMIZATION_UNLOCKS.COIN_RAINBOW,
    'dark green coin':CUSTOMIZATION_UNLOCKS.COIN_DGREEN
};

const SELL_PRICES: {
    [key: string]: {price:number,type: 'item' | 'cust',itemID?: number}
} = {
    'dark green coin':{price:1_750, type:'cust'},
    'dark blue coin':{price:1_750, type:'cust'},
    'red coin':{price:3_500,type:'cust'},
    'light blue coin':{price:7_000,type:'cust'},
    'purple coin':{price:35_000,type:'cust'},
    'pink coin':{price:70_000,type:'cust'},
    'rainbow coin':{price:700_000,type:'cust'},
    'weighted coin':{price:1_000,type:'item',itemID:ITEMS.WEIGHTED_COIN_ONE_USE},
    'shop voucher':{price:10_000,type:'item',itemID:ITEMS.SHOP_VOUCHER},
}

const STRINGS: {
    [key:string]: {[key: string]: string}
} = {
    'bad_item':{
        'en-US':":crying_cat_face: Looks like either you don't have that or I don't buy it, **%s**!",
        'ja':":crying_cat_face: **%s**さん、あのアイテムを売りません"
    },
    'success':{
        'en-US':`${GetEmoji('cat_money')} **%s**, you sold your \`%s\` for OKA**%s**!`,
        'ja':`${GetEmoji('cat_money')} **%s**さん, あなたの\`%s\`をOKA**%s**で売りました!`
    },
}

export async function HandleCommandSell(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    let locale = interaction.locale;
    if (locale != Locale.EnglishUS && locale != Locale.Japanese) locale = Locale.EnglishUS;

    // check if the user has this item in their inventory
    const profile = GetUserProfile(interaction.user.id);
    const pockets = GetInventory(interaction.user.id).other;
    const item = interaction.options.getString('item', true).toLowerCase();

    switch (SELL_PRICES[item].type) {
        case 'item':
            if (!pockets.includes(SELL_PRICES[item].itemID!)) return interaction.editReply({
                content: format(STRINGS['bad_item'][locale], interaction.user.displayName)
            });
            RemoveOneFromInventory(interaction.user.id, SELL_PRICES[item].itemID!);
            break;
    
        case 'cust':
            if (!profile.customization.unlocked.includes(NAMES[item])) return interaction.editReply({
                content: format(STRINGS['bad_item'][locale], interaction.user.displayName)
            });
            // splice from inventory
            profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(NAMES[item]), 1);
            profile.customization.coin_color = COIN_COLOR.DEFAULT;
            UpdateUserProfile(interaction.user.id, profile);
            break;

        default:
            return interaction.editReply({
                content: `:x: Something went wrong.`
            });
    }

    // sell prices are 70% of the original price
    AddToWallet(interaction.user.id, SELL_PRICES[item].price);

    interaction.editReply({
        content:format(STRINGS['success'][locale], interaction.user.displayName, item, SELL_PRICES[item].price)
    });
}


export const SellSlashCommand = new SlashCommandBuilder()
    .setName('sell').setNameLocalization('ja', '売り')
    .setDescription('Sell an item from your pockets').setDescriptionLocalization('ja', 'ポケットでアイテムを売り')
    .addStringOption(option => option.setName('item').setDescription('The item to sell').setRequired(true))