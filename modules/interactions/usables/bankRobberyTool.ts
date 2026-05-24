import {ChatInputCommandInteraction, MessageFlags} from "discord.js";
import {EMOJI, GetEmoji} from "../../../util/emoji";
import {CheckFeatureAvailability, ServerFeature} from "../../system/serverPrefs";
import {GetUserProfile} from "../../user/prefs";
import {GetBank} from "../../okash/wallet";


export async function item_bank_robbery_tool(interaction: ChatInputCommandInteraction) {
    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.okash)) return interaction.reply({
        content: 'This feature isn\'t available in this server. Maybe ask a server admin to enable it?'
    });

    const robbed_user = interaction.options.getUser('on-user', false);

    if (!robbed_user) return interaction.reply({
        content: `**${interaction.user.displayName}**, you don't have a ${GetEmoji(EMOJI.BANK_ROBBERY_TOOL)} **Hacking Tool**!`,
        flags: [MessageFlags.Ephemeral]
    });

    const robbed_user_profile = GetUserProfile(robbed_user.id);

    if (robbed_user.id == interaction.user.id) return interaction.reply({
        content: `:x: **${interaction.user.displayName}**, you can't rob yourself!`,
        flags: [MessageFlags.Ephemeral]
    });

    if (robbed_user.bot) return interaction.reply({
        content: `:x: **${interaction.user.displayName}**, you can't rob ${robbed_user_profile.customization.global.pronouns.objective}!`,
        flags: [MessageFlags.Ephemeral]
    });

    // make sure user is in this server
    if (interaction.guild!.members.cache.get(robbed_user.id) == undefined) {
        return interaction.reply({
            content: `:x: **${interaction.user.displayName}**, huh... looks like that person off in another server.`,
            flags: [MessageFlags.Ephemeral]
        });
    }

    const robbed_user_balance = GetBank(robbed_user.id);

    if (robbed_user_balance < 10_000) {
        return interaction.reply({
            content: `:crying_cat_face: **${robbed_user.displayName}** has too little okash in ${robbed_user_profile.customization.global.pronouns.possessive} pockets to rob! They need at least ${GetEmoji(EMOJI.OKASH)} OKA**10,000** to make it worthwile!`,
            flags: [MessageFlags.Ephemeral]
        });
    }
}