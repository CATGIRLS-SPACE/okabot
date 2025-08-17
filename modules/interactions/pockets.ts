import {ChatInputCommandInteraction, EmbedBuilder, Emoji, Locale, SlashCommandBuilder} from "discord.js";
import { GetInventory } from "../okash/wallet";
import { ITEMS } from "../okash/items";
import { GetUserProfile } from "../user/prefs";
import { GetEmoji, EMOJI } from "../../util/emoji";
import {GetItemFromSerial, TrackableCardDeck, TrackableCoin} from "../okash/trackedItem";
import {LANG_ITEMS, LangGetFormattedString} from "../../util/language";

export const ITEM_NAMES: {
    [key: number]: {name: string, desc: string}
} = {
    0: {name:':package: Common Lootbox',desc:'A box containing a random item!'},
    1: {name:':package: Rare Lootbox',desc:'A box containing some better items!'},
    2: {name:':package: EX Lootbox',desc:'An extremely rare box that contains the finest of items!'},
    3: {name:`${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} Weighted Coin`,desc:'Slightly increases your chances at winning your next coinflip.'},
    4: {name:`${GetEmoji(EMOJI.STREAK_RESTORE_GEM)} Streak Restore`,desc:'Restores your streak to its last amount if it is larger than your current streak.'},
    5: {name:'Tracking Device', desc:'Turn a customization into a Tracked:tm: customization. This makes the item unique and tracks a specific statistic.'},
    6: {name:`${GetEmoji(EMOJI.SHOP_VOUCHER)} Shop Voucher`,desc:'A voucher that can be redeemed for a free customization (with some exceptions)'},
    7: {name:`Scratch Card`,desc:'Test your luck with this scratch card and have a chance to win a load of okash!'},
    8: {name:`Drop Boost (15 min)`,desc:'Mysteriously, using this item seems to increase your luck at finding lootboxes.'},
    9: {name:`Drop Boost (30 min)`,desc:'Mysteriously, using this item seems to increase your luck at finding lootboxes.'},
    10: {name:`:credit_card: Casino Pass (10 min)`,desc:'Skip the queue and bypass any cooldowns while you\'ve got this active! Activate with shorthand "cas10".'},
    11: {name:`:credit_card: Casino Pass (30 min)`,desc:'Skip the queue and bypass any cooldowns while you\'ve got this active! Activate with shorthand "cas30".'},
    12: {name:`:credit_card: Casino Pass (60 min)`,desc:'Skip the queue and bypass any cooldowns while you\'ve got this active! Activate with shorthand "cas60".'},
    18: {name:`:crystal_ball: Sticker Kit`,desc:'A kit to apply a sticker for your level banner.'},
}

const LOCALIZED_ITEM_NAME_IDS: {[key: number]: string} = {
    0: LANG_ITEMS.COMMON_LOOTBOX,
    1: LANG_ITEMS.RARE_LOOTBOX,
    2: LANG_ITEMS.EX_LOOTBOX,
    3: LANG_ITEMS.WEIGHTED_COIN,
    4: LANG_ITEMS.STREAK_RESTORE,
    5: LANG_ITEMS.TRACKING_DEVICE,
    6: LANG_ITEMS.SHOP_VOUCHER,
    7: LANG_ITEMS.SCRATCH_TICKET,
    8: LANG_ITEMS.DROP_BOOST_15,
    9: LANG_ITEMS.DROP_BOOST_30,
    10: LANG_ITEMS.CASINO_PASS_10,
    11: LANG_ITEMS.CASINO_PASS_30,
    12: LANG_ITEMS.CASINO_PASS_60,
    18: LANG_ITEMS.STICKER_NOT_APPLIED
}

