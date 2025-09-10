import WebSocket from "ws";
import {v4 as uuidv4} from "uuid";
import { Logger } from "okayulogger";
import { appendFileSync, readFileSync } from "fs";
import { join } from "path";

const L = new Logger('Azure WebSocket');
let WS: WebSocket;

export async function ConnectAzureTTS(region: string, key: string, onChunk: CallableFunction): Promise<void> {
    return new Promise(resolve => {
        const connection_id = uuidv4();

        const ws = new WebSocket(
            `https://${region}.tts.speech.microsoft.com/cognitiveservices/websocket/v1?TrafficType=AzureDemo&X-ConnectionId=${connection_id}`,
            {
                headers: {
                    'Origin': 'https://speech.microsoft.com',
                    'Ocp-Apim-Subscription-Key': key
                }
            }
        );

        ws.on('open', () => {
            L.debug('azure tts websocket is opened');
            resolve();
        });

        ws.on('message', (msg: Buffer) => {
            appendFileSync(join(__dirname, 'out-data.txt'), '--- CHUNK START ---\n\n' + msg.toString() + '\n\n--- CHUNK END ---\n')
            if (msg.toString().includes('Path:audio')) {
                // console.log('new audio chunk!');
                // extract audio binary after the crlf
                const separator = msg.indexOf('Path:audio\r\n');
                // console.log(separator)
                const audio_data = msg.subarray(separator + 'Path:audio\r\n'.length);
                // L.debug(`got audio chunk, length = ${audio_data.length}`);
                onChunk(audio_data);
            }
        });

        WS = ws;
    });
}

let SSML: string;

export async function sendSSML(text: string) {
    if (!SSML) SSML = readFileSync(join(__dirname, '..', 'ssml.xml'), 'utf-8');
    const this_ssml = SSML.replace('{SystemReplacedTextObject}', text);

    const request_id = uuidv4();

    L.debug(`send SSML with text "${text}"`)

    WS.send(`Path:speech.config\r\nX-RequestId:${request_id}\r\nX-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/json\r\n\r\n{"context":{"synthesis":{"audio":{"outputFormat":"audio-16khz-32kbitrate-mono-mp3"}}}}`);
    WS.send(`Path:ssml\r\nX-RequestId:${request_id}\r\nX-Timestamp:${new Date().toISOString()}\r\nContent-Type:application/ssml+xml\r\n\r\n${this_ssml}`);
}