import {JSONFilePreset} from "lowdb/node";
import {join} from "path";
import {ps, REDIRECT_URI} from "./core";
import {BASE_DIRNAME, CONFIG, DEV} from "../../../index";
import {randomUUID} from "node:crypto";
import {Low} from "lowdb";
import {TokenUserData} from "./configuration/user";

interface OAuth2Token {
    access_token: string,
    token_type: 'Bearer',
    expires_in: number,
    refresh_token: string,
    scope: string
}

let PanelDB: Low<{sessions:{[key: string]: {token: OAuth2Token, expiry: number, user: TokenUserData}}}>;

JSONFilePreset(join(BASE_DIRNAME, 'db', 'panel.oka2'), {
    sessions: {} as {[key: string]: {token: OAuth2Token, expiry: number, user: TokenUserData}}
}).then(low => PanelDB = low);


export function GetUserBySession(session: string): TokenUserData | undefined {
    if (!PanelDB.data.sessions[session]) return undefined;
    return PanelDB.data.sessions[session].user;
}

/**
 * Takes an OAuth2 code grant from authorization, exchanges it for an access token and user data, and returns a session
 * to send back to the user.
 * @param code The returned OAuth2 code
 * @returns The session if successful, undefined otherwise.
 */
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
            redirect_uri: REDIRECT_URI
        })
    })
    if (!exch.ok) {
        console.log(`get token error: ${exch.status} ${await exch.text()}`);
        return undefined;
    }

    const token: OAuth2Token = await exch.json();
    token.expires_in = Date.now() + token.expires_in;

    const user_resp = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
            'Authorization': `Bearer ${token.access_token}`
        }
    });
    if (!user_resp.ok) {
        console.log(`get user error ${user_resp.status} ${await user_resp.text()}`)
        return undefined;
    }
    const user = await user_resp.json();

    PanelDB.data.sessions[uuid] = {
        token,
        expiry,
        user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            global_name: user.global_name
        }
    };
    await PanelDB.write();
    return uuid;
}

/**
 * Uses an OAuth2 refresh token to get a new token.
 * @param refresh_token The previous refresh token.
 * @returns an object which contains the new token if success is true, otherwise it only returns false with no token.
 */
async function GetRefreshedToken(refresh_token: string): Promise<{success: false} | {success: true, token: OAuth2Token }> {
    const exch = await fetch(`https://discord.com/api/v10/oauth2/token?grant_type=refresh_token&refresh_token=${refresh_token}`)
    if (!exch.ok) return {success:false};
    return {success: true, token: await exch.json()};
}

export function CheckSessionValidity(session: string) {
    if (!PanelDB.data.sessions[session]) return false;
    return PanelDB.data.sessions[session].expiry >= new Date().getTime();
}

export function RegisterOAuthPaths() {
    ps.get('/validate', (req, res): never => {
        if (!req.query.session) return res.status(400).json({success:false}) as never;
        const session = req.query.session as string;
        if (!PanelDB.data.sessions[session]) return res.status(401).json({success:true,valid:false}) as never;
        if (PanelDB.data.sessions[session].expiry < new Date().getTime()) return res.status(401).json({success:true,valid:false}) as never;
        return res.json({success:true,valid:true}) as never;
    });

    ps.get('/discord/managable', async (req, res) => {
        if (!req.query.session) return res.status(400).json({success:false}) as never;
        const session = req.query.session as string;
        if (!PanelDB.data.sessions[session]) return res.status(401).json({success:false}) as never;
        if (PanelDB.data.sessions[session].expiry < new Date().getTime()) return res.status(401).json({success:false}) as never;

        if (PanelDB.data.sessions[session].token.expires_in <= Date.now()) {
            const refreshed = await GetRefreshedToken(PanelDB.data.sessions[session].token.refresh_token);
            if (!refreshed.success) return <never> res.status(401).json({success:false,reason:'Could not refresh authorization.'});
            PanelDB.data.sessions[session].token = refreshed.token;
        }

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

        const managable = guilds.filter((g: {owner:boolean}) => {
            return g.owner;
        });

        res.json(managable);
    });
}
