import { ChatInputCommandInteraction } from "discord.js";
import { CUSTOMIZATION_UNLOCKS } from "../okash/items";
import { GetUserProfile, UpdateUserProfile } from "../user/prefs";


export async function HandleCommandCustomize(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const sub = interaction.options.getSubcommand();

    switch (sub) {
        case 'coinflip':
            CustomizeCoinflip(interaction);
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
    'rainbow coin':CUSTOMIZATION_UNLOCKS.COIN_RAINBOW
};
async function CustomizeCoinflip(interaction: ChatInputCommandInteraction) {
    const customization = interaction.options.getString('coin', true).toLowerCase();

    if (VALID_COIN_TYPES[customization] == undefined) return interaction.editReply({
        content:`:crying_cat_face: **${interaction.user.displayName}**, that's not a valid coin!`
    });

    const profile = GetUserProfile(interaction.user.id);

    if (profile.customization.unlocked.indexOf(VALID_COIN_TYPES[customization]) == -1) return interaction.editReply({
        content:`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but it looks like you don't own that coin!`
    });

    profile.customization.coin_color = VALID_COIN_TYPES[customization];
    UpdateUserProfile(interaction.user.id, profile);

    interaction.editReply({
        content:`<:cat_sunglasses:1315853022324326482> **${interaction.user.displayName}**, I've switched your coin out for a \`${customization}\`. Have fun flipping!`
    });
}