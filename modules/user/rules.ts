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


const agreement = new EmbedBuilder()
    .setAuthor({name:'okabot'})
    .setTitle('okabot Rules')
    .setDescription('You must read and agree to these rules before using okabot (updated 2026-02-20). If this is suddenly appearing again, the rules have updated and you must agree to the new rules.')
    .setFields(
        {name:'1. No Exploiting',value:'Any abuse of bugs or manipulation will cause your account to be irreversibly **reset without warning**. Alongside, you may potentially be banned from using okabot entirely.'},
        {name:'2. No Macros!!!!!!!',value:'Effortless gambling isn\'t fair to others. Don\'t use macros/scripts.'},
        {name:'3. No multiaccounting',value:'You are allowed one account and one account only for okabot.'},
        {name:'4. No illegal okash activities',value:'You are prohibited from trading okash/items for real-world currencies or items in any other bot. Trading okash to trade items is OK.'},
        {name:'Disclaimer',value:'By using okabot, you are consenting to having select data collected about you/your usage of okabot. This information may be linked to your Discord user ID or other identifying information. This information is not shared with third-parties. If this is not your first time using okabot, and you wish to have all data pertaining to your account deleted, please DM okabot "data deletion request" and the rest of the process can be handled from there.'},
    );


const AcceptButton = new ButtonBuilder()
    .setLabel('Accept')
    .setCustomId('accept')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅')

const AgreementComponentBar = new ActionRowBuilder()
    .addComponents(AcceptButton);


const KNOWN_AGREED_USER_IDS: Array<string> = [];
const CURRENT_RULES_VERSION = '2026-02-20';

export async function CheckRuleAgreement(interaction: ChatInputCommandInteraction): Promise<boolean> {
    // helps to eliminate disk-read slowdowns
    if (KNOWN_AGREED_USER_IDS.indexOf(interaction.user.id) != -1) return true; 

    const profile = GetUserProfile(interaction.user.id);
    if (profile.accepted_rules && profile.rules_accepted_version == CURRENT_RULES_VERSION) {
        KNOWN_AGREED_USER_IDS.push(interaction.user.id);
        return true;
    }

    // hasn't agreed to rules

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
                content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} You agreed to the rules! Thank you for using okabot! Have fun!`,
                components: [],
                embeds: []
            });
        }
    }));

    return false;
}

export async function CheckForRulesSimple(user_id: Snowflake): Promise<boolean> {
    // helps to eliminate disk-read slowdowns
    if (KNOWN_AGREED_USER_IDS.indexOf(user_id) != -1) return true; 

    const profile = GetUserProfile(user_id);
    if (profile.accepted_rules && profile.rules_accepted_version == CURRENT_RULES_VERSION) {
        KNOWN_AGREED_USER_IDS.push(user_id);
        return true;
    }

    // hasn't agreed to rules
    return false;
}

const rule_messages = new Map<Snowflake, Snowflake>();

export async function TextBasedRules(message: Message) {
    if (await CheckForRulesSimple(message.author.id)) return message.reply({content:'You\'ve already agreed to the rules!',embeds:[agreement]});

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
            content:`${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${reactor.displayName}**, you've agreed to the rules! Have fun with okabot!\nYou can run this command again at any time to see the rules.`,
            embeds:[]
        });
        rule_messages.delete(reactor.id);
    }
}