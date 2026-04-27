import {JSONFilePreset} from "lowdb/node";
import {join} from "path";
import {ps} from "./core";
import {BASE_DIRNAME} from "../../../index";
import {randomUUID} from "node:crypto";
import {Low} from "lowdb";


let PanelDB: Low<{sessions:{[key: string]: {code: string, expiry: number}}}>;

JSONFilePreset(join(BASE_DIRNAME, 'db', 'panel.oka2'), {
    sessions: {} as {[key: string]: {code: string, expiry: number}}
}).then(low => PanelDB = low);

export async function SaveCodeAndGetSession(code: string) {
    const uuid = randomUUID();
    const expiry = new Date().getTime() + (1_000 * 60 * 60 * 12); // 12 hour expiry time
    PanelDB.data.sessions[uuid] = {
        code,
        expiry
    }
    await PanelDB.write();
    return uuid;
}

export function RegisterOAuthPaths() {
    ps.get('/validate', (req, res): never => {
        if (!req.query.session) return res.status(400).json({success:false}) as never;
        const session = req.query.session as string;
        if (!PanelDB.data.sessions[session]) return res.status(401).json({success:true,valid:false}) as never;
        if (PanelDB.data.sessions[session].expiry < new Date().getTime()) return res.status(401).json({success:true,valid:false}) as never;
        return res.status(401).json({success:true,valid:true}) as never;
    });

    ps.get('/discord/managable', async (req, res) => {
        if (!req.query.session) return res.status(400).json({success:false}) as never;
        const session = req.query.session as string;
        if (!PanelDB.data.sessions[session]) return res.status(401).json({success:false}) as never;
        if (PanelDB.data.sessions[session].expiry < new Date().getTime()) return res.status(401).json({success:false}) as never;

        console.log(PanelDB.data.sessions[session].code);

        const resp = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: {
                'Authorization': `Bearer ${PanelDB.data.sessions[session].code}`,
                'User-Agent': `okabot (https://oka.bot, 1.0.0)`
            }
        });
        if (!resp.ok) {
            console.log(resp);
            return res.status(500).json({success:false,reason:'Internal server error'}) as never;
        }
        const guilds = await resp.json();
        const MANAGE_GUILD = 0x20n;

        const managable = guilds.filter((g: {permissions:string}) => {
            const permissions = BigInt(g.permissions);
            return (permissions & MANAGE_GUILD) === MANAGE_GUILD;
        });

        res.json(managable);
    });
}
