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
    TextChannel,
    User
} from "discord.js";
import { GetUserProfile, UpdateUserProfile } from "./prefs";
import {EMOJI, GetEmoji} from "../../util/emoji";


const agreement = new EmbedBuilder()
    .setAuthor({name:'okabot'})
    .setTitle('okabot Rules')
    .setDescription('You must read and agree to these rules before using okabot (updated 2025-08-24)')
    .setFields(
        {name:'1. No Exploiting',value:'Any abuse of bugs or manipulation will cause your account to be irreversibly **reset without warning**. Alongside, you may potentially be banned from using okabot entirely.'},
        {name:'2. No Macros!!!!!!!',value:'Effortless gambling isn\'t fair to others. Don\'t use macros/scripts.'},
        {name:'3. No multiaccounting',value:'You are allowed one account and one account only for okabot.'},
        {name:'4. No illegal okash activities',value:'You are prohibited from trading okash/items for real-world currencies or items in any other bot. Trading okash to trade items is OK.'},
        {name:'Disclaimer',value:'By using okabot, you consent to the anonymous collection of statistics, including but not limited to: command usage, passive feature usage, and active feature usage.'},
    );


const AcceptButton = new ButtonBuilder()
    .setLabel('Accept')
    .setCustomId('accept')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅')

const AgreementComponentBar = new ActionRowBuilder()
    .addComponents(AcceptButton);


const KNOWN_AGREED_USER_IDS: Array<string> = [];
const AWAITING_RULE_AGREEMENT: Array<string> = [];


export async function CheckRuleAgreement(interaction: ChatInputCommandInteraction): Promise<boolean> {
    // helps to eliminate disk-read slowdowns
    if (KNOWN_AGREED_USER_IDS.indexOf(interaction.user.id) != -1) return true; 

    const profile = GetUserProfile(interaction.user.id);
    if (profile.accepted_rules && profile.consents_to_statistics) {
        KNOWN_AGREED_USER_IDS.push(interaction.user.id);
        return true;
    }

    // hasn't agreed to rules

    // if (!interaction.inGuild()) {
    //     interaction.reply({
    //         content:'Please go to a server to run a command and agree to the rules.',
    //         flags: [MessageFlags.Ephemeral]
    //     });
    //     return false;
    // }

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
            profile.consents_to_statistics = true;
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


export async function CheckForAgreementMessage(message: Message) {
    if (AWAITING_RULE_AGREEMENT.indexOf(message.author.id) == -1) return;

    if (
        message.content == 'I understand and agree to the okabot rules' || 
        message.content == 'I understand and agree to the okabot rules.' ||
        message.content == '私はokabotのルールを分かると賛成します'
    ) {
        const profile = GetUserProfile(message.author.id);
        profile.accepted_rules = true;
        UpdateUserProfile(message.author.id, profile);

        AWAITING_RULE_AGREEMENT.splice(AWAITING_RULE_AGREEMENT.indexOf(message.author.id), 1);
        
        message.delete();
        const reply = await (message.channel as TextChannel).send(`:white_check_mark: <@${message.author.id}> You are now able to use okabot.`);

        setTimeout(() => {
            reply.delete();
        }, 5000);
    }
}

export async function CheckForRulesSimple(user_id: Snowflake): Promise<boolean> {
    // helps to eliminate disk-read slowdowns
    if (KNOWN_AGREED_USER_IDS.indexOf(user_id) != -1) return true; 

    const profile = GetUserProfile(user_id);
    if (profile.accepted_rules && profile.consents_to_statistics) {
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
        profile.consents_to_statistics = true;
        UpdateUserProfile(reactor.id, profile);
        (await reaction.message.fetch()).edit({
            content:`${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${reactor.displayName}**, you've agreed to the rules! Have fun with okabot!\nYou can run this command again at any time to see the rules.`,
            embeds:[]
        });
        rule_messages.delete(reactor.id);
    }
}