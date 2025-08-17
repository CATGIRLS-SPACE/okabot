import { existsSync, readFileSync, writeFileSync } from "fs";
import { BASE_DIRNAME, client, DEV } from "../../index";
import { join } from "path";
import { ButtonStyle, Snowflake, TextChannel } from "discord.js";
import { Request, Response } from "express";
import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { HttpStatusCode } from "axios";

let LINKS: {[key: string]: Snowflake} = {};

export async function SetupGoodluckle() {
    if (!existsSync(join(BASE_DIRNAME, 'db', 'gll.oka'))) {
        writeFileSync(join(BASE_DIRNAME, 'db', 'gll.oka'), '{"links":{}}');
    }

    const db = JSON.parse(readFileSync(join(BASE_DIRNAME, 'db', 'gll.oka'), 'utf-8'));
    
    LINKS = db.links;
}

const acceptLoginButton = new ButtonBuilder()
    .setCustomId('accept-login')
    .setLabel('✅ Allow Login')
    .setStyle(ButtonStyle.Success);

const denyLoginButton = new ButtonBuilder()
    .setCustomId('deny-login')
    .setLabel('❌ Deny Login')
    .setStyle(ButtonStyle.Danger);

const loginBar = new ActionRowBuilder()
    .addComponents(
        acceptLoginButton,
        denyLoginButton
    );

const LINKING_TOKENS = new Map<string, string>();
const AUTHORIZED_TOKENS = new Map<string, string>();

export async function AuthorizeUser(req: Request, res: Response) {
    // get user
    const username = req.query.username as string;
    const token = req.query.token as string;
    try {
        const user = client.users.cache.find((user) => user.username == username);
        if (!user) throw new Error(`failed to find user ${username}`);

        const direct_message = await user.send({
            content: `## :closed_lock_with_key: __**AUTHENTICATION REQUEST**__\nDo you want to allow login to Goodluckle (token: ||${token}||)?\nYou have 60 seconds to allow login, otherwise it will be automatically cancelled.`,
            components: [loginBar as any]
        });

        LINKING_TOKENS.set(token, username);
        
        const collector = direct_message.createMessageComponentCollector({
            filter: (i: any) => i.user.id === user.id,
            time: 60_000
        });

        collector.on('collect', async (i) => {
            if (i.customId == 'accept-login') {
                AUTHORIZED_TOKENS.set(token, user.id);
                i.update({
                    content:'Allowed login.',
                    components:[]
                });
            } else if (i.customId == 'deny-login') {
                AUTHORIZED_TOKENS.delete(token);
                i.update({
                    content:'Login was denied.',
                    components:[]
                });
            }
        });

        res.status(HttpStatusCode.Ok).json({success:true}).end();
    } catch (error) {
        console.error(error);
        res.status(HttpStatusCode.NotFound).json({success:false});
    }
}

export async function StartAddLink(req: Request, res: Response) {
    const token = req.query.token as string;
    // get user
    const user_id = AUTHORIZED_TOKENS.get(token);
    if (!user_id) return res.status(404).json({success:false,reason:'Token Not Authorized.'});
    // const user = client.users.cache.get(user_id);
    // if (!user) return res.status(500).json({success:false});
    // get catgirl central
    const cgc = client.guilds.cache.get(!DEV?'1019089377705611294':'748284249487966282');
    if (!cgc) return res.status(500).json({success:false});
    // is user part of cgc?
    if (!cgc?.members.cache.has(user_id)) return res.status(403).json({success:false,reason:'Not part of CATGIRL CENTRAL.'});
    LINKS[token] = user_id;
    writeFileSync(join(BASE_DIRNAME, 'db', 'gll.oka'), JSON.stringify({links:LINKS}));
    res.status(200).json({success:true});
}

export async function PostToNyt(req: Request, res: Response) {
    const token = req.query.token as string;
    const score = req.query.score as string;

    const user_id = LINKS[token];
    if (!user_id) return res.status(404).json({success:false});

    const channel = <TextChannel> client.channels.cache.get(!DEV?'1310486655257411594':'858904835222667315');
    channel.send(`Goodluckle: <@${user_id}> scored ${score.replaceAll('g', '🟩').replaceAll('y', '🟨').replaceAll('x', '⬛')}!\nhttps://millie.zone/goodluckle`);

    res.status(200).json({success:true});
}