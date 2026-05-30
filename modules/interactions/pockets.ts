import {APIEmbedField, ChatInputCommandInteraction, EmbedBuilder, Locale, SlashCommandBuilder} from "discord.js";
import {GetUserProfile, ItemData} from "../user/prefs";
import { GetEmoji, EMOJI } from "../../util/emoji";
import {GetItemFromSerial, TrackableCardDeck, TrackableCoin} from "../okash/trackedItem";
import {t} from "../i18n/translation";

export const ITEM_NAMES: {
    [key: number]: {name: string, desc: string}
} = {
    0: {name:':package: Common Lootbox',desc:'An old cardboard box containing some common items.'},
    1: {name:':package: Rare Lootbox',desc:'Not too shabby, a wooden box with a few rare items in it.'},
    2: {name:':package: EX Lootbox',desc:`Woah, it's so sparkly! Looks like a metal box with a bunch of super rare items in it!`},
    3: {name:`${GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY)} Weighted Coin`,desc:`Sometimes life isn't fair, and neither is gambling. Use this to get around that fact.`},
    4: {name:`${GetEmoji(EMOJI.STREAK_RESTORE_GEM)} Streak Restore`,desc:'Forgot your streak (or ended up in jail for a few days)? Use this to repair your broken streak!'},
    5: {name:'Tracking Device', desc:'A kit that turns a customization into a Tracked:tm: customization. This makes the item unique and tracks a specific statistic. I hear it\'s pretty popular amongst Spotify users.'},
    6: {name:`${GetEmoji(EMOJI.SHOP_VOUCHER)} Shop Voucher`,desc:'A voucher that can be redeemed for a free customization (with some exceptions)'},
    7: {name:`Scratch Card`,desc:'Test your luck with this scratch card and have a chance to win a load of okash!'},
    8: {name:`Drop Boost (15 min)`,desc:'Mysteriously, using this item seems to increase your luck at finding lootboxes.'},
    9: {name:`Drop Boost (30 min)`,desc:'Mysteriously, using this item seems to increase your luck at finding lootboxes.'},
    10: {name:`:credit_card: Casino Pass (10 min)`,desc:'Skip the queue and bypass any cooldowns while you\'ve got this active! Activate with shorthand "cas10".'},
    11: {name:`:credit_card: Casino Pass (30 min)`,desc:'Skip the queue and bypass any cooldowns while you\'ve got this active! Activate with shorthand "cas30".'},
    12: {name:`:credit_card: Casino Pass (60 min)`,desc:'Skip the queue and bypass any cooldowns while you\'ve got this active! Activate with shorthand "cas60".'},
    18: {name:`:crystal_ball: Sticker Kit`,desc:'Profile banner looking a bit boring? Slap a sticker on it, make it unique, make it *yours*!'},
    19: {name: `${GetEmoji(EMOJI.HACKING_TOOL)} Hacking Tool`, desc: `Hacking tool. This item is not currently used.`},
    20: {name: `${GetEmoji(EMOJI.BLACK_MARKET_TOKEN)} Black Market Token`, desc: `It's said this token can be used to buy legally-questionable items. I wouldn't know, though. I'm a good boy.`},
    21: {name: `${GetEmoji(EMOJI.BLACK_MARKET_TOKEN_SHARD)} Black Market Token Shard`, desc: `Long ago, when the police destroyed all the **Black Market Tokens**, they sprinkled the shards throughout the land. Seems like about 25 would be enough to hack together a token.`},
    22: {name: `${GetEmoji(EMOJI.BANK_ROBBERY_TOOL)} Bank Robbery Tool`, desc:`Did your victim move all their cash to their bank account? Use this totally illegal bank robbery tool to steal a chunk of okash from them!`},
}

