import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import { AddOneToInventory, GetWallet, RemoveFromWallet } from "../okash/wallet";
import { CUSTOMIZATION_UNLOCKS, GEMS, ITEM_TYPE } from "../okash/items";
import { GetUserProfile, UpdateUserProfile } from "../user/prefs";
import { CalculateTargetXP } from "../levels/levels";
import { AddXP } from "../levels/onMessage";


const PRICES: {
    [key: string]: number
} = {
    'streak restore':15_000,
    'dark green coin':2_500,
    'dark blue coin':2_500,
    'red coin':5_000,
    'light blue coin':10_000,
    'purple coin':50_000,
    'pink coin':100_000,
    'rainbow coin':1_000_000,
    'user banner level background':25_000,
    'ublb':25_000,
    'red level bar':10_000,
    'green level bar':10_000,
    'blue level bar':10_000,
    'pink level bar':10_000,
    // 'custom level bar':15_000,
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
        // xp level
        case 'xp level': case 'level':
            AddXPLevel(interaction);
            break;

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

        // profile customizations
        case 'user banner level background': case 'ublb':
            // permanent unlock
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_USER, price);
            
        // one-time unlocks
        case 'red level bar':
            return UnlockOneTimeCustomization(interaction, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED, price);

        case 'blue level bar':
            return UnlockOneTimeCustomization(interaction, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE, price);
    
        case 'green level bar':
            return UnlockOneTimeCustomization(interaction, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN, price);
        
        case 'pink level bar':
            return UnlockOneTimeCustomization(interaction, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK, price);
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

function UnlockOneTimeCustomization(interaction: ChatInputCommandInteraction, unlock: CUSTOMIZATION_UNLOCKS, price: number) {
    const profile = GetUserProfile(interaction.user.id);

    if (profile.customization.unlocked.indexOf(unlock) != -1) return interaction.editReply({
        content:`:cat: **${interaction.user.displayName}**, you've already got this customization option!`
    });

    const wanted_item = interaction.options.getString('item')!.toLowerCase();
    const wallet = GetWallet(interaction.user.id);

    switch (unlock) {
        // based on the unlock, we may need to get rid of old unlocks
        case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK:
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED), 1);
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE), 1);
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN), 1);
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK), 1);
            break;
    }

    RemoveFromWallet(interaction.user.id, price);
    profile.customization.unlocked.push(unlock);
    UpdateUserProfile(interaction.user.id, profile);

    interaction.editReply({content:`:cat: **${interaction.user.displayName}**, you purchased the customization \`${wanted_item}\` for <:okash:1315058783889657928> OKA**${price}**! Your profile has been updated.\nYour new balance is OKA**${wallet-price}**.`});
}

function AddXPLevel(interaction: ChatInputCommandInteraction) {
    const profile = GetUserProfile(interaction.user.id);
    
    RemoveFromWallet(interaction.user.id, 10000+(profile.level.level * 50));
    interaction.editReply({content:`:cat: **${interaction.user.displayName}**, you purchased one XP Level for <:okash:1315058783889657928> OKA**${10000+(profile.level.level * 50)}**!`});
    
    AddXP(interaction.user.id, interaction.channel as TextChannel, CalculateTargetXP(profile.level.level));
}