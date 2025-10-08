import {EMOJI, GetEmoji} from "../../util/emoji";
import {AttachmentBuilder, Message, TextChannel} from "discord.js";
import {Achievements, GrantAchievement} from "./achievement";
import {BASE_DIRNAME, client} from "../../index";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TYO_RESPONSE: Array<string> = [
    'of course!',
    'no problem!',
    '<3',
    `${GetEmoji(EMOJI.NEKOHEART)}`,
    'thank you too!',
    'i do my best!'
]

export async function CheckForFunMessages(message: Message) {
    if (message.content.toLocaleLowerCase().includes('thank you') && message.content.toLocaleLowerCase().includes('okabot')) {
        message.reply({
            content:TYO_RESPONSE[Math.floor(Math.random() * TYO_RESPONSE.length)]
        });
        return GrantAchievement(message.author, Achievements.THANK_OKABOT, message.channel as TextChannel);
    }

    if ((message.content.toLocaleLowerCase().includes('fuck you') ||
            message.content.toLocaleLowerCase().includes('kys') ||
            message.content.toLocaleLowerCase().includes('screw you'))
        &&
        (message.content.toLocaleLowerCase().includes('okabot') ||
            message.content.toLocaleLowerCase().includes('okaboob') ||
            (message.reference && (await message.fetchReference()).author.id == client.user!.id)
        )) {
        await message.reply({
            content: 'https://b.whats.moe/gif/dekocry.gif'
        });
        return GrantAchievement(message.author, Achievements.OKABOT_CRY, message.channel as TextChannel);
    }

    if (message.content.toLowerCase().includes('kill myself') ||
        message.content.toLowerCase().includes('killing myself') ||
        message.content.toLowerCase().includes('kms'))
    {
        return message.reply({
            content:(Math.random()>0.8)?'https://b.whats.moe/video/neverkys_alt.mp4':'https://b.whats.moe/video/neverkys.mp4'
        });
    }


    if (message.content.toLowerCase().includes('hot cockolate')) message.reply({
        content:'',
        files:[new AttachmentBuilder(readFileSync(join(BASE_DIRNAME, 'assets', 'var', 'koharu.webp')))]
    });

    if (message.content.toLowerCase().includes('nozomi') || message.content.toLowerCase().includes('hikari')) message.reply({
        content: 'https://cdn.discordapp.com/attachments/633444420297031682/1421993693258317907/81b49a72a78b48c6b4e54cb40f56a86f.mov'
    })

    if (message.content.toLocaleLowerCase().includes('quit horsing around')) message.reply({
        content:'https://cdn.discordapp.com/attachments/796206588284895272/1422450172159463504/IMG_0266.gif', // store locally sometime
    });
}