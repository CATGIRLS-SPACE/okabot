import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Interaction,
    Message,
    MessageFlags,
    MessageReaction,
    Snowflake,
    User
} from "discord.js";
import { GetUserProfile, UpdateUserProfile } from "./prefs";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {t} from "../i18n/translation";

export const CURRENT_RULES_VERSION = '2026-03-12';


export async function CheckRuleAgreement(interaction: ChatInputCommandInteraction): Promise<boolean> {
    const profile = GetUserProfile(interaction.user.id);
    if (profile.accepted_rules && profile.rules_accepted_version == CURRENT_RULES_VERSION) return true;

    // hasn't agreed to rules

    const agreement = new EmbedBuilder()
        .setAuthor({name:'okabot'})
        .setTitle(await t('system.rules.title', interaction.okabot.translateable_locale))
        .setDescription(await t('system.rules.desc', interaction.okabot.translateable_locale, {version: CURRENT_RULES_VERSION}))
        .setFields(
            {name:await t('system.rules.name.one', interaction.okabot.translateable_locale),value:await t('system.rules.value.one', interaction.okabot.translateable_locale)},
            {name:await t('system.rules.name.two', interaction.okabot.translateable_locale),value:await t('system.rules.value.two', interaction.okabot.translateable_locale)},
            {name:await t('system.rules.name.three', interaction.okabot.translateable_locale),value:await t('system.rules.value.three', interaction.okabot.translateable_locale)},
            {name:await t('system.rules.name.four', interaction.okabot.translateable_locale),value:await t('system.rules.value.four', interaction.okabot.translateable_locale)},
            {name:await t('system.rules.name.five', interaction.okabot.translateable_locale),value:await t('system.rules.value.five', interaction.okabot.translateable_locale)},
            {name:await t('system.rules.name.disclaimer', interaction.okabot.translateable_locale),value:await t('system.rules.value.disclaimer', interaction.okabot.translateable_locale)},
        )
        /*.setFooter({
            text:'You can read about okabot\'s privacy policy at https://oka.bot/privacy'
        })*/;


    const AcceptButton = new ButtonBuilder()
        .setLabel(await t('system.rules.accept', interaction.okabot.translateable_locale))
        .setCustomId('accept')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')

    const AgreementComponentBar = new ActionRowBuilder()
        .addComponents(AcceptButton);

    const reply = await interaction.reply({
        embeds: [agreement],
        flags: [MessageFlags.Ephemeral],
        components: [AgreementComponentBar as never]
    });

    const collectorFilter = (i: Interaction) => i.user.id === interaction.user.id;
    const collector = reply.createMessageComponentCollector({ filter: collectorFilter, time: 120_000 });

    collector.on('collect', (i => {
        if (i.customId == 'accept') {
            const profile = GetUserProfile(interaction.user.id);
            profile.accepted_rules = true;
            profile.rules_accepted_version = CURRENT_RULES_VERSION;
            UpdateUserProfile(interaction.user.id, profile);

            i.update({
                content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} ${t('system.rules.agreed', interaction.okabot.translateable_locale)}`,
                components: [],
                embeds: []
            });
        }
    }));

    return false;
}

export async function CheckForRulesSimple(user_id: Snowflake): Promise<boolean> {
    const profile = GetUserProfile(user_id);
    if (profile.accepted_rules && profile.rules_accepted_version == CURRENT_RULES_VERSION) return true;

    // hasn't agreed to rules
    return false;
}

const rule_messages = new Map<Snowflake, Snowflake>();

export async function TextBasedRules(message: Message) {
    const agreement = new EmbedBuilder()
        .setAuthor({name:'okabot'})
        .setTitle(await t('system.rules.title', 'en-US'))
        .setDescription(await t('system.rules.desc', 'en-US', {version: CURRENT_RULES_VERSION}))
        .setFields(
            {name:await t('system.rules.name.one', 'en-US'),value:await t('system.rules.value.one', 'en-US')},
            {name:await t('system.rules.name.two', 'en-US'),value:await t('system.rules.value.two', 'en-US')},
            {name:await t('system.rules.name.three', 'en-US'),value:await t('system.rules.value.three', 'en-US')},
            {name:await t('system.rules.name.four', 'en-US'),value:await t('system.rules.value.four', 'en-US')},
            {name:await t('system.rules.name.five', 'en-US'),value:await t('system.rules.value.five', 'en-US')},
            {name:await t('system.rules.name.disclaimer', 'en-US'),value:await t('system.rules.value.disclaimer', 'en-US')},
        )
        /*.setFooter({
            text:'You can read about okabot\'s privacy policy at https://oka.bot/privacy'
        })*/;

    if (await CheckForRulesSimple(message.author.id)) return message.reply({content:await t('system.rules.already_agreed'),embeds:[agreement]});

    const reply = await message.reply({embeds:[agreement]});
    reply.react('🆗');

    rule_messages.set(message.author.id, reply.id);
}

export async function CheckForRuleReact(reaction: MessageReaction, reactor: User) {
    if (rule_messages.get(reactor.id) == reaction.message.id) {
        const profile = GetUserProfile(reactor.id);
        profile.accepted_rules = true;
        profile.rules_accepted_version = CURRENT_RULES_VERSION;
        UpdateUserProfile(reactor.id, profile);
        (await reaction.message.fetch()).edit({
            content:`${GetEmoji(EMOJI.CAT_SUNGLASSES)} ${t('system.rules.agreed_text', 'en-US', {name: reactor.displayName})}`,
            embeds:[]
        });
        rule_messages.delete(reactor.id);
    }
}