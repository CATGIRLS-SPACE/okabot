import {ChatInputCommandInteraction, SlashCommandBuilder, TextChannel, MessageFlags} from "discord.js";
import {AddOneToInventory, GetInventory, GetWallet, RemoveFromWallet, RemoveOneFromInventory} from "../okash/wallet";
import {CUSTOMIZATION_UNLOCKS, ITEMS} from "../okash/items";
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import {CalculateTargetXP} from "../levels/levels";
import {AddXP} from "../levels/onMessage";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {GetProperItemName} from "./pockets";
import { Achievements, GrantAchievement } from "../passive/achievement";


const LastBoughtLevel = new Map<string, number>();

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
    'level':1,
    'xp level':1,
    'xp level up':1,
    'custom level bar':15_000,
    'reset level bar':1,
    'drop boost 15 minute': 15_000,
    'drop boost 30 minute': 50_000,
    'casino pass 10 minute':25_000,
    'casino pass 30 minute':60_000,
    'casino pass 60 minute':100_000,
    'trans card deck': 25_000,
    'cherry blossom card deck':50_000
}

const SHORTHANDS: {[key: string]: string} = {
    'sr': 'streak restore',
    'xpl': 'xp level up',
    'dgc': 'dark green coin',
    'dbc': 'dark blue coin',
    'rc': 'red coin',
    'lbc': 'light blue coin',
    'prc': 'purple coin',
    'pc': 'pink coin',
    'rbc': 'rainbow coin',
    'db15': 'drop boost 15 minute',
    'db30': 'drop boost 30 minute',
    'cas10': 'casino pass 10 minute',
    'cas30': 'casino pass 30 minute',
    'cas60': 'casino pass 60 minute',
    'tcd': 'trans card deck',
    'cbcd':'cherry blossom card deck',
}

const ALLOWED_SHOP_VOUCHER_CUSTOMIZATION: Array<CUSTOMIZATION_UNLOCKS> = [
    CUSTOMIZATION_UNLOCKS.COIN_DBLUE,
    CUSTOMIZATION_UNLOCKS.COIN_DGREEN,
    CUSTOMIZATION_UNLOCKS.COIN_RED,
    CUSTOMIZATION_UNLOCKS.COIN_BLUE,
    CUSTOMIZATION_UNLOCKS.DECK_TRANS,
    CUSTOMIZATION_UNLOCKS.DECK_SAKURA,
    CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM,
    CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED,
    CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN,
    CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK,
    CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE,
    CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_USER,
];

const ALLOWED_SHOP_VOUCHER_ITEMS: Array<ITEMS> = [
    ITEMS.STREAK_RESTORE,
    ITEMS.CASINO_PASS_10_MIN,
    ITEMS.LOOTBOX_INCREASE_15_MIN
];

export async function HandleCommandBuy(interaction: ChatInputCommandInteraction) {
    
    const wanted_item = interaction.options.getString('item')!.toLowerCase();
    
    if (wanted_item == 'achievement') {
        interaction.reply({
            content:':smirk_cat:',
            flags: [MessageFlags.Ephemeral]
        });
        return GrantAchievement(interaction.user, Achievements.ACHIEVEMENT, interaction.channel as TextChannel);
    }

    await interaction.deferReply();

    if (!PRICES[wanted_item] && !PRICES[SHORTHANDS[wanted_item]]) return interaction.editReply({
        content:(wanted_item == 'weighted coin')?`:crying_cat_face: Silly **${interaction.user.displayName}**, you should know I don't sell gambling buffs here!`:`${GetEmoji(EMOJI.CAT_RAISED_EYEBROWS)} Looks like I don't sell that here, sorry!`
    });

    const price = PRICES[wanted_item!.toLowerCase()] || PRICES[SHORTHANDS[wanted_item]];
    const wallet = GetWallet(interaction.user.id, true);
    
    if (wallet < price) return interaction.editReply({
        content:`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but you'll need ${GetEmoji(EMOJI.OKASH)} OKA**${price-wallet}** more to buy that!`
    });

    switch (wanted_item) {
        // xp level
        case 'xp level': case 'level': case 'xp level up': case 'xpl': case 'lvl':
            return AddXPLevel(interaction);

        // gems

        case 'streak restore': case 'sr':
            AddOneToInventory(interaction.user.id, ITEMS.STREAK_RESTORE);
            break;

        case 'casino pass 10 minute': case 'cp10':
            AddOneToInventory(interaction.user.id, ITEMS.CASINO_PASS_10_MIN);
            break;

        case 'casino pass 30 minute': case 'cp30':
            AddOneToInventory(interaction.user.id, ITEMS.CASINO_PASS_30_MIN);
            break;

        case 'casino pass 60 minute': case 'cp60':
            AddOneToInventory(interaction.user.id, ITEMS.CASINO_PASS_1_HOUR);
            break;

        case 'drop boost 15 minute': case 'db15':
            AddOneToInventory(interaction.user.id, ITEMS.LOOTBOX_INCREASE_15_MIN);
            break;

        case 'drop boost 30 minute': case 'db30':
            AddOneToInventory(interaction.user.id, ITEMS.LOOTBOX_INCREASE_30_MIN);
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

        case 'purple coin': case 'prc':
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.COIN_PURPLE, price);
            
        case 'pink coin': case 'pc':
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.COIN_PINK, price);

        case 'rainbow coin': case 'rbc':
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.COIN_RAINBOW, price);

        case 'trans card deck': case 'tcd':
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.DECK_TRANS, price)

        case 'cherry blossom card deck': case 'cbcd': case 'scd': case 'sakura card deck':
            return UnlockCustomization(interaction, CUSTOMIZATION_UNLOCKS.DECK_SAKURA, price)

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

        case 'custom level bar':
            return UnlockOneTimeCustomization(interaction, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM, price);

        case 'reset level bar':
            return UnlockOneTimeCustomization(interaction, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_DEF, price);
    }

    // this will only execute if it's a '/use'able item
    RemoveFromWallet(interaction.user.id, price, true);
    interaction.editReply({content:`:cat: **${interaction.user.displayName}**, you purchased one **${GetProperItemName(SHORTHANDS[wanted_item] || wanted_item, interaction.okabot.locale)}** for ${GetEmoji(EMOJI.OKASH)} OKA**${price}**!\nYour new balance is OKA**${wallet-price}**.`});
}


