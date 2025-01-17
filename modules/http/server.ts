import { json } from 'body-parser';
import express, { Request, Response } from 'express';
import { BASE_DIRNAME, DEV } from '../..';
import { Client, EmbedBuilder, MessageFlags, TextChannel, User } from 'discord.js';
import { join } from 'path';
import { CheckUserShares, GetSharePrice, Stocks } from '../okash/stock';
import { createServer } from 'http';
import { Logger } from 'okayulogger';
import { Server } from 'ws';
const server = express();

let channelId = "1321639990383476797";
let channel: TextChannel;

const L = new Logger('http');

server.use(json());
server.set('view engine', 'ejs');

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

// live stock view
server.get('/stock', (req: Request, res: Response) => {
    res.render(join(BASE_DIRNAME, 'modules', 'http', 'page', 'stock'));
});
server.get('/stock.js', (req: Request, res: Response) => {
    res.sendFile(join(BASE_DIRNAME, 'modules', 'http', 'page', 'stock.js'));
});
server.get('/asset/:item', (req: Request, res: Response) => {
    res.sendFile(join(BASE_DIRNAME, 'modules', 'http', 'page', 'assets', req.params.item));
});
server.get('/api/stock', (req: Request, res: Response) => {
    const prices = {
        neko:GetSharePrice(Stocks.NEKO),
        dogy:GetSharePrice(Stocks.DOGY),
        fxgl:GetSharePrice(Stocks.FXGL),
    };
    res.json(prices);
});

const SERVER = createServer(server);
const wss = new Server({server: SERVER});

export function StartHTTPServer(c: Client) {
    channel = c.channels.cache.get(channelId)! as TextChannel;

    SERVER.listen(9256).on('listening', () => {
        L.info('Server listening on :9256');
    });
}

const aliveConnections: import("ws")[] = [];
const linkedConnections = new Map<string, import('ws')>();
const awaitingLinking: {[key:string]: User} = {};

const alpha = 'ABCDEF1234567890';
function GenerateLinkCode(): string {
    let code = '';
    for (let i = 0; i < 6; i++) code += alpha[Math.floor(Math.random() * alpha.length)];
    return code;
}

wss.on('connection', (ws) => {
    L.info('new websocket connection...');

    ws.on('message', (message) => {
        L.info('(ws message) ' + message.toString());

        if (message.toString().startsWith('balance ')) {
            return SendUserStocks(message.toString().split(' ')[1]);
        }
        if (message.toString().startsWith('ACCEPT ')) {
            const user = awaitingLinking[message.toString().split(' ')[1]];
            console.log(user);
            if (!user) return ws.send(`LINK ERROR ${message.toString().split(' ')[1]} NOT VALID`);

            L.info(`link for ${user.username} success!`);
            linkedConnections.set(user.id, ws);
            ws.send(`LINK GOOD ${message.toString().split(' ')[1]} READY`);
        }

        switch (message.toString()) {
            case 'stocks latest':
                const prices = {
                    _type:'stocks',
                    neko:GetSharePrice(Stocks.NEKO),
                    dogy:GetSharePrice(Stocks.DOGY),
                    fxgl:GetSharePrice(Stocks.FXGL),
                };
                ws.send(JSON.stringify(prices));
                break;
            case 'nya~':
                aliveConnections.push(ws);
                ws.send(`woof! ${GenerateLinkCode()}`);
                break;
            default:
                ws.send('bad message');
                break;
        }
    });

    // remove on disconnect
    ws.on('close', () => {
        L.info('websocket has disconnected');
        aliveConnections.splice(aliveConnections.indexOf(ws), 1);
    })
});

export enum WSSStockMessage {
    NATURAL_UPDATE = 'stocks',
    NATURAL_UPDATE_SPIKE_UP = 'spike_up',
    NATURAL_UPDATE_SPIKE_DOWN = 'spike_down',
    EVENT_UPDATE_POSITIVE = 'event_positive',
    EVENT_UPDATE_NEGATIVE = 'event_negative',
    USER_UPDATE_POSITIVE = 'user_positive',
    USER_UPDATE_NEGATIVE = 'user_negative',
    LINK_BALANCE = 'link_balance'
}

export function WSS_SendStockUpdate(type: WSSStockMessage, data?: any) {
    let payload = {};

    switch (type) {
        case WSSStockMessage.NATURAL_UPDATE:
            payload = {
                _type: type,
                neko:GetSharePrice(Stocks.NEKO),
                dogy:GetSharePrice(Stocks.DOGY),
                fxgl:GetSharePrice(Stocks.FXGL),
            };
            break;
        
        case WSSStockMessage.USER_UPDATE_POSITIVE: case WSSStockMessage.USER_UPDATE_NEGATIVE:
            payload = {
                _type: type,
                stock: data.stock,
                value: Math.floor(data.value)
            };
            break;

        case WSSStockMessage.EVENT_UPDATE_POSITIVE: case WSSStockMessage.EVENT_UPDATE_NEGATIVE:
            payload = {
                _type: type,
                neko:GetSharePrice(Stocks.NEKO),
                dogy:GetSharePrice(Stocks.DOGY),
                fxgl:GetSharePrice(Stocks.FXGL),
                event: data
            };
            break;

        case WSSStockMessage.LINK_BALANCE:
            return SendUserStocks(data.user.id);
    
        default:
            break;
    }

    aliveConnections.forEach(connection => {
        connection.send(JSON.stringify(payload));
    });
}

export function LinkWSToUserId(user: User, link_code: string) {
    aliveConnections.forEach(connection => {
        awaitingLinking[link_code.toLocaleUpperCase()] = user;
        connection.send(`LINK ${link_code.toLocaleUpperCase()} ${user.username} ${user.id}`);
    });
}

function SendUserStocks(user_id: string) {
    L.info(`getting linked stock info for ${user_id}`);

    const payload = {
        _type: 'link balance',
        neko: Math.floor(CheckUserShares(user_id, Stocks.NEKO) * GetSharePrice(Stocks.NEKO)),
        dogy: Math.floor(CheckUserShares(user_id, Stocks.DOGY) * GetSharePrice(Stocks.DOGY)),
        fxgl: Math.floor(CheckUserShares(user_id, Stocks.FXGL) * GetSharePrice(Stocks.FXGL)),
    };

    linkedConnections.get(user_id)!.send(JSON.stringify(payload));
}