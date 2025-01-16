import { json } from 'body-parser';
import express, { Request, Response } from 'express';
import { BASE_DIRNAME, DEV } from '../..';
import { Client, EmbedBuilder, MessageFlags, TextChannel } from 'discord.js';
import { join } from 'path';
import { GetSharePrice, Stocks } from '../okash/stock';
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

wss.on('connection', (ws) => {
    L.info('new websocket connection...');

    ws.on('message', (message) => {
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
            default:
                ws.send('bad message');
                break;
        }
    });
});