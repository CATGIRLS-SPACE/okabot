import {EMOJI, GetEmoji} from "../../util/emoji";
import {Message, TextChannel} from "discord.js";
import {Achievements, GrantAchievement} from "./achievement";
import {client} from "../../index";

const TYO_RESPONSE: Array<string> = [
    'of course!',
    'no problem!',
    '<3',
    `${GetEmoji(EMOJI.NEKOHEART)}`,
    'thank you too!',
    'i do my best!'
]

const TYOB_RESPONSE: Array<string> = [
    'my name is okabot!',
    'it is not okaboob!',
    'why do you bully me :crying_cat_face:',
    'it is okabot :pouting_cat:',
    'please call me okabot :crying_cat_face:',
    'https://bot.lilycatgirl.dev/gif/dekocry.gif'
]

export async function CheckForFunMessages(message: Message) {
    if (message.content.toLocaleLowerCase().startsWith('thank you okabot')) {
        message.reply({
            content:TYO_RESPONSE[Math.floor(Math.random() * TYO_RESPONSE.length)]
        });
        GrantAchievement(message.author, Achievements.THANK_OKABOT, message.channel as TextChannel);
    }

    if (message.content.toLocaleLowerCase().startsWith('thank you okaboob')) {
        message.reply({
            content:TYOB_RESPONSE[Math.floor(Math.random() * TYOB_RESPONSE.length)]
        });
    }

    if ((message.content.toLocaleLowerCase().includes('fuck you') ||
            message.content.toLocaleLowerCase().includes('kys'))
        &&
        (message.content.toLocaleLowerCase().includes('okabot') ||
            message.content.toLocaleLowerCase().includes('okaboob') ||
            (message.reference && (await message.fetchReference()).author.id == client.user!.id)
        )) {
        await message.reply({
            content: 'https://bot.lilycatgirl.dev/gif/dekocry.gif'
        });
        GrantAchievement(message.author, Achievements.OKABOT_CRY, message.channel as TextChannel);
    }

    if (message.guild && message.guild.id == '1019089377705611294' && message.content.toLocaleLowerCase().includes('massive')) message.reply({
        content:'https://tenor.com/view/ninja-any-haircut-recommendations-low-taper-fade-you-know-what-else-is-massive-gif-3708438262570242561'
    });

    if (message.content.toLowerCase().includes('kill myself') ||
        message.content.toLowerCase().includes('killing myself') ||
        message.content.toLowerCase().includes('kms'))
    {
        message.reply({
            content:(Math.random()>0.8)?'https://bot.lilycatgirl.dev/video/neverkys_alt.mp4':'https://bot.lilycatgirl.dev/video/neverkys.mp4'
        });
    }
}