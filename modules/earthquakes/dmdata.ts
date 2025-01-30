import { Logger } from "okayulogger";
import { join } from "path";
import { WebSocket } from "ws";
import { BASE_DIRNAME } from "../..";
import { appendFileSync, writeFileSync } from "fs";
import { gunzip } from "zlib";
import { xml2js, xml2json } from "xml-js";
import { SendNewReportNow } from "./earthquakes";


const L = new Logger('dmdata');

export async function StartDMDataWS(api_key: string) {
    const p = join(BASE_DIRNAME, 'DMDATA_TEST.log');
    writeFileSync(p, '', 'utf-8');

    try {
        const ticket = await GetWebsocketTicket(api_key);
        L.debug(`ticket -> ${ticket}`);
        
        const socket = new WebSocket(`wss://ws.api.dmdata.jp/v2/websocket?ticket=${ticket}`);
        
        socket.on('open', () => {
            L.info('socket opened!!');
        });
        
        socket.on('message', (msg: string) => {
            L.info(`new message -> ${msg}`);
            const data = JSON.parse(msg);
            
            if (data.type == 'ping') {
                L.debug('ping!');
                socket.send(JSON.stringify({
                    type:'pong',
                    pingId:data.pingId
                }));
            } else if (data.type == 'data') {
                // a new report has come thru
                const decoded_buffer = Buffer.from(data.body, 'base64');
                gunzip(decoded_buffer, (err, decompressed_buffer) => {
                    if (err) return L.error(`error decompressing data: ${err}`);

                    const xmlString = decompressed_buffer.toString('utf-8');
                    // console.log('Decompressed XML:', xmlString);
                    
                    const json = xml2js(xmlString, {compact: true});
                    console.log(json);
                    SendNewReportNow(json);
                });
            } else {
                L.info('HOLY BEANS IT IS A MESSAGE THAT IS NOT PING OR DATA!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                appendFileSync(p, msg + '\n');
            }
        });
        
        socket.on('close', () => {
            L.info('socket closed awwww... im gonna try and restart it in a moment!');
            setTimeout(() => {
                StartDMDataWS(api_key);
            }, 10000);
        });
    } catch(err) {
        L.fatal(<string> err);
        L.debug('will try and restart momentarily!');
        setTimeout(() => {
            StartDMDataWS(api_key);
        }, 25000);
    }
}


async function GetWebsocketTicket(api_key: string) {
    const BEARER_HEADER = `Basic ${btoa(api_key)}`;

    const result = await fetch('https://api.dmdata.jp/v2/socket', {
        method: 'POST',
        headers: {
            'Authorization': BEARER_HEADER
        },
        body: JSON.stringify({
            classifications: [
                "telegram.earthquake",
                "eew.forecast",
                "eew.warning"
            ],
            test:'including'
        })
    });
    const data = await result.json();

    if (data.status != 'ok') {
        L.fatal('Failed to get DMDATA ticket');
        console.log(data);
        throw new Error('DMDATA websocket ticket failed.');
    }
    return data.ticket;
}



const EARTHQUAKE_LIST_URL = 'https://api.dmdata.jp/v2/gd/earthquake';

export interface DmDataEarthquake {
    id: number,
    type: 'normal' | 'distant',
    eventId: string,
    originTime: string,
    arrivalTime: string,
    hypocenter: {
        "code": string,
        "name": string,
        "coordinate": {
            "latitude": {
                "text": string,
                "value": string
            },
            "longitude": {
                "text": string,
                "value": string
            },
            "height": {
                "type": string,
                "unit": 'm',
                "value": string
            }
        },
        "depth": {
            "type": "深さ",
            "unit": 'km',
            "value": string
        }
    },
    "magnitude": {
        "type": "マグニチュード",
        "unit": 'Mj' | 'M',
        "value": string
    },
    "maxInt": '0' | '1' | '2' | '3' | '4' | '5-' | '5+' | '6-' | '6+' | '7'
}

export async function GetLatestEarthquake(api_key: string): Promise<DmDataEarthquake> {
    const BEARER_HEADER = `Basic ${btoa(api_key)}`;

    const result = await fetch(EARTHQUAKE_LIST_URL, {
        headers: {
            'Authorization': BEARER_HEADER
        }
    });

    const data = await result.json();

    let latest;

    for (let i = 0; i <= 19; i++) {
        if (data.items[i].hypocenter) {
            latest = data.items[i];
            break;
        }
    }

    return latest;
}