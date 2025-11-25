import {client} from "../../index";
import {Events, GuildChannel, Message} from "discord.js";

/*
    This file will ban any accounts that post a message in #the-honeypot (1443015504259317881).
    It is intended to catch spambots before they can cause any damage.
 */

export async function EnableHoneypots() {
    client.on(Events.MessageCreate, async (message: Message) => {
        // if (message.channel.id !== '1443015504259317881') return;
        const channel = await message.channel.fetch() as GuildChannel;
        if (channel.name != 'okabot-honeypot') return;


        const server_id = message.guildId!;
        const server = client.guilds.cache.get(server_id);
        if (!server) throw new Error('How has this happened? the cat tree server does not exist?');

        const member = await server.members.fetch(message.author.id);

        try {
            member.send('You were banned from the cat tree via the honeypot. You were warned, no appeals will be granted.\nIf you have regained a compromised account, please DM @meowlliie with evidence as to your account being compromised, and you will be unbanned.');
        } catch {
            console.error('tried to tell the member they were banned, failed, but i wont throw an error.');
        }

        member.ban({reason: 'Caught by honeypot. Appeals will be denied.', deleteMessageSeconds: 86_400}); // 1 day
    });
}