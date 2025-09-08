import { Message } from "discord.js";
import { TextBasedOkash } from "../modules/interactions/okash";
// import { TextBasedDaily } from "../modules/interactions/daily";


/**
 * Checks if the user has sent a valid command and maps it to its respective handler.
 * @param message The user's message
 */
export async function CheckForTextCommands(message: Message) {
    if (message.channel.isDMBased()) return;

    if (message.content.startsWith('o.kash')) return TextBasedOkash(message);
    // if (message.content.startsWith('o.daily')) return TextBasedDaily(message);
}