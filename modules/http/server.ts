import { json } from 'body-parser';
import express, { Request, Response } from 'express';
import {BASE_DIRNAME, client, CONFIG, DEV} from '../../index';
import {Client, EmbedBuilder, MessageFlags, Snowflake, TextChannel, User} from 'discord.js';
import { join } from 'path';
import { CheckUserShares, GetSharePrice, Stocks } from '../okash/stock';
import { createServer } from 'http';
import { Logger } from 'okayulogger';
import { Server } from 'ws';
import {PrivilegedConnections, SendLoginRequest} from "./pairing";
const server = express();

let channelId = "1321639990383476797";
let channel: TextChannel;

const L = new Logger('http');

server.use(json());
server.set('view engine', 'ejs');
server.set('views', join(__dirname, 'page'));

server.get('/minecraft', (req, res) => {
    res.send('cannot get this route, please post instead.');
});
server.post('/minecraft', (req: Request, res: Response) => {
    // console.log('request: ', req.body);
    res.status(200).end();
    
    if (DEV) return;
    
    switch (req.body.type) {
        case 'chat':
            channel.send({
                content: `**${req.body.username}:** ${req.body.content}`,
                flags: MessageFlags.SuppressNotifications
            });
            break;

        case 'join':
            channel.send({
                content: `:arrow_right: **${req.body.username}** joined.`,
                flags: MessageFlags.SuppressNotifications
            });
            break;

        case 'leave':
            channel.send({
                content: `:arrow_left: **${req.body.username}** left.`,
                flags: MessageFlags.SuppressNotifications
            });
            break;

        case 'death':
            channel.send({
                content: `:skull: Yikes! **${req.body.message}**`,
                flags: MessageFlags.SuppressNotifications
            });
            break;
        
        case 'afk':
            channel.send({
                content: `:zzz: **${req.body.username}** is now AFK.`,
                flags: MessageFlags.SuppressNotifications
            });
            break;

        case 'unafk':
            channel.send({
                content: `:city_sunrise: **${req.body.username}** is no longer AFK.`,
                flags: MessageFlags.SuppressNotifications
            });
            break;

        case 'achievement':
            channel.send(`:tada: **${req.body.username}** has completed the advancement **${req.body.name}**!\n-# ${req.body.description}`);
            break;

        default:
            channel.send({
                content: `:grey_question: unknown message type "${req.body.type}"\nfull body: \`${JSON.stringify(req.body)}\``,
                flags: MessageFlags.SuppressNotifications
            });
            break;
    }
});

server.get('/asset/:item', (req: Request, res: Response) => {
    res.sendFile(join(BASE_DIRNAME, 'modules', 'http', 'page', 'assets', req.params.item));
});

server.get('/management', (req: Request, res: Response) => {
    res.render('admin.ejs');
});

const SERVER = createServer(server);
const wss = new Server({server: SERVER});

export function StartHTTPServer(c: Client) {
    channel = c.channels.cache.get(channelId)! as TextChannel;

    SERVER.listen(9256).on('listening', () => {
        L.info('Server listening on :9256');
    });
}

interface PriviligedSession {
    user_id: Snowflake,
}

const aliveConnections: import("ws")[] = [];
// const priviligedSessions: { [key: string]: PriviligedSession } = {};


wss.on('connection', (ws) => {
    L.info('new websocket connection...');
    aliveConnections.push(ws);

    ws.on('message', async (raw_message) => {
        L.info('(ws message) ' + raw_message.toString());
        const session = raw_message.toString().split('SESSION ')[1].split(' ')[0];
        const message = raw_message.toString().split(`SESSION ${session} `)[1];

        if (message == `QUERY`) {
            if (PrivilegedConnections.has(session) && PrivilegedConnections.get(session)!.privileged) ws.send(`SESSION ${session} PRIVILIGED`);
            else ws.send(`SESSION ${session} REAUTH`);
        }

        if (message.toString().startsWith('REQUEST LOGIN ')) {
            const user_id = message.toString().split('REQUEST LOGIN ')[1];
            const message_success = await SendLoginRequest(user_id, session);
            L.info(`send login request to ${user_id} ${message_success?'success':'failure'}`);
            if (!message_success) ws.send(`SESSION ${session} ERROR CANNOT DM`);
            else ws.send(`SESSION ${session} SUCCESS AWAITING RESPONSE`);
            return;
        }
    });

    // remove on disconnect
    ws.on('close', () => {
        L.info('websocket has disconnected');
        aliveConnections.splice(aliveConnections.indexOf(ws), 1);
    })
});

function SendPings() {
    aliveConnections.forEach(ws => {
        ws.send(`KEEPALIVE`);
    });
    setTimeout(SendPings, 30_000);
}
SendPings();

export function UpdateDMDataStatus(connected: boolean) {
    aliveConnections.forEach(ws => {
        ws.send(`DMDATA ${connected?'CONNECTED':'DISCONNECTED'}`);
    });
}

export function AuthorizeLogin(session: string, user_id: Snowflake) {
    const priviliged = CONFIG.permitted_to_use_shorthands.includes(user_id);
    aliveConnections.forEach(ws => {
        ws.send(`SESSION ${session} ${priviliged?'PRIVILIGED':'NOT PRIVILIGED'}`);
    });
}

export function DenyLogin(session: string, user_id: Snowflake) {
    aliveConnections.forEach(ws => {
        ws.send(`SESSION ${session} DENY`);
    });
}