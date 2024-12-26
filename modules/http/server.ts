import { json } from 'body-parser';
import express, { Request, Response } from 'express';
import { DEV } from '../..';
import { Client, MessageFlags, TextChannel } from 'discord.js';
const server = express();

let channelId = "1321639990383476797";
let channel: TextChannel;

server.use(json());

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
                content: `:arrow_right: **${req.body.username}** left.`,
                flags: MessageFlags.SuppressNotifications
            });
            break;

        case 'death':
            channel.send({
                content: `:skull: Yikes! **${req.body.message}**`,
                flags: MessageFlags.SuppressNotifications
            });
            break;

        default:
            channel.send({
                content: `**${req.body.username}:** ${req.body.content}`,
                flags: MessageFlags.SuppressNotifications
            });
            break;
    }
});

export function StartHTTPServer(c: Client) {
    channel = c.channels.cache.get(channelId)! as TextChannel;

    server.listen(9256);
}