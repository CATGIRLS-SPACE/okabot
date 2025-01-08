import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { GetInventory } from "../okash/wallet";
import { GEMS, ITEMS } from "../okash/items";
import { GetUserProfile } from "../user/prefs";

const GEM_NAMES: {
    [key: number]: {name: string, desc: string}
} = {
    0: {name:'<:g00:1315084985589563492> Streak Restore',desc:'Restores your streak to its last amount if it is larger than your current streak.'}
}
const ITEM_NAMES: {
    [key: number]: {name: string, desc: string}
} = {
    0: {name:':package: Common Lootbox',desc:'A box containing all sorts of goodies!'},
    1: {name:':package: Rare Lootbox',desc:'A box that has a good chance of giving better items!'},
    2: {name:':package: Epic Lootbox',desc:'A fancy box that gives really good items!'},
    3: {name:'<:cff_green:1315843280776462356> Weighted Coin',desc:'Slightly increases your chances at winning your next coinflip.'}
}

const UNLOCK_NAMES: {
    [key: number]: {name: string, desc: string, hide?: boolean}
} = {
    0:  {name:'<:cff:1314729249189400596> Default Coin',desc:'The definitely-not-biased classic yellow coin everyone has, but you\'re still convinced it\'s biased.'},
    1:  {name:'<:cff_red:1316187598791905280> Red Coin',desc:'A red coin. It resembles strawberries. Using this coin makes you feel like you can do anything, maybe even climbing a mountain?'},
    2:  {name:'<:cff_dblue:1316187532349935728> Dark Blue Coin',desc:'A dark blue coin. This coin has a deep color resembling the ocean. Hopefully you can make your pockets just as deep using this!'},
    3:  {name:'<:cff_blue:1316187504067739699> Light Blue Coin',desc:'A light blue coin. Even the sky struggles to reach this shade of pure blue. Just like waffles struggles to win her coinflips.'},
    4:  {name:'<:cff_pink:1316173446803226665> Pink Coin',desc:'A pink coin. You feel rich just looking at it. Or maybe you\'re feeling more feminine. Oh well, basically the same thing, right?'},
    5:  {name:'<:cff_purple:1316175038042472491> Purple Coin',desc:'A purple coin. It\'s the slightly-less-rich man\'s pink coin, but you don\'t care because it still looks cool anyways.'},
    6:  {name:'CV_LEVEL_BANNER_DEF',desc:'',hide:true},
    7:  {name:'Red Level Bar',desc:'Sets your level bar color to red'},
    8:  {name:'Green Level Bar',desc:'Sets your level bar color to blue'},
    9:  {name:'Blue Level Bar',desc:'Sets your level bar color to green'},
    10: {name:'Pink Level Bar',desc:'Sets your level bar color to pink'},
    11: {name:'CV_LEVEL_THEME_OKABOT',desc:'',hide:true},
    12: {name:'Custom Coinflip Messages',desc:'Lets you change the messages you get with /coinflip.'},
    13: {name:'Custom okash Message',desc:'Lets you change the message you get with /okash'},
    14: {name:'bank access',desc:'this item should not be visible in the customize listing'},
    15: {name:'loan access',desc:'this item should not be visible in the customize listing'},
    16: {name:'<:cff_dgreen:1316187558375456859> Dark Green Coin',desc:'A dark green coin. Even though it\'s not weighted, you still feel luckier using it.'},
    17: {name:'<a:cff_rainbow:1316224243855261776> Rainbow Coin',desc:'This Mythical coin, said to be gifted from the gods, is almost useless, however it looks extremely cool.'},
    18: {name:'User Banner Level Background',desc:'Enables your level banner to use your Discord banner as its background'},
    19: {name:'CV_LEVEL_BAR_CUSTOM',desc:'',hide:true}
}

export async function HandleCommandPockets(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const page = interaction.options.getString('page');

    const fields: any = [];

    if (page == 'customize') {
        const profile = GetUserProfile(interaction.user.id);

        for (const unlock of profile.customization.unlocked) {
            if (!UNLOCK_NAMES[unlock].hide) fields.push({
                name: UNLOCK_NAMES[unlock].name, value: UNLOCK_NAMES[unlock].desc
            })
        }
    } else {
        const inventory = GetInventory(interaction.user.id);
        let counts: any = {};

        for (const gem of inventory.gems) {
            counts[gem] = counts[gem] ? counts[gem] + 1 : 1;
        }

        const gems_done: Array<GEMS> = [];
        const items_done: Array<ITEMS> = [];

        for (const gem of inventory.gems) {
            if (gems_done.indexOf(gem) == -1) {
                fields.push(
                    {name: `${counts[gem]}x ${GEM_NAMES[gem].name}`, value:GEM_NAMES[gem].desc}
                );
                gems_done.push(gem);
            }
        }

        counts = {};
        for (const item of inventory.other) {
            counts[item] = counts[item] ? counts[item] + 1 : 1;
        }

        for (const item of inventory.other) {
            if (items_done.indexOf(item) == -1) {
                fields.push(
                    {name: `${counts[item]}x ${ITEM_NAMES[item].name}`, value:ITEM_NAMES[item].desc}
                );
                items_done.push(item);
            }
        }
    }

    if (fields.length == 0) {
        return interaction.editReply({
            content:`:crying_cat_face: **${interaction.user.displayName}**, you have nothing in your pockets!`
        });
    }

    // console.log(fields);

    const embed = new EmbedBuilder()
        .setTitle(page=='items'?'Your pockets':'Your unlocked customizations')
        .setColor(0x9d60cc)
        .setFields(fields)
        .setAuthor({iconURL: interaction.user.displayAvatarURL(), name: interaction.user.displayName});
        
    interaction.editReply({embeds:[embed]});
}