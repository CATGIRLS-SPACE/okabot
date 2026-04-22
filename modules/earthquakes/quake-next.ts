import {Logger} from "okayulogger";
import {EmbedBuilder, MessageFlags, TextChannel} from "discord.js";
import {client} from "../../index";
import {WebSocket} from 'ws';
import {EarthquakeInformationSchemaBody, ShindoValue} from "lily-dmdata";

const L = new Logger('earthquakes (next)')

let REPORT_CHANNEL: TextChannel;

export enum ConnectionStatus {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    AWAITING_RECONNECT,
    FAILED,
}
export let CONNECTION_STATUS = ConnectionStatus.DISCONNECTED;

export async function InitEarthquakes(api_key: string, report_channel: string, is_retry: boolean = false) {
    REPORT_CHANNEL = await client.channels.fetch(report_channel) as TextChannel;
    if (!REPORT_CHANNEL) return L.fatal('Invalid report channel set.');

    // get ticket for websocket
    CONNECTION_STATUS = ConnectionStatus.CONNECTING;

    let resp;

    try {
        resp = await fetch('https://api.dmdata.jp/v2/socket', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(api_key)}`
            },
            body: JSON.stringify({
                classifications: [
                    'telegram.earthquake',
                    'eew.forecast', 'eew.warning'
                ],
                test: 'including'
            })
        });
    } catch (err) {
        console.error(err);
        CONNECTION_STATUS = ConnectionStatus.FAILED;
        return REPORT_CHANNEL.send({
            content: 'DMData connection failed due to `fetch()` rejection. See logs for info.'
        });
    }

    const data = await resp.json();
    if (data.status != 'ok') {
        console.log(data);

        if (is_retry) {
            CONNECTION_STATUS = ConnectionStatus.AWAITING_RECONNECT;
            // try again in 5 minutes
            setTimeout(() => InitEarthquakes(api_key, report_channel, true), 60_000 * 5);
            return REPORT_CHANNEL.send({
                content: 'Failed to get DMData ticket after disconnect, I will try again in 5 minutes.',
                flags: [MessageFlags.SuppressNotifications]
            });
        }

        L.fatal('Failed to get DMData ticket!');
        CONNECTION_STATUS = ConnectionStatus.FAILED;
        throw new Error(`DMData ticket retrieval failure: ${JSON.stringify(data)}`);
    }

    const ticket = data.ticket;

    // start the socket

    L.info('Connecting to DMData...');

    const socket = new WebSocket(`wss://ws.api.dmdata.jp/v2/websocket?ticket=${ticket}`);

    socket.on('open', () => {
        L.info('Socket open success!');
        CONNECTION_STATUS = ConnectionStatus.CONNECTED;
        REPORT_CHANNEL.send({content:`ᓀ‸ᓂ DMData connection successful!`, flags:[MessageFlags.SuppressNotifications]});
    });
    // error handling
    socket.on('error', (error) => {
        L.warn(`Socket errored: ${error.message}`);
        CONNECTION_STATUS = ConnectionStatus.AWAITING_RECONNECT;
        REPORT_CHANNEL.send({content:`ᓀ‸ᓂ I was disconnected from DMData because the socket threw an error. I will retry in 60 seconds...`, flags:[MessageFlags.SuppressNotifications]});
        try {
            socket.close();
        } catch {
            L.debug('socket likely already closed, ignoring...');
        }
        setTimeout(() => {
            InitEarthquakes(api_key, report_channel, true);
        }, 60_000);
    });
    socket.on('close', () => {
        L.warn(`Socket closed unexpectedly!`);
        CONNECTION_STATUS = ConnectionStatus.AWAITING_RECONNECT;
        REPORT_CHANNEL.send({content:`ᓀ‸ᓂ I was disconnected from DMData unexpectedly! I will retry in 60 seconds...`, flags:[MessageFlags.SuppressNotifications]});
        try {
            socket.close();
        } catch {
            L.debug('socket likely already closed, ignoring...');
        }
        setTimeout(() => {
            InitEarthquakes(api_key, report_channel, true);
        }, 60_000);
    });

    // actual messages
    socket.on('message', (msg: string) => {
        L.debug(`got new message => ${msg}`);
        const data = JSON.parse(msg);

        // handle pings
        if (data.type == 'ping') {
            socket.send(JSON.stringify({
                type: 'pong',
                pingId: data.pingId
            }));
            return;
        }

        if (data.type == 'data') {
            ParseData(data);
        }
    });
}


function ParseData(data: EarthquakeInformationSchemaBody) {
    if (data.type == 'earthquake-information') {
        // This is an earthquake report
        if (!data.earthquake) return ReportEpicenterUnderInvestigation(data);
    }

    if (data.type == 'eew-information') {
        // This is an EEW(F)
    }
}


function ReportEpicenterUnderInvestigation(data: EarthquakeInformationSchemaBody) {
    REPORT_CHANNEL.send({
        embeds: [
            new EmbedBuilder()
                .setTitle(`A Shindo ${data.intensity.maxInt} earthquake occurred.`)
                .setColor(0x9d60cc)
                .addFields({
                    name: 'Maximum Measured Intensity',
                    value: data.intensity.maxInt
                }, {
                    name: 'Location',
                    value: 'Under Assessment'
                })
        ],
        flags: data.intensity.maxInt == ShindoValue.ONE || data.intensity.maxInt == ShindoValue.TWO ? [MessageFlags.SuppressNotifications] : []
    });
}