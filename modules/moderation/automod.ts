import {EmbedBuilder, Message, TextChannel, User} from "discord.js";
import {Logger} from "okayulogger";

const L = new Logger('automod');
const URL_REGEX = new RegExp(/^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-a-zA-Z0-9()@:%_+.~#?&\/=]*$/);

/**
 * Runs some checks on a message to ensure it follows rules
 * @param message The message to check
 */
export function AutomodCheckMessage(message: Message) {
    const words = message.content.split(' ');

    // URL checks
    // check each word for a link
    const links = [];
    for (const word of words) {
        if (URL_REGEX.test(word)) links.push(word);
    }
}

async function RunURLCheck(url: string) {

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