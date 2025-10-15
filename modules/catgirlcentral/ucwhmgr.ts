import {TextChannel, User} from "discord.js";
import {client} from "../../index";

export async function UcwhCreateMessage(user: User, channel: TextChannel, content: string) {
    const hook = await channel.createWebhook({
        name: 'okabot-ucwh_'+user.username,
    });

    await hook.send({
        content,
        avatarURL: user.avatarURL() || client.user!.avatarURL()!,
        username: user.displayName
    });

    await hook.delete();
}