function UnlockCustomization(interaction: ChatInputCommandInteraction, unlock: CUSTOMIZATION_UNLOCKS, price: number) {
    const profile = GetUserProfile(interaction.user.id);
    
    if (profile.customization.unlocked.indexOf(unlock) != -1) return interaction.editReply({
        content:`:cat: **${interaction.user.displayName}**, you've already got this customization option!`
    });
    
    const wanted_item = interaction.options.getString('item')!.toLowerCase();
    const wallet = GetWallet(interaction.user.id, true);
    const use_voucher = interaction.options.getString('voucher') == 'true';

    // console.log(use_voucher);

    if (!use_voucher)
        RemoveFromWallet(interaction.user.id, price, true);
    else {
        const inventory = GetInventory(interaction.user.id);
        if (inventory.indexOf(ITEMS.SHOP_VOUCHER) == -1) return interaction.editReply({
            content:`:x: **${interaction.user.displayName}**, you don't have a ${GetEmoji(EMOJI.SHOP_VOUCHER)} **Shop Voucher**!`
        });

        if (!ALLOWED_SHOP_VOUCHER_CUSTOMIZATION.includes(unlock)) return interaction.editReply({
            content: `:x: **${interaction.user.displayName}**, you can't buy this with a ${GetEmoji(EMOJI.SHOP_VOUCHER)} **Shop Voucher**!`
        });

        RemoveOneFromInventory(interaction.user.id, ITEMS.SHOP_VOUCHER);
    }

    profile.customization.unlocked.push(unlock);
    UpdateUserProfile(interaction.user.id, profile);

    if (use_voucher) 
        interaction.editReply({content:`:cat: **${interaction.user.displayName}**, you unlocked the customization \`${wanted_item}\` for one ${GetEmoji(EMOJI.SHOP_VOUCHER)} **Shop Voucher**! Try it out with /customize!`});
    else
        interaction.editReply({content:`:cat: **${interaction.user.displayName}**, you unlocked the customization \`${wanted_item}\` for ${GetEmoji(EMOJI.OKASH)} OKA**${price}**! Try it out with /customize!\nYour new balance is OKA**${wallet-price}**.`});
}

