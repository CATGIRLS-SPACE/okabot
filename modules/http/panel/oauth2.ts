import {JSONFilePreset} from "lowdb/node";
import {join} from "path";
import {ps} from "./core";
import {BASE_DIRNAME, CONFIG, DEV} from "../../../index";
import {randomUUID} from "node:crypto";
import {Low} from "lowdb";

interface OAuth2Token {
    access_token: string,
    token_type: 'Bearer',
    expires_in: number,
    refresh_token: string,
    scope: string
}

let PanelDB: Low<{sessions:{[key: string]: {token: OAuth2Token, expiry: number}}}>;

JSONFilePreset(join(BASE_DIRNAME, 'db', 'panel.oka2'), {
    sessions: {} as {[key: string]: {token: OAuth2Token, expiry: number}}
}).then(low => PanelDB = low);

export async function SaveCodeAndGetSession(code: string) {
    const uuid = randomUUID();
    const expiry = new Date().getTime() + (1_000 * 60 * 60 * 24 * 7); // 7 day expiry time

    const exch = await fetch(`https://discord.com/api/v10/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: !DEV?CONFIG.clientId:CONFIG.devclientId,
            client_secret: CONFIG.client_secret,
            redirect_uri: 'http://localhost:2775/auth/final'
        })
    })
    if (!exch.ok) {
        console.log(`get token error: ${exch.status} ${await exch.text()}`);
        return undefined;
    }

    PanelDB.data.sessions[uuid] = {
        token: await exch.json(),
        expiry
    }
    await PanelDB.write();
    return uuid;
}

async function GetRefreshedToken(refresh_token: string): Promise<{success: boolean, token?: OAuth2Token }> {
    const exch = await fetch(`https://discord.com/api/v10/oauth2/token?grant_type=refresh_token&refresh_token=${refresh_token}`)
    if (!exch.ok) return {success:false};
    return {success: true, token: await exch.json()};
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

        const resp = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: {
                'Authorization': `Bearer ${PanelDB.data.sessions[session].token.access_token}`,
                'User-Agent': `okabot (https://oka.bot, 1.0.0)`
            }
        });
        if (!resp.ok) {
            console.log(`Discord API Error ${resp.status} ${await resp.text()}`);
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