const UNLOCK_NAMES: {
    [key: number]: {name: string, desc: string, hide?: boolean}
} = {
    0:  {name:`${GetEmoji(EMOJI.COIN_DEFAULT_STATIONARY)} Default Coin`,desc:'The definitely-not-biased classic yellow coin everyone has, but you\'re still convinced it\'s biased.'},
    1:  {name:`${GetEmoji(EMOJI.COIN_RED_STATIONARY)} Red Coin`,desc:'A red coin. It resembles strawberries. Using this coin makes you feel like you can do anything, maybe even climbing a mountain?'},
    2:  {name:`${GetEmoji(EMOJI.COIN_DARK_BLUE_STATIONARY)} Dark Blue Coin`,desc:'A dark blue coin. This coin has a deep color resembling the ocean. Hopefully you can make your pockets just as deep using this!'},
    3:  {name:`${GetEmoji(EMOJI.COIN_BLUE_STATIONARY)} Light Blue Coin`,desc:'A light blue coin. Even the sky struggles to reach this shade of pure blue. Just like waffles struggles to win her coinflips.'},
    4:  {name:`${GetEmoji(EMOJI.COIN_PINK_STATIONARY)} Pink Coin`,desc:'A pink coin. You feel rich just looking at it. Or maybe you\'re feeling more feminine. Oh well, basically the same thing, right?'},
    5:  {name:`${GetEmoji(EMOJI.COIN_PURPLE_STATIONARY)} Purple Coin`,desc:'A purple coin. It\'s the slightly-less-rich man\'s pink coin, but you don\'t care because it still looks cool anyways.'},
    6:  {name:'CV_LEVEL_BANNER_DEF',desc:'',hide:true},
    7:  {name:'Red Level Bar',desc:'Sets your level bar color to red'},
    8:  {name:'Green Level Bar',desc:'Sets your level bar color to blue'},
    9:  {name:'Blue Level Bar',desc:'Sets your level bar color to green'},
    10: {name:'Pink Level Bar',desc:'Sets your level bar color to pink'},
    11: {name:'CV_LEVEL_THEME_OKABOT',desc:'',hide:true},
    12: {name:`${GetEmoji(EMOJI.CARD_BACK)} Default Card Deck`,desc:'The classic card deck. It\'s not unique in terms of design, but it gets the job done.'},
    13: {name:`${GetEmoji('cb_t')} Trans-themed Card Deck`,desc:'A card deck no different than the rest, but it lets you know that being trans is OK!'},
    14: {name:`${GetEmoji('cb_s')} Cherry Blossom Card Deck`,desc:'A card deck with pretty flowers and pink numbers on it.'},
    15: {name:'UNUSED_CUST_ID_15',desc:'this item should not be visible in the customize listing', hide:true},
    16: {name:`${GetEmoji(EMOJI.COIN_DARK_GREEN_STATIONARY)} Dark Green Coin`,desc:'A dark green coin. Even though it\'s not weighted, you still feel luckier using it.'},
    17: {name:`${GetEmoji(EMOJI.COIN_RAINBOW_STATIONARY)} Rainbow Coin`,desc:'This Mythical coin, said to be gifted from the gods, is almost useless, however it looks extremely cool.'},
    18: {name:'User Banner Level Background',desc:'Enables your level banner to use your Discord banner as its background'},
    19: {name:'CV_LEVEL_BAR_CUSTOM',desc:'',hide:true}
}

export function GetProperItemName(shop_id: string, locale: 'en' | 'ja' = 'en'): string {
    const keys: {[key: string]: number} = {
        'streak restore': 4,
        'tracking device': 5,
        'scratch ticket': 7,
        'drop boost 15 minute': 8,
        'drop boost 30 minute': 9,
        'casino pass 10 minute': 10,
        'casino pass 30 minute': 11,
        'casino pass 60 minute': 12,
        'sticker kit': 18,
    }

    return LangGetFormattedString(LOCALIZED_ITEM_NAME_IDS[keys[shop_id]] as LANG_ITEMS, locale);
}

