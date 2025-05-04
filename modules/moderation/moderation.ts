import {Logger} from "okayulogger";
import {
    EmbedBuilder,
    GuildMember,
    Message,
    MessageReaction,
    PartialMessageReaction,
    PermissionsBitField, ReactionEmoji,
    Snowflake, TextChannel, User
} from "discord.js";
import {BASE_DIRNAME, client, DEV} from "../../index";
import {join} from "path";
import {existsSync, readFileSync, writeFileSync} from "fs";


const L = new Logger('moderation');


// flagging cooldowns should be 60s
const FlaggingCooldowns = new Map<Snowflake, number>();

/**
 * Check if a reaction is a flag, and if so, create a report message in the moderation channel
 * @param reaction The MessageReaction (likely a partial)
 * @param reactor The User who reacted
 */
export async function CheckReactionFlag(reaction: MessageReaction | PartialMessageReaction, reactor: User) {
    // we only care if it's the flag emoji
    if (reaction.emoji.name != '🚩') return;
    L.info(`is partial message reaction? ${reaction.partial?'yes':'no'}`);

    if (reaction.partial) {
        reaction = await reaction.fetch();
    }

    const channel = reaction.client.channels.cache.get(reaction.message.channel.id) as TextChannel | undefined;
    if (!channel) return L.error(`Could not get channel ID ${reaction.message.channel.id}`);
    const message = channel.messages.cache.get(reaction.message.id);
    if (!message) return L.error(`Could not get message ID ${reaction.message.id}`);
    const sender = reaction.client.users.cache.get(message.author.id);
    if (!sender) return L.error(`Could not get user ID ${message.author.id}`);

    L.info(`message "${message.content}" by user @${sender.username}(${message.author.id}) flagged!`);

    const now = (new Date()).getTime();
    // is the user on a flagging cooldown?
    // if so, remove the reaction and ignore
    if (FlaggingCooldowns.has(reactor.id) && FlaggingCooldowns.get(reactor.id)! > now) return reaction.remove();

    // if not, send to appropriate channel
    const channel_id_to_send = !DEV?'1364076295348289628':'941843973641736253';
    const channel_to_send = reaction.client.channels.cache.get(channel_id_to_send);

    if (!channel_to_send) return L.error('Could not get moderator channel!');

    const message_link = `https://discord.com/channels/${message.guild!.id}/${message.channel.id}/${message.id}`;

    const embed = new EmbedBuilder()
        .setTitle(`Message was flagged by @${reactor.username}`)
        .setColor(0xff0000)
        .addFields(
            {name:'Sender', value:`<@${sender.id}> (\`${message.author.id})\``},
            {name:'Content', value:message.content},
            {name:'Message ID', value:`\`${message.id}\``}
        );

    (channel_to_send as TextChannel).send({
        content: `<@&1364076117358674052> **Message flagged in <#${reaction.message.channel.id}>!**\nGo to message: ${message_link}`,
        embeds: [embed]
    });

    FlaggingCooldowns.set(reactor.id, now + 60_000);
}


/**
 * Checks for moderation shorthands such as o.ban or o.kick
 */
export async function CheckModerationShorthands(message: Message) {
    if (message.content.startsWith('o.ban')) return BanUser(message);
    if (message.content.startsWith('o.kick')) return KickUser(message);
    if (message.content.startsWith('o.warn')) return WarnUser(message);
    if (message.content.startsWith('o.log')) return GetUserWarningsLog(message);
}


async function BanUser(message: Message) {
    const guild = client.guilds.cache.get(message.guild!.id)!;

    // check if user has permissions
    const author = guild.members.cache.get(message.author.id)!;
    const can_use_command = author.permissions.has(PermissionsBitField.Flags.BanMembers) || author.roles.cache.some(role => role.name === 'okabot mod');

    if (!can_use_command) return message.react('❌');

    let username: string;

    const args = message.content.split(' ');
    if (args.length == 1) {
        //
        // message is only "o.ban"
        //

        // check if message is a reply
        if (!message.reference) return message.reply({
            content: `:x: Please either reply to a message or specify who to ban!`
        });

        // get the replied-to message
        const reference_message = message.channel.messages.cache.get(message.reference.messageId!);

        // BAN them!!
        const member = guild.members.cache.get(reference_message!.author.id)!;
        username = member.user.username;

        member.ban({reason:`Banned by ${message.author.username} with okabot shorthand o.ban`});
    } else {
        //
        // message is likely "o.ban <mention/id>"
        //

        // assume that the 2nd argument is just a userid
        let user_id: Snowflake = args[1];

        // check if it's actually a mention
        if (args[1].includes('@')) {
            // is a mention-based argument, so we must get the userid from the formatted mention
            user_id = args[1].split('<@')[1].split('>')[0];
        }

        // get the user guild member cache
        const member = guild.members.cache.get(user_id);
        if (!member) return message.reply({
            content:`:x: Invalid user ID or mention \`${user_id}\`!`
        });

        username = member.user.username;
        member.ban({reason:`Banned by ${message.author.username} with okabot shorthand o.ban`});
    }

    message.reply({
        content:`<:uno_denied:1356840136209600543> **Banned ${username}! Behave better next time!**`
    });
}

