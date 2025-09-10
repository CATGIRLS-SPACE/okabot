import {EmbedBuilder, Guild, Message, Snowflake, TextChannel, User} from "discord.js";
import {Logger} from "okayulogger";
import { client } from "../../index";

const L = new Logger('automod');
const URL_REGEX = new RegExp(/^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&/=]*$/);

/**
 * Runs some checks on a message to ensure it follows rules
 * @param message The message to check
 */
export async function AutomodCheckMessage(message: Message) {
    const words = message.content.split(' ');

    // URL checks
    // check each word for a link
    let check_links = true; // if there's links, can they be sent?
    for (const word of words) {
        if (URL_REGEX.test(word)) check_links = check_links && await RunURLCheck(word, message.author.id, message.guildId!);
    }
}

let GUILD: Guild | undefined;
const CAN_SEND_LINKS: Array<Snowflake> = [];

async function RunURLCheck(url: string, user_id: Snowflake, guild_id: Snowflake): Promise<boolean> {
    if (!GUILD) GUILD = client.guilds.cache.get(guild_id)!;
    if (!CAN_SEND_LINKS.includes(user_id)) {
        const member = GUILD.members.cache.get(user_id)!;
        if (!member.roles.cache.some(role => role.name === 'image perms (lvl 10)')) return false; 
        // can send links
        CAN_SEND_LINKS.push(user_id);
    }

    return true;
}

/**
 * Checks the user account creation date. If it's less than
 * two weeks old, send an alert to the #moderator channel
 * @param user The user who joined `(GuildMember).user`
 */
export function AutomodAccountCreationDate(user: User) {
    const now = new Date();
    const min_age = 2*604800; // 2 weeks minimum
    const must_join_before = now.getTime() - min_age;
    if (user.createdAt.getTime() < must_join_before) return;

    const channel_to_send = user.client.channels.cache.get('1364076295348289628');
    if (!channel_to_send) return L.error('Could not get moderator channel!');

    const embed = new EmbedBuilder()
        .setTitle(`Joining user has an account less than two weeks old!`)
        .setColor(0xff0000)
        .addFields(
            {name:'User', value:`<@${user.id}>`},
            {name:'User ID', value:`\`${user.id}\``}
        );

    (channel_to_send as TextChannel).send({
        content: `<@&1364076117358674052> **User account age alert**`,
        embeds: [embed]
    });
}