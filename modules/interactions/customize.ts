import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {CUSTOMIZATION_UNLOCKS} from "../okash/items";
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {GetItemFromSerial, TrackableCardDeck, TrackableCoin} from "../okash/trackedItem";


export async function HandleCommandCustomize(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const sub = interaction.options.getSubcommand();

    switch (sub) {
        case 'coinflip':
            CustomizeCoinflip(interaction);
            break;

        case 'levelbar':
            CustomizeLevelBar(interaction);
            break;

        case 'cards':
            CustomizeCardDeck(interaction);
            break;
    }
}


const VALID_COIN_TYPES: {
    [key: string]: CUSTOMIZATION_UNLOCKS
} = {
    'default coin':CUSTOMIZATION_UNLOCKS.COIN_DEF,
    'red coin':CUSTOMIZATION_UNLOCKS.COIN_RED,
    'dark blue coin':CUSTOMIZATION_UNLOCKS.COIN_DBLUE,
    'light blue coin':CUSTOMIZATION_UNLOCKS.COIN_BLUE,
    'purple coin':CUSTOMIZATION_UNLOCKS.COIN_PURPLE,
    'pink coin':CUSTOMIZATION_UNLOCKS.COIN_PINK,
    'dark green coin':CUSTOMIZATION_UNLOCKS.COIN_DGREEN,
    'rainbow coin':CUSTOMIZATION_UNLOCKS.COIN_RAINBOW,

    'default':CUSTOMIZATION_UNLOCKS.COIN_DEF,
    'red':CUSTOMIZATION_UNLOCKS.COIN_RED,
    'dark blue':CUSTOMIZATION_UNLOCKS.COIN_DBLUE,
    'light blue':CUSTOMIZATION_UNLOCKS.COIN_BLUE,
    'purple':CUSTOMIZATION_UNLOCKS.COIN_PURPLE,
    'pink':CUSTOMIZATION_UNLOCKS.COIN_PINK,
    'dark green':CUSTOMIZATION_UNLOCKS.COIN_DGREEN,
    'rainbow':CUSTOMIZATION_UNLOCKS.COIN_RAINBOW,

    'dc':CUSTOMIZATION_UNLOCKS.COIN_DEF,
    'rc':CUSTOMIZATION_UNLOCKS.COIN_RED,
    'dbc':CUSTOMIZATION_UNLOCKS.COIN_DBLUE,
    'lbc':CUSTOMIZATION_UNLOCKS.COIN_BLUE,
    'prc':CUSTOMIZATION_UNLOCKS.COIN_PURPLE,
    'pc':CUSTOMIZATION_UNLOCKS.COIN_PINK,
    'dgc':CUSTOMIZATION_UNLOCKS.COIN_DGREEN,
    'rbc':CUSTOMIZATION_UNLOCKS.COIN_RAINBOW
};

const VALID_DECK_TYPES: {
    [key: string]: CUSTOMIZATION_UNLOCKS
} = {
    'trans card deck': CUSTOMIZATION_UNLOCKS.DECK_TRANS,
    'tcd': CUSTOMIZATION_UNLOCKS.DECK_TRANS,
    'default card deck': CUSTOMIZATION_UNLOCKS.DECK_DEFAULT,
    'dcd': CUSTOMIZATION_UNLOCKS.DECK_DEFAULT,
    'sakura card deck': CUSTOMIZATION_UNLOCKS.DECK_SAKURA,
    'scd': CUSTOMIZATION_UNLOCKS.DECK_SAKURA,
    'cherry blossom card deck': CUSTOMIZATION_UNLOCKS.DECK_SAKURA,
    'cbcd': CUSTOMIZATION_UNLOCKS.DECK_SAKURA,
}

const LOCALIZED_DECK_NAMES: {
    [key:string]: {en: string, ja: string}
} = {
    'default card deck': {
        en:'Default Card Deck',
        ja:'カードデック'
    },
    'dcd': {
        en:'Default Card Deck',
        ja:'カードデック'
    },

    'trans card deck': {
        en:'Trans Card Deck',
        ja:'トランスジェンダーデザインのカードデック'
    },
    'tcd': {
        en:'Trans Card Deck',
        ja:'トランスジェンダーデザインのカードデック'
    },

    'cherry blossom card deck': {
        en:'Cherry Blossom Card Deck',
        ja:'桜デザインのカードデック'
    },
    'cbcd': {
        en:'Cherry Blossom Card Deck',
        ja:'桜デザインのカードデック'
    },
    'sakura card deck': {
        en:'Cherry Blossom Card Deck',
        ja:'桜デザインのカードデック'
    },
    'scd': {
        en:'Cherry Blossom Card Deck',
        ja:'桜デザインのカードデック'
    },
}

async function CustomizeCoinflip(interaction: ChatInputCommandInteraction) {
    const customization = interaction.options.getString('coin', true).toLowerCase();

    const profile = GetUserProfile(interaction.user.id);

    if (VALID_COIN_TYPES[customization] == undefined) {
        // check if it's a valid trackable serial id
        if (profile.trackedInventory.includes(customization)) {
            // if so, switch to the proper coin and set the trackable ID
            const trackable = GetItemFromSerial(customization)!.data as TrackableCoin;
            profile.customization.games.coin_color = trackable.base;
            profile.customization.games.equipped_trackable_coin = trackable.serial;

            UpdateUserProfile(interaction.user.id, profile);

            return interaction.editReply({
                content:`${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}**, I've switched your coin to your trackable coin ID \`${customization}\`. Have fun flipping!`
            });
        } else return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, that's not a valid coin/trackable serial!`
        });
    }

    if (profile.customization.unlocked.indexOf(VALID_COIN_TYPES[customization]) == -1) return interaction.editReply({
        content:`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but it looks like you don't own that coin!`
    });

    profile.customization.games.coin_color = VALID_COIN_TYPES[customization];
    UpdateUserProfile(interaction.user.id, profile);

    interaction.editReply({
        content:`${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}**, I've switched your coin out for a \`${customization}\`. Have fun flipping!`
    });
}

