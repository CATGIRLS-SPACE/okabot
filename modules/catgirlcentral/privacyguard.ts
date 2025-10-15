import {Message, TextChannel} from "discord.js";
import {UcwhCreateMessage} from "./ucwhmgr";


export async function PrivacyGuardCheckLinks(message: Message) {
    // this is a demo test function so it only supports spotify
    // it's very sloppy
    if (message.content.includes('open.spotify') && (message.content.includes('?si=') || message.content.includes('&si='))) {
        // link will 99% of the time be open.spotify.com/track/abcdef?si=fjsdahfjkdshfjk
        // so just split at the ? and roll
        const parts = message.content.split(' ');
        let new_content = '';
        for (const part of parts) {
            if (part.includes('open.spotify') && (part.includes('?si=') || part.includes('&si='))) new_content += ' ' + part.split('?')[0];
            else new_content += ' ' + part;
        }
        try {
            await UcwhCreateMessage(message.author, message.channel as TextChannel, new_content + '\n-# :broom: okabot automatically cleaned this message of some known tracking link parameters.');
            message.delete();
        } catch (err) {
            console.error(err);
            // do nothing cause why
        }
    }
}