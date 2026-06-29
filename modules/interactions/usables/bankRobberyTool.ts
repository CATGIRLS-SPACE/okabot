import {ChatInputCommandInteraction, MessageFlags} from "discord.js";
import {EMOJI, GetEmoji} from "../../../util/emoji";
import {CheckFeatureAvailability, ServerFeature} from "../../system/serverPrefs";
import {GetUserProfile, UpdateUserProfile} from "../../user/prefs";
import {GetBank} from "../../okash/wallet";
import { t } from "../../i18n/translation";


export async function item_bank_robbery_tool(interaction: ChatInputCommandInteraction) {
    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.okash)) return interaction.reply({
        content: await t('system.errors.command.disabled', interaction.okabot.translateable_locale)
    });

    const robbed_user = interaction.options.getUser('on-user', false);

    if (!robbed_user) return interaction.reply({
        content: await t('interactions.use.dont_have', interaction.okabot.translateable_locale, {name: interaction.user.displayName, item: await t('item.brt.name')}),
        flags: [MessageFlags.Ephemeral]
    });

    const robbed_user_profile = GetUserProfile(robbed_user.id);

    if (robbed_user.id == interaction.user.id) return interaction.reply({
        content: await t('items.brt.on_use.fail_self', interaction.okabot.translateable_locale, {name: interaction.user.displayName}),
        flags: [MessageFlags.Ephemeral]
    });

    if (robbed_user.bot) return interaction.reply({
        content: await t('items.brt.on_use.fail_bot', interaction.okabot.translateable_locale, {name: interaction.user.displayName}),
        flags: [MessageFlags.Ephemeral]
    });

    // make sure user is in this server
    if (interaction.guild!.members.cache.get(robbed_user.id) == undefined) {
        return interaction.reply({
            content: await t('items.brt.on_use.fail_not_in_server', interaction.okabot.translateable_locale, {name: interaction.user.displayName}),
            flags: [MessageFlags.Ephemeral]
        });
    }

    const robbed_user_balance = GetBank(robbed_user.id);

    if (robbed_user_balance < 10_000) {
        return interaction.reply({
            content: await t('items.brt.on_use.fail_not_enough', interaction.okabot.translateable_locale, {
                name: interaction.user.displayName, 
                victim: robbed_user.displayName,
                possessive: robbed_user_profile.customization.global.pronouns.possessive,
                subjective: robbed_user_profile.customization.global.pronouns.subjective,
            }),
            flags: [MessageFlags.Ephemeral]
        });
    }

    const random_robbed_amount = Math.floor(Math.random() * (robbed_user_balance * 0.85)) + 15;
    
    robbed_user_profile.okash.bank -= random_robbed_amount;
    
    const robber_profile = GetUserProfile(interaction.user.id);
    robber_profile.okash.bank += random_robbed_amount;

    UpdateUserProfile(interaction.user.id, robber_profile);
    UpdateUserProfile(robbed_user.id, robbed_user_profile);

    interaction.reply({
        content: await t('items.brt.on_use.success', interaction.okabot.translateable_locale, {
            name: interaction.user.displayName,
            victim: `<@${robbed_user.id}>`,
            amount: random_robbed_amount,
            brt: await t('items.brt.name', interaction.okabot.translateable_locale)
        })
    });
}