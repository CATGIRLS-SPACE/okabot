import {Logger} from "okayulogger";
import * as net from "node:net";
// @ts-ignore
// import * as sp from "seisplotjs";

const SEEDLINK_URI  = "rtserve.iris.washington.edu";
const SEEDLINK_PORT = 18000;

const SELECTED_STATIONS = [
    {net:'N4',sta:'E28B',cha:'HHZ'},
    {net:'N4',sta:'MDND',cha:'HHZ'},
];

const L = new Logger('N4 Network seedlink');

export async function ConnectToN4Network() {
    const sock = net.createConnection({host: SEEDLINK_URI, port: SEEDLINK_PORT}, () => {
        L.debug('seedlink socket connected!');

        sock.write('HELLO\r\n');
        // sock.write('\n');

        for (const {net, sta, cha} of SELECTED_STATIONS) {
            sock.write(`STATION ${sta} ${net}\r\n`);
            sock.write(`SELECT ${cha}\r\n`);
        }
        sock.write('END\r\n');
        sock.write('DATA\r\n');
    });

    // let recvBuf = Buffer.alloc(0);

    sock.on('data', (chunk: Buffer) => {
        // console.log(data.toString());
        // console.log("DATA:", data.toString("hex").substring(0, 100));
        // recvBuf = Buffer.concat([recvBuf, chunk]);
        // try {
        //     const parsed = sp.seedlink.parseSeedLinkData(recvBuf);
        //     for (const rec of parsed.records) {
        //         const payload = Buffer.from(rec.payload);
        //         const m = sp.miniseed.readRecord(payload);
        //         if (!m) {
        //             L.warn('not a valid miniseed record: ' + (rec.streamId ?? '(no ID)'));
        //             continue;
        //         }
        //
        //         L.info(`>>> station=${m.header.station} channel=${m.header.channel} start=${new Date(m.header.starttime)}`);
        //     }
        //
        //     recvBuf = parsed.remainder;
        // } catch (err) {
        //     L.debug('error encountered during parsing, continuing..?');
        // }
    });
    sock.on('close', () => {
        L.debug('socket closed, reopening in 5 seconds...');
        setTimeout(ConnectToN4Network, 5_000);
    });
    sock.on('error', (err) => {
        L.error('seedlink err: ' + err.message);
    });
}