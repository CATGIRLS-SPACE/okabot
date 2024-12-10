import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { GetInventory } from "../okash/wallet";
import { GEMS, ITEMS } from "../okash/items";

const GEM_NAMES: {
    [key: number]: {name: string, desc: string}
} = {
    0: {name:'<:g00:1315084985589563492> Streak Restore',desc:'Restores your streak to its last amount if it is larger than your current streak.'}
}
const ITEM_NAMES: {
    [key: number]: {name: string, desc: string}
} = {
    0: {name:':package: common',desc:'common box description'},
    1: {name:':package: rare',desc:'rare box description'},
    2: {name:':package: rarest',desc:'rarest box description'},
    3: {name:'<:cff_green:1315843280776462356> Weighted Coin',desc:'Slightly increases your chances at winning your next coinflip.'}
}

export async function HandleCommandPockets(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const inventory = GetInventory(interaction.user.id);
    const fields: any = [];
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

    if (fields.length == 0) {
        return interaction.editReply({
            content:`:crying_cat_face: **${interaction.user.displayName}**, you have nothing in your inventory!`
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('Your inventory')
        .setColor(0x9d60cc)
        .setFields(fields)
        .setAuthor({iconURL: interaction.user.displayAvatarURL(), name: interaction.user.displayName});
        
    interaction.editReply({embeds:[embed]});
}