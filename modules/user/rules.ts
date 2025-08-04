import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Message,
    MessageFlags,
    TextChannel
} from "discord.js";
import { GetUserProfile, UpdateUserProfile } from "./prefs";
import {EMOJI, GetEmoji} from "../../util/emoji";


const agreement = new EmbedBuilder()
    .setAuthor({name:'okabot'})
    .setTitle('okabot Rules')
    .setDescription('You must read and agree to these rules before using okabot')
    .setFields(
        {name:'1. No Exploiting',value:'Any abuse of bugs or manipulation will cause your account to be irreversibly **reset without warning**. Alongside, you may potentially be banned from using okabot entirely.'},
        {name:'2. No Macros!!!!!!!',value:'Effortless gambling isn\'t fair to others. Don\'t use macros/scripts.'},
        {name:'3. No multiaccounting',value:'You are allowed one account and one account only for okabot.'},
        {name:'4. No illegal okash activities',value:'You are prohibited from trading okash/items for real-world currencies or items in any other bot. Trading okash to trade items is OK.'},
    );

const agreement_jp = new EmbedBuilder()
    .setAuthor({name:'okabot'})
    .setTitle('okabotのルール')
    .setDescription('okabotを使用する前に、これらの規則を読み、同意する必要があります')
    .setFields(
        {name:'1. 搾取しない',value:'バグや操作の悪用があった場合、あなたのアカウントは警告なしに不可逆的に**リセット**されます。併せて、okabotの使用を完全に禁止される可能性もあります。'},
        {name:'2. マクロなし',value:'楽なギャンブルは他の人に公平ではありません。マクロやスクリプトを使わない。'},
        {name:'3. 何時までも唯一のアカウント',value:'okabotのアカウントは1つだけです。'},
        {name:'4. 違法なokash行為の禁止',value:'okash/アイテムを現実世界の通貨や他のbotのアイテムと交換することは禁止されています。okashとアイテムの交換は可能です。'},
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

    const reply = await interaction.reply({
        embeds: [interaction.okabot.locale=='ja'?agreement_jp:agreement],
        flags: [MessageFlags.Ephemeral],
        components: [AgreementComponentBar as any]
    });

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;
    const collector = reply.createMessageComponentCollector({ filter: collectorFilter, time: 120_000 });

    collector.on('collect', (i => {
        if (i.customId == 'accept') {
            const profile = GetUserProfile(interaction.user.id);
            profile.accepted_rules = true;
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