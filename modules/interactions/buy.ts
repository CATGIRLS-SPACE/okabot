import { ChatInputCommandInteraction } from "discord.js";
import { AddOneToInventory, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { CUSTOMIZATION_UNLOCKS, GEMS, ITEM_TYPE } from "../okash/items";
import { GetUserProfile, UpdateUserProfile } from "../user/prefs";


const PRICES: {
    [key: string]: number
} = {
    'streak restore':15_000,
    'dark green coin':2_500,
    'dark blue coin':2_500,
    'red coin':5_00,
    'light blue coin':10_000,
    'purple coin':50_000,
    'pink coin':100_000,
    'rainbow coin':1_000_000
}

export async function HandleCommandBuy(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const wanted_item = interaction.options.getString('item')!.toLowerCase();

    if (!PRICES[wanted_item]) return interaction.editReply({
        content:(wanted_item == 'weighted coin')?`:crying_cat_face: Silly **${interaction.user.displayName}**, you should know I don't sell gambling buffs here!`:`<:cat_raised:1315878043578925056> Looks like I don't sell that here, sorry!`
    });

    const price = PRICES[wanted_item!.toLowerCase()];
    const wallet = GetWallet(interaction.user.id);
    
    if (wallet < price) return interaction.editReply({
        content:`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but you'll need <:okash:1315058783889657928> OKA**${price-wallet}** more to buy that!`
    });

    switch (wanted_item) {
        // gems

        case 'streak restore': case 'g00':
            AddOneToInventory(interaction.user.id, ITEM_TYPE.GEM, GEMS.STREAK_RESTORE);
            break;
        
        // coin customizations
        // must return on these because we need to check if the user already has the unlock
        // if they do, don't subtract the price and tell them that they already have it
        case 'dark green coin': case 'dgc':
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.COIN_DGREEN, price);

        case 'dark blue coin': case 'dbc':
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.COIN_DBLUE, price);

        case 'red coin': case 'rc':
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.COIN_RED, price);
            
        case 'light blue coin': case 'lbc':
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.COIN_BLUE, price);

        case 'purple coin':
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.COIN_PURPLE, price);
            
        case 'pink coin':
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.COIN_PINK, price);

        case 'rainbow coin':
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.COIN_RAINBOW, price);
    }

    // this will only execute if it's a '/use'able item
    RemoveFromWallet(interaction.user.id, price);
    interaction.editReply({content:`:cat: **${interaction.user.displayName}**, you purchased one \`${wanted_item}\` for <:okash:1315058783889657928> OKA**${price}**!\nYour new balance is OKA**${wallet-price}**.`});
}


function UnlockCustomization(interaction: ChatInputCommandInteraction, unlock: CUSTOMIZATION_UNLOCKS, price: number) {
    const profile = GetUserProfile(interaction.user.id);
    
    if (profile.customization.unlocked.indexOf(unlock) != -1) return interaction.editReply({
        content:`:cat: **${interaction.user.displayName}**, you've already got this customization option!`
    });
    
    const wanted_item = interaction.options.getString('item')!.toLowerCase();
    const wallet = GetWallet(interaction.user.id);

    RemoveFromWallet(interaction.user.id, price);
    profile.customization.unlocked.push(unlock);
    UpdateUserProfile(interaction.user.id, profile);

    interaction.editReply({content:`:cat: **${interaction.user.displayName}**, you unlocked the customization \`${wanted_item}\` for <:okash:1315058783889657928> OKA**${price}**! Try it out with /customize!\nYour new balance is OKA**${wallet-price}**.`});
}