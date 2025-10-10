import {EMOJI, GetEmoji} from "../../util/emoji";
import {AttachmentBuilder, Message, TextChannel} from "discord.js";
import {Achievements, GrantAchievement} from "./achievement";
import {BASE_DIRNAME, client} from "../../index";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {CheckFeatureAvailability, ServerFeature} from "../system/serverPrefs";

const TYO_RESPONSE: Array<string> = [
    'of course!',
    'no problem!',
    '<3',
    `${GetEmoji(EMOJI.NEKOHEART)}`,
    'thank you too!',
    'i do my best!'
]

export async function CheckForFunMessages(message: Message) {
    if (!message.channel.isDMBased() && !CheckFeatureAvailability(message.guild!.id, ServerFeature.easter_eggs)) return;

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

    // CGC-exclusive starts here
    if (message.guildId != '1019089377705611294' && message.guildId != '748284249487966282') return;

    if (message.content.toLocaleLowerCase().includes('quit horsing around')) message.reply({
        content:'https://cdn.discordapp.com/attachments/796206588284895272/1422450172159463504/IMG_0266.gif', // store locally sometime
    });

    if (/^d#\d+$/.test(message.content)) {
        const danbooru_response = await fetch(`https://danbooru.donmai.us/posts/${message.content.split('#')[1]}.json`);
        const post = await danbooru_response.json();
        const image_asset_res = (await fetch(post.file_url));
        const arrayBuffer = await image_asset_res.arrayBuffer();
        message.reply({
            content: post.rating=='g'?'':`(post rating: ${post.rating})`,
            files: [new AttachmentBuilder(Buffer.from(arrayBuffer), {name: post.rating=='g'?'danbooru.jpg':'SPOILER_danbooru.jpg'})]
        });
    }
    if (message.content.startsWith('d$')) {
        let tags;
        let num = 10;
        let offset = 1;
        if (message.content.includes('>')) {
            tags = message.content.split(' >')[0].split('$')[1];
            const after = message.content.split('> ')[1].trim();
            if (after.includes('offset ')) {
                num = Math.min(5, parseInt(after.split(' offset ')[0]));
                offset = parseInt(after.split('offset ')[1]);
            } else num = Math.min(5, parseInt(after));
        }
        else tags = message.content.split('$')[1];

        if (Number.isNaN(num)) return message.reply('Bad chain options. Examples:\n- `d$nia_(xenoblade) rating:g > 3`\n- `d$nia_(xenoblade) rating:g > 3 offset 3`\nOffset increments by 1, but changes based on how many you have requested.\n"3 offset 3" would get you the top 7, 8, 9.\n"2 offset 3" would get you the top 5, 6.');

        const danbooru_response = await fetch(`https://danbooru.donmai.us/posts.json?tags=${tags}&limit=${num}&page=${offset}`);
        const posts = await danbooru_response.json();

        if (posts.success == false) return message.reply({
            content: `:warning: Error from Danbooru: \`${posts.message}\`\n(note: tags such as \`rating:g\` **do not** count towards the two-tag limit!)`
        });

        if (posts.length == 0) return message.reply({content:'No posts for list, are your tags correct? Tags example: `nia_(xenoblade) open_mouth rating:g`\n(note: tags such as \`rating:g\` **do not** count towards the two-tag limit!)'});

        if (num == 10) {
            // just send the list
            let postlist = 'Found posts:\n';
            for (const post of posts) {
                postlist += `- #${post.id} - **${post.rating.toUpperCase()}**\n`
            }

            message.reply({
                content: postlist + 'View one with "d#<post id>"'
            });
        } else {
            // get up to 5 images at once
            num = Math.min(num, posts.length);
            const files = [];
            const post_ids = [];
            for (let i = 0; i < num; i++) {
                post_ids.push(posts[i].id);
                const image_asset_res = (await fetch(posts[i].media_asset.variants.at(2).url));
                const arrayBuffer = await image_asset_res.arrayBuffer();
                files.push(new AttachmentBuilder(Buffer.from(arrayBuffer), {name:posts[i].rating=='g'?`danbooru-${posts[i].id}.jpg`:`SPOILER_danbooru-${posts[i].id}.jpg`}));
            }

            message.reply({
                content: `Top ${num} posts for your search. Lower quality is chosen to prevent oversize.\nIDs: ${post_ids.join(', ')}`,
                files
            });
        }
    }
}