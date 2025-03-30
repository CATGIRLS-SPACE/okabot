import {ChatInputCommandInteraction, EmbedBuilder, Message, MessageFlags, TextChannel} from "discord.js";
import { GetUserProfile, UpdateUserProfile } from "./prefs";


const agreement = new EmbedBuilder()
    .setAuthor({name:'okabot'})
    .setTitle('okabot Rules')
    .setDescription('You must read and agree to these rules before using okabot')
    .setFields(
        {name:'1. No Exploiting',value:'Any abuse of bugs or manipulation will cause your account to be irreversibly **reset without warning**. Alongside, you may potentially be banned from using okabot entirely.'},
        {name:'2. No Macros',value:'Effortless gambling isn\'t fair to others. Don\'t use macros/scripts.'},
        {name:'3. No multiaccounting',value:'You are allowed one account and one account only for okabot.'},
        {name:'4. No illegal okash activities',value:'You are prohibited from trading okash/items for real-world currencies or items in any other bot.'},
        {name:'5. Reset Clause',value:'Depending on circumstances and potential issues, data resets may occur at any time, with or without warning.'},
    )
    .setFooter({text:'Please type "I understand and agree to the okabot rules" to gain access to okabot.\n*(日本語：「私はokabotのルールを分かると賛成します」)*'});


const KNOWN_AGREED_USER_IDS: Array<string> = [];
const AWAITING_RULE_AGREEMENT: Array<string> = [];


export async function CheckRuleAgreement(interaction: ChatInputCommandInteraction): Promise<boolean> {
    // helps to eliminate disk-read slowdowns
    if (KNOWN_AGREED_USER_IDS.indexOf(interaction.user.id) != -1) return true; 

    const profile = GetUserProfile(interaction.user.id);
    if (profile.accepted_rules) {
        KNOWN_AGREED_USER_IDS.push(interaction.user.id);
        return true;
    }

    // hasn't agreed to rules

    if (!interaction.inGuild()) {
        interaction.reply({
            content:'Please go to a server to run a command and agree to the rules.',
            flags: [MessageFlags.Ephemeral]
        });
        return false;
    }

    await interaction.reply({
        embeds: [agreement],
        flags: [MessageFlags.Ephemeral]
    });

    AWAITING_RULE_AGREEMENT.push(interaction.user.id);

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