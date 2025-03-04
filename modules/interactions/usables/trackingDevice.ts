import {ChatInputCommandInteraction} from "discord.js";
import {GetUserProfile, UpdateUserProfile} from "../../user/prefs";
import {CreateTrackedItem, VALID_ITEMS_TO_TRACK} from "../../okash/trackedItem";
import {CUSTOMIZATION_UNLOCKS, CUSTOMIZTAION_ID_NAMES, ITEMS} from "../../okash/items";

export async function item_tracking_device(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const use_on = interaction.options.getString('on', true).toLowerCase();
    let profile = GetUserProfile(interaction.user.id);

    if (!profile.inventory.includes(ITEMS.TRACKED_CONVERTER)) return interaction.editReply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have a **Tracking Device** to use!`
    });

    if (!VALID_ITEMS_TO_TRACK[use_on]) return interaction.editReply({
        content: `:crying_cat_face: Sorry, **${interaction.user.displayName}**, but that's not a valid item you can make a Tracked:tm:!`
    });

    if (!profile.customization.unlocked.includes(VALID_ITEMS_TO_TRACK[use_on])) return interaction.editReply({
        content: `:crying_cat_face: Sorry, **${interaction.user.displayName}**, but it looks like you don't have that item!`
    });

    const name = CUSTOMIZTAION_ID_NAMES[VALID_ITEMS_TO_TRACK[use_on]];
    const possessive = profile.customization.global.pronouns.possessive;

    interaction.editReply({
        content: `:electric_plug: **${interaction.user.displayName}** starts applying a **Tracking Device** to ${possessive} **${name}** and...`
    });

    const serial = await CreateTrackedItem('customization', VALID_ITEMS_TO_TRACK[use_on], interaction.user.id);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    profile = GetUserProfile(interaction.user.id); // just in case
    if (profile.customization.games.coin_color == VALID_ITEMS_TO_TRACK[use_on]) profile.customization.games.coin_color = CUSTOMIZATION_UNLOCKS.COIN_DEF;
    profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(VALID_ITEMS_TO_TRACK[use_on]), 1);
    profile.trackedInventory.push(serial);
    UpdateUserProfile(interaction.user.id, profile);

    interaction.editReply({
        content: `:electric_plug: **${interaction.user.displayName}** starts applying a **Tracking Device** to ${possessive} **${name}** and... done!\nThe new **Tracked:tm: ${name}**'s Serial No. is \`${serial}\`!`
    });
}