function UnlockOneTimeCustomization(interaction: ChatInputCommandInteraction, unlock: CUSTOMIZATION_UNLOCKS, price: number) {
    const profile = GetUserProfile(interaction.user.id);

    if (
        profile.customization.unlocked.indexOf(unlock) != -1 && 
        unlock != CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM &&
        unlock != CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_DEF
    ) return interaction.editReply({
        content:`:cat: **${interaction.user.displayName}**, you've already got this customization option!`
    });

    if (unlock == CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM && profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM_PENDING)) return interaction.editReply({
        content:`:bangbang: **${interaction.user.displayName}**, you've already got a pending custom bar! Use /customize to change your colors!`
    });

    if (unlock == CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_DEF) interaction.editReply({
        content: `:cat: Kaaaay **${interaction.user.displayName}**! I've reset your level bar to the default colors!`
    });

    const wanted_item = interaction.options.getString('item')!.toLowerCase();
    const wallet = GetWallet(interaction.user.id, true);
    const use_voucher = interaction.options.getString('voucher') == 'true';

    // console.log(use_voucher);

    if (!use_voucher)
        RemoveFromWallet(interaction.user.id, price, true);
    else {
        const inventory = GetInventory(interaction.user.id);
        if (inventory.indexOf(ITEMS.SHOP_VOUCHER) == -1) return interaction.editReply({
            content:`:x: **${interaction.user.displayName}**, you don't have a ${GetEmoji(EMOJI.SHOP_VOUCHER)} **Shop Voucher**!`
        });

        if (!ALLOWED_SHOP_VOUCHER_CUSTOMIZATION.includes(unlock)) return interaction.editReply({
            content: `:x: **${interaction.user.displayName}**, you can't buy this with a ${GetEmoji(EMOJI.SHOP_VOUCHER)} **Shop Voucher**!`
        });

        RemoveOneFromInventory(interaction.user.id, ITEMS.SHOP_VOUCHER);
    }


    switch (unlock) {
        // based on the unlock, we may need to get rid of old unlocks
        case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_DEF:
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED), 1);
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE), 1);
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN), 1);
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK), 1);
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM), 1);
            break;
    }

    profile.customization.unlocked.push(unlock);
    if (unlock == CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM) profile.customization.unlocked.push(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM_PENDING); 
    UpdateUserProfile(interaction.user.id, profile);

    if (unlock != CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_DEF) 
        interaction.editReply({
            content: !use_voucher?
                `:cat: **${interaction.user.displayName}**, you purchased the customization \`${wanted_item}\` for ${GetEmoji(EMOJI.OKASH)} OKA**${price}**! Your profile has been updated.\nYour new balance is OKA**${wallet-price}**.${(unlock == CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM)?'\n\nYou are now able to use /customize to change your colors with hex color codes. Make sure you do it right, because if you mess it up, you\'ll need to purchase another!':''}`
                :`:cat: **${interaction.user.displayName}**, you purchased the customization \`${wanted_item}\` for one ${GetEmoji(EMOJI.SHOP_VOUCHER)} **Shop Voucher**! Your profile has been updated.${(unlock == CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM)?'\n\nYou are now able to use /customize to change your colors with hex color codes. Make sure you do it right, because if you mess it up, you\'ll need to purchase another!':''}`
            });
}

function AddXPLevel(interaction: ChatInputCommandInteraction) {
    const last_bought_level = LastBoughtLevel.get(interaction.user.id) || 0;
    const d = new Date();
    if (last_bought_level + 10800 > d.getTime() / 1000) return interaction.editReply({
        content:`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but you can only buy an XP level once every 3 hours! Come back <t:${last_bought_level + 10800}:R>!`
    });

    LastBoughtLevel.set(interaction.user.id, Math.floor(d.getTime() / 1000));

    const profile = GetUserProfile(interaction.user.id);
    
    RemoveFromWallet(interaction.user.id, 10000+(profile.leveling.level * 500), true);
    interaction.editReply({content:`:cat: **${interaction.user.displayName}**, you purchased one XP Level for ${GetEmoji(EMOJI.OKASH)} OKA**${10000+(profile.leveling.level * 500)}**!`});
    
    AddXP(interaction.user.id, interaction.channel as TextChannel, CalculateTargetXP(profile.leveling.level, 0));
}


export const BuySlashCommand = new SlashCommandBuilder()
    .setName('buy').setNameLocalization('ja', '買い')
    .setDescription('Buy an item from the shop').setDescriptionLocalization('ja', 'アイテムを買います')
    .addStringOption(option => option
        .setName('item').setNameLocalization('ja', 'アイテム')
        .setDescription('The item to buy').setDescriptionLocalization('ja', 'ja localization')
        .setRequired(true)
    )
    .addStringOption(option => option
        .setName('voucher').setNameLocalization('ja', '引換券')
        .setDescription('Use a shop voucher (if you have one)?').setDescriptionLocalization('ja', '引換券を使う？')
        .setRequired(false)
        .addChoices(
            {name: 'Heck yeah!!', value: 'true', name_localizations:{ja:'うん！'}},
            {name: 'No thanks', value: 'false', name_localizations:{ja:'いや'}},
        )
    )