async function CustomizeCardDeck(interaction: ChatInputCommandInteraction) {
    const customization = interaction.options.getString('deck', true).toLowerCase();

    const profile = GetUserProfile(interaction.user.id);

    if (VALID_DECK_TYPES[customization] == undefined) {
        // check if it's a valid trackable serial id
        if (profile.trackedInventory.includes(customization)) {
            // if so, switch to the proper coin and set the trackable ID
            const trackable = GetItemFromSerial(customization)!.data as TrackableCardDeck;
            profile.customization.games.card_deck_theme = trackable.base;
            profile.customization.games.equipped_trackable_deck = trackable.serial;

            UpdateUserProfile(interaction.user.id, profile);

            return interaction.editReply({
                content:`${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}**, I've switched your coin to your trackable deck ID \`${customization}\`. Have fun playing!`
            });
        } else return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, that's not a valid deck/trackable serial!`
        });
    }

    if (profile.customization.unlocked.indexOf(VALID_DECK_TYPES[customization]) == -1) return interaction.editReply({
        content:`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but it looks like you don't own that deck!`
    });

    profile.customization.games.card_deck_theme = VALID_DECK_TYPES[customization];
    profile.customization.games.equipped_trackable_deck = 'none';
    UpdateUserProfile(interaction.user.id, profile);

    interaction.editReply({
        content:`${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}**, I've switched your deck to your **${LOCALIZED_DECK_NAMES[customization][interaction.okabot.locale]}**. Have fun playing!`
    });
}

async function CustomizeLevelBar(interaction: ChatInputCommandInteraction) {
    const bg = interaction.options.getString('background', true);
    const fg = interaction.options.getString('foreground', true);
    const text = interaction.options.getString('xptext', true);

    const profile = GetUserProfile(interaction.user.id);
    profile.customization.level_banner = {
        hex_bg: bg,
        hex_fg: fg,
        hex_num: text
    };
    profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM_PENDING), 1);
    UpdateUserProfile(interaction.user.id, profile);

    interaction.editReply({
        content: `:cat: **${interaction.user.displayName}**, I've updated your custom level bar colors.\nIn order to change them again, you must purchase another Custom Level Bar Color from the shop.`
    });
}


export const CustomizeSlashCommand = new SlashCommandBuilder()
    .setName('customize')
    .setNameLocalizations({ja:'カスタマイズ',"en-GB":'customise',"en-US":'customize'})
    .setDescription('Customize your experience with your unlocked customizations')
    .setDescriptionLocalizations({'ja':'okabotをカスタマイズするであなたのカスタマイズ化',"en-GB":'Customise your experience with your unlocked customisations',"en-US":'Customize your experience with your unlocked customizations'})
    .addSubcommand(subcommand => 
        subcommand
            .setName('coinflip').setNameLocalization('ja', 'コイントス')
            .setDescription('Customize your coinflip experience')
            .setDescriptionLocalizations({'ja':'コイントスをカスタマイズ',"en-GB":'Customise your coinflip experience',"en-US":'Customize your coinflip experience'})
            .addStringOption(option => option
                .setName('coin').setNameLocalization('ja', 'コイン')
                .setDescription('The coin (or serial for Tracked™ items) you want to use when flipping').setDescriptionLocalization('ja', 'コイントスのコインをカスタマイズ')
                .setRequired(true))
            )
    .addSubcommand(subcommand => subcommand
            .setName('cards')
            .setDescription('Choose your card deck')
            .addStringOption(option => option
                .setName('deck')
                .setDescription('The card deck name (or serial for Tracked™ items) you want to use when playing')
                .setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('levelbar').setNameLocalization('ja', 'レベルバー')
            .setDescription('Customize the colors of your level banner\'s XP bar').setDescriptionLocalization('ja', 'あなたのレベルバーの色をカスタマイズ').setDescriptionLocalization('en-GB', 'Customize the colours of your level banner\'s XP bar')
            .addStringOption(option => 
                option
                    .setName('background')
                    .setDescription('The background color of the bar. Must be a valid hex code, like #abcdef').setDescriptionLocalization('en-GB', 'The background colour of the bar. Must be a valid hex code, like #abcdef')
                    .setRequired(true))
            .addStringOption(option => 
                option
                    .setName('foreground')
                    .setDescription('The foreground color of the bar. Must be a valid hex code, like #abcdef').setDescriptionLocalization('en-GB', 'The foreground colour of the bar. Must be a valid hex code, like #abcdef')
                    .setRequired(true))
            .addStringOption(option => 
                option
                    .setName('xptext')
                    .setDescription('The text color of the bar (100 XP, 500 XP). Must be a valid hex code, like #abcdef').setDescriptionLocalization('en-GB', 'The text colour of the bar (100 XP, 500 XP). Must be a valid hex code, like #abcdef')
                    .setRequired(true))
    )