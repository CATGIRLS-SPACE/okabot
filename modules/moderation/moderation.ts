import {Logger} from "okayulogger";
import {GuildMember, Message, PermissionsBitField, Snowflake} from "discord.js";
import {client} from "../../index";


const L = new Logger('moderation');


/**
 * Checks for moderation shorthands such as o.ban or o.kick or o.mute
 */
export async function CheckModerationShorthands(message: Message) {
    if (message.content.startsWith('o.ban')) return BanUser(message);
    if (message.content.startsWith('o.kick')) return KickUser(message);
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
    const can_use_command = author.permissions.has(PermissionsBitField.Flags.BanMembers) || author.roles.cache.some(role => role.name === 'okabot mod');

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