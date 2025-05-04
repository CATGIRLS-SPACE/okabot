import {Message, MessageFlags} from "discord.js";
import {ParseRelativeTime} from "./relativeTimeParser";


export function RemindLater(message: Message) {
    const parsed_time = ParseRelativeTime(message.content.split('o.remind ')[1]);
    if (isNaN(parsed_time)) return message.reply({
        content: `please tell me when, like "o.remind 3h" for 3 hours from now!`,
        flags: [MessageFlags.SuppressNotifications],
    });
}