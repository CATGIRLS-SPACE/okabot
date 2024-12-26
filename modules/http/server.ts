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
    
    channel.send({
        content: `**${req.body.username}:** ${req.body.content}`,
        flags: MessageFlags.SuppressNotifications
    })
});

export function StartHTTPServer(c: Client) {
    channel = c.channels.cache.get(channelId)! as TextChannel;

    server.listen(9256);
}