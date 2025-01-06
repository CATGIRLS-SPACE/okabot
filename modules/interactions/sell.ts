import { ChatInputCommandInteraction, Locale, MessageFlags } from "discord.js";
import { COIN_COLOR, GetUserProfile, UpdateUserProfile } from "../user/prefs";
import { CUSTOMIZATION_UNLOCKS } from "../okash/items";
import { AddToWallet } from "../okash/wallet";
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
    [key: string]: number
} = {
    'dark green coin':1_750,
    'dark blue coin':1_750,
    'red coin':3_500,
    'light blue coin':7_000,
    'purple coin':35_000,
    'pink coin':70_000,
    'rainbow coin':700_000
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
    await interaction.deferReply({flags:[MessageFlags.SuppressNotifications]});

    let locale = interaction.locale;
    if (locale != Locale.EnglishUS && locale != Locale.Japanese) locale = Locale.EnglishUS;

    // check if the user has this item in their inventory
    const profile = GetUserProfile(interaction.user.id);
    const item = interaction.options.getString('item', true).toLowerCase();
    if (!profile.customization.unlocked.includes(NAMES[item])) return interaction.editReply({
        content: format(STRINGS['bad_item'][locale], interaction.user.displayName)
    });

    // sell prices are 70% of the original price
    AddToWallet(interaction.user.id, SELL_PRICES[item]);

    // splice from inventory
    profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(NAMES[item]), 1);
    profile.customization.coin_color = COIN_COLOR.DEFAULT;
    UpdateUserProfile(interaction.user.id, profile);

    interaction.editReply({
        content:format(STRINGS['success'][locale], interaction.user.displayName, item, SELL_PRICES[item])
    });
}