export async function HandleCommandPockets(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const page = interaction.options.getString('page', true);

    const fields: any = [];

    if (page == 'customize') {
        const profile = GetUserProfile(interaction.user.id);

        for (const unlock of profile.customization.unlocked) {
            if (!UNLOCK_NAMES[unlock].hide) fields.push({
                name: (UNLOCK_NAMES[unlock] || {name:'Unknown Item'}).name, value: (UNLOCK_NAMES[unlock] || {name:'I dunno what this is!'}).desc
            })
        }
    } else if (page == 'items') {
        const inventory = GetInventory(interaction.user.id);
        let counts: any = {};

        for (let item in inventory) {
            if (counts[inventory[item]]) counts[inventory[item]]++;
            else counts[inventory[item]] = 1;
        }

        Object.keys(counts).forEach(item => {
            fields.push({
                name: `**${counts[item]}x ${(ITEM_NAMES[parseInt(item)] || {name:'Unknown Item'}).name}**`,
                value: (ITEM_NAMES[parseInt(item)] || {desc:'I don\'t know what this is!'}).desc
            })
        });
    } else if (page == 'tracked') {
        const inventory = GetUserProfile(interaction.user.id).trackedInventory;

        for (const serial of inventory) {
            const tracked_item = GetItemFromSerial(serial);
            let name;
            if (tracked_item) {
                switch (tracked_item.type) {
                    case "coin":
                        name = `**Tracked:tm: ${UNLOCK_NAMES[tracked_item.data.base].name}**`;
                        fields.push({
                            name,
                            value: `This item is unique. It counts how many times it's been flipped. Serial no: **\`${tracked_item.serial}\`**. Flip count: ${(tracked_item.data as TrackableCoin).flips}.`
                        })
                        break;

                    case "deck":
                        name = `**Tracked:tm: ${UNLOCK_NAMES[tracked_item.data.base].name}**`;
                        fields.push({
                            name,
                            value: `This item is unique. It counts how many cards it has dealt. Serial no: **\`${tracked_item.serial}\`**. Dealt cards: ${(tracked_item.data as TrackableCardDeck).dealt_cards}.`
                        })
                        break;
                }
            }
        }
    } else if (page == 'scraps') {
        const profile = GetUserProfile(interaction.user.id);
        const scrap_names: {[key: string]: string} = {
            'plastic':`${GetEmoji(EMOJI.SCRAP_PLASTIC)} Plastic`,
            'metal':`${GetEmoji(EMOJI.SCRAP_METAL)} Metal`,
            'wood':`${GetEmoji(EMOJI.SCRAP_WOOD)} Wood`,
            'rubber':`${GetEmoji(EMOJI.SCRAP_RUBBER)} Rubber`,
            'electrical':`${GetEmoji(EMOJI.SCRAP_ELECTRICAL)} Electrical`,
        };
        for (const scrap of Object.keys(profile.inventory_scraps)) {
            fields.push({
                name: `** ${profile.inventory_scraps[scrap as 'plastic'|'metal'|'wood'|'rubber'|'electrical']}x ${scrap_names[scrap]}**`,
                value: 'Scraps you can use to craft items'
            });
        }
    }

    if (fields.length == 0) {
        return interaction.editReply({
            content:`:crying_cat_face: **${interaction.user.displayName}**, you have nothing in your pockets!`
        });
    }

    // console.log(fields);

    const embed = new EmbedBuilder()
        .setTitle(page=='items'||page=='scraps'?'Your pockets':`Your unlocked ${interaction.locale==Locale.EnglishGB?'customisations':'customizations'}`)
        .setColor(0x9d60cc)
        .setFields(fields)
        .setAuthor({iconURL: interaction.user.displayAvatarURL(), name: interaction.user.displayName});
        
    interaction.editReply({embeds:[embed]});
}


export const PocketsSlashCommand = new SlashCommandBuilder()
    .setName('pockets').setNameLocalization('ja', 'ポケット')
    .setDescription('See what you\'ve got on you!').setDescriptionLocalization('ja', 'ポケットにアイテムとカスタマイズ化を見る')
    .addStringOption(option => option
        .setName('page').setNameLocalization('ja', 'カテゴリー')
        .setDescription('The pockets category to display').setDescriptionLocalization('ja', 'ポケットのカテゴリー')
        .addChoices(
            {name:'Items', value:'items', name_localizations:{ja:'アイテム'}},
            {name:'Customization Unlocks', value:'customize', name_localizations:{ja:'カスタマイズ化'}},
            {name:'Tracked Items',value:'tracked'},
            {name:'Scraps',value:'scraps'}
    ).setRequired(true));