async function KickUser(message: Message) {
    const guild = client.guilds.cache.get(message.guild!.id)!;

    // check if user has permissions
    const author = guild.members.cache.get(message.author.id)!;
    const can_use_command = author.permissions.has(PermissionsBitField.Flags.KickMembers) || author.roles.cache.some(role => role.name === 'okabot mod');

    if (!can_use_command) return message.react('❌');

    let username: string;

    const args = message.content.split(' ');
    if (args.length == 1) {
        //
        // message is only "o.kick"
        //

        // check if message is a reply
        if (!message.reference) return message.reply({
            content: `:x: Please either reply to a message or specify who to kick!`
        });

        // get the replied-to message
        const reference_message = message.channel.messages.cache.get(message.reference.messageId!);

        // kick them!!
        const member = guild.members.cache.get(reference_message!.author.id)!;
        username = member.user.username;

        member.kick();
    } else {
        //
        // message is likely "o.kick <mention/id>"
        //

        // assume that the 2nd argument is just a userid
        let user_id: Snowflake = args[1];

        // check if it's actually a mention
        if (args[1].includes('@')) {
            // is a mention-based argument, so we must get the userid from the formatted mention
            user_id = args[1].split('<@')[1].split('>')[0];
        }

        // get the user guild member cache
        const member = guild.members.cache.get(user_id);
        if (!member) return message.reply({
            content:`:x: Invalid user ID or mention \`${user_id}\`!`
        });

        username = member.user.username;
        member.kick();
    }

    message.reply({
        content:`<:uno_denied:1356840136209600543> **Kicked ${username}! Come back when you can behave!**`
    });
}

interface Warning {
    time: number,
    user: Snowflake,
    warner: Snowflake,
    reason: string,
}

const UserWarnings: {[key: Snowflake]: Array<Warning>} = {};

export async function LoadWarnings() {
    const db_path = join(BASE_DIRNAME, 'db', 'warnings.oka');
    if (!existsSync(db_path)) return writeFileSync(db_path, JSON.stringify({}), 'utf-8');

    const warnings_data: {[key: Snowflake]: Array<Warning>} = JSON.parse(readFileSync(db_path, 'utf-8'));
    Object.keys(warnings_data).forEach((key) => {
        UserWarnings[key] = warnings_data[key];
    });

    L.info('Loaded warnings database');
}
async function SaveWarnings() {
    const db_path = join(BASE_DIRNAME, 'db', 'warnings.oka');
    writeFileSync(db_path, JSON.stringify(UserWarnings), 'utf-8');
}

async function WarnUser(message: Message) {
    const guild = client.guilds.cache.get(message.guild!.id)!;

    // check if user has permissions
    const author = guild.members.cache.get(message.author.id)!;
    const can_use_command = author.permissions.has(PermissionsBitField.Flags.KickMembers) || author.roles.cache.some(role => role.name === 'okabot mod');

    if (!can_use_command) return message.react('❌');

    if (!message.reference) return message.reply({
        content: `:x: Please reply to a message to warn!`
    });

    // get the replied-to message
    const reference_message = message.channel.messages.cache.get(message.reference.messageId!);

    // warn them!!
    const member = guild.members.cache.get(reference_message!.author.id)!;
    const now = (new Date()).getTime();
    const reason = message.content.split('o.warn ')[1] || 'No reason specified. Please specify a reason when warning users!';

    if (!UserWarnings[member.id]) UserWarnings[member.id] = [];

    UserWarnings[member.id].push({
        time: now,
        warner: message.author.id,
        user: member.id,
        reason
    });

    message.reply({
        content:`:white_check_mark: Warned ${member.user.username} with reason "${reason}"`
    });

    SaveWarnings();
}

async function GetUserWarningsLog(message: Message) {
    const guild = client.guilds.cache.get(message.guild!.id)!;

    // check if user has permissions
    const author = guild.members.cache.get(message.author.id)!;
    const can_use_command = author.permissions.has(PermissionsBitField.Flags.KickMembers) || author.roles.cache.some(role => role.name === 'okabot mod');

    if (!can_use_command) return message.react('❌');

    const user_id = message.content.split('o.log ')[1];

    if (!user_id) return message.reply({
        content: `:x: Please specify a user ID!`
    });

    const member = message.client.users.cache.get(user_id);

    if (!UserWarnings[user_id] || UserWarnings[user_id].length == 0) return message.reply({
        content: `## Warnings for ${(member || {username: user_id}).username}\nUser has no recorded warnings. Nice!`
    });

    let final_message = `## There are ${UserWarnings[user_id].length} warnings for ${(member || {username: user_id}).username}\n`;

    UserWarnings[user_id].forEach(warning => {
        final_message = final_message + `- <t:${Math.round(warning.time / 1000)}:R> Warned by <@${warning.user}> for "${warning.reason}"\n`
    });

    message.reply({
        content: final_message,
    });
}