const UNLOCK_NAMES: {
    [key: number]: {name: string, desc: string, hide?: boolean}
} = {
    0:  {name:`${GetEmoji(EMOJI.COIN_DEFAULT_STATIONARY)} Default Coin`,desc:'The definitely-not-biased classic yellow coin everyone has, but you\'re still convinced it\'s biased.'},
    1:  {name:`${GetEmoji(EMOJI.COIN_RED_STATIONARY)} Red Coin`,desc:'Red, like strawberries! This coin makes you feel like you can do anything, even climbing a mountain!'},
    2:  {name:`${GetEmoji(EMOJI.COIN_DARK_BLUE_STATIONARY)} Dark Blue Coin`,desc:'This coin has a deep color resembling the ocean. Hopefully this can make your pockets just as deep.'},
    3:  {name:`${GetEmoji(EMOJI.COIN_BLUE_STATIONARY)} Light Blue Coin`,desc:'Even the sky struggles to reach this shade of blue. Just like you\'re struggling to win your flips.'},
    4:  {name:`${GetEmoji(EMOJI.COIN_PINK_STATIONARY)} Pink Coin`,desc:'"Pink is for girls"? I\'ll do you one better: Pink is for rich people. Beat that.'},
    5:  {name:`${GetEmoji(EMOJI.COIN_PURPLE_STATIONARY)} Purple Coin`,desc:'A purple coin. It\'s the slightly-less-rich man\'s pink coin, but you don\'t care because it still looks cool anyways.'},
    6:  {name:'CV_LEVEL_BANNER_DEF',desc:'',hide:true},
    7:  {name:'Red Level Bar',desc:'Sets your level bar color to red'},
    8:  {name:'Green Level Bar',desc:'Sets your level bar color to blue'},
    9:  {name:'Blue Level Bar',desc:'Sets your level bar color to green'},
    10: {name:'Pink Level Bar',desc:'Sets your level bar color to pink'},
    11: {name:'CV_LEVEL_THEME_OKABOT',desc:'',hide:true},
    12: {name:`${GetEmoji(EMOJI.CARD_BACK)} Default Card Deck`,desc:'The classic card deck. It\'s not unique in terms of design, but it gets the job done.'},
    13: {name:`${GetEmoji('cb_t')} Trans-themed Card Deck`,desc:'A card deck that\'s a little bit different, but being different is okay!'},
    14: {name:`${GetEmoji('cb_s')} Cherry Blossom Card Deck`,desc:'A card deck with some pretty sakura flowers and pink numbers on it.'},
    15: {name:'UNUSED_CUST_ID_15',desc:'this item should not be visible in the customize listing', hide:true},
    16: {name:`${GetEmoji(EMOJI.COIN_DARK_GREEN_STATIONARY)} Dark Green Coin`,desc:'A dark green coin. Even though it\'s not weighted, you still feel luckier using it.'},
    17: {name:`${GetEmoji(EMOJI.COIN_RAINBOW_STATIONARY)} Rainbow Coin`,desc:'This Mythical coin, said to be gifted from the gods, is almost useless, however it looks extremely cool.'},
    18: {name:'User Banner Level Background',desc:'Enables your level banner to use your Discord banner as its background'},
    19: {name:'CV_LEVEL_BAR_CUSTOM',desc:'',hide:true}
}

const UNLOCK_I18N_KEYS: {[key: number]: string} = {
    0: 'customizations.dc',
    1: 'customizations.rc',
    2: 'customizations.dbc',
    3: 'customizations.lbc',
    4: 'customizations.pc',
    5: 'customizations.ppc',
    6: '',
    7: 'customizations.rlb',
    8: 'customizations.glb',
    9: 'customizations.blb',
    10: 'customizations.plb',
    11: '',
    12: 'customizations.dcd',
    13: 'customizations.tcd',
    14: 'customizations.cbcd',
    15: '',
    16: 'customizations.dgc',
    17: 'customizations.rbc',
    18: 'customizations.ublb',
    19: ''
}

export async function HandleCommandPockets(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const page = interaction.options.getString('page', true);

    const fields: Array<APIEmbedField> = [];

    if (page == 'customize') {
        const profile = GetUserProfile(interaction.user.id);

        for (const unlock of profile.customization.unlocked) {
            if (!UNLOCK_NAMES[unlock].hide) fields.push({
                name: (UNLOCK_NAMES[unlock] || {name:await t('items.missing.name', interaction.okabot.translateable_locale)}).name, value: (UNLOCK_NAMES[unlock] || {name:await t('items.missing.desc', interaction.okabot.translateable_locale)}).desc
            })
        }
    } else if (page == 'items') {
        const profile = GetUserProfile(interaction.user.id);
        let c = 0;
        profile.inventory.forEach(async (item: ItemData) => {
            c++;
            fields.push({
                name: `${item.amount}x ${(ITEM_NAMES[item.item_id] || {name: `${await t('items.missing.name', interaction.okabot.translateable_locale)} (id: ${item.item_id})`}).name}`,
                value: (ITEM_NAMES[item.item_id] || {desc:await t('items.missing.desc', interaction.okabot.translateable_locale)}).desc,
                inline: c % 2 == 1
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
                        name = await t('customizations.tracked.name', interaction.okabot.translateable_locale, {item: await t(`${UNLOCK_I18N_KEYS[tracked_item.data.base]}.name`)});
                        fields.push({
                            name,
                            value: await t('customizations.tracked.coin', interaction.okabot.translateable_locale, {serial: tracked_item.serial, flips: (tracked_item.data as TrackableCoin).flips})
                        })
                        break;

                    case "deck":
                        name = await t('customizations.tracked.name', interaction.okabot.translateable_locale, {item: await t(`${UNLOCK_I18N_KEYS[tracked_item.data.base]}.name`)});
                        fields.push({
                            name,
                            value: await t('customizations.tracked.coin', interaction.okabot.translateable_locale, {serial: tracked_item.serial, cards: (tracked_item.data as TrackableCardDeck).dealt_cards})
                        })
                        break;
                }
            }
        }
    }

    if (fields.length == 0) {
        return interaction.editReply({
            content: page == 'tracked' ?
                await t('interactions.pockets.tracked.nothing', interaction.okabot.translateable_locale, {user: interaction.user.displayName}) :
                await t('interactions.pockets.items.nothing', interaction.okabot.translateable_locale, {user: interaction.user.displayName})
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
    .setName('pockets')
    .setDescription('See what you\'ve got on you!')
    .addStringOption(option => option
        .setName('page')
        .setDescription('The pockets category to display')
        .addChoices(
            {name:'Items', value:'items'},
            {name:'Customization Unlocks', value:'customize'},
            {name:'Tracked Items',value:'tracked'},
    ).setRequired(true));