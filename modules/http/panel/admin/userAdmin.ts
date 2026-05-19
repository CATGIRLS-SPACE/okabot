import { Request, Response } from "express";
import { ps } from "../core";
import { CheckSessionValidity, GetUserBySession } from "../oauth2";
import { client, CONFIG } from "../../../..";
import { CheckForProfile, GetUserProfile, UpdateUserProfile } from "../../../user/prefs";

const NeedsValidSession = (req: Request, res: Response, next: CallableFunction) => {
    if (!req.query || !req.query.session) {
        res.status(400).end();
        return;
    }
    
    if (!CheckSessionValidity(req.query.session as string)) return <never> res.status(401).end();

    next();
}

const NeedsAdminSession = (req: Request, res: Response, next: CallableFunction) => {
    const user_data = GetUserBySession(req.query.session as string);
    if (!user_data) return <never> res.status(401).end();
    if (!CONFIG.permitted_to_use_shorthands.includes(user_data.id)) return <never> res.status(403).end();

    next();
}

export function RegisterUserAdminRoutes() {
    ps.get('/admin/user/:id', NeedsValidSession, NeedsAdminSession, (req, res) => {
        if (!CheckForProfile(req.params.id, true)) return <never> res.status(404).json({success:false,code:'admin:u-1'});
        res.json(GetUserProfile(req.params.id));
    });

    ps.patch('/admin/user/:id/set-prop', NeedsValidSession, NeedsAdminSession, (req, res) => {
        if (!req.query.prop || !req.query.value) return <never> res.status(401).json({success:false,code:'core:1'});

        if (!CheckForProfile(req.params.id, true)) return <never> res.status(404).json({success:false,code:'admin:u-1'});
        const user = GetUserBySession(req.query.session as string)!;
        const profile = GetUserProfile(req.params.id);

        // woo nested properties!
        // there are a TON of @ts-expect-errors because I'm too lazy to 
        // make USER_PROFILE a proper string-indexable interface
        const keys = req.query.prop.toString().split('.');

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            // @ts-expect-error it absolutely CAN!
            if (!profile[key] || typeof profile[key] !== 'object') return <never> res.status(401).json({success:false,code:'admin:m-3'});
            // @ts-expect-error it absolutely CAN!
            profile = profile[key];
        }

        // @ts-expect-error it absolutely CAN!
        profile[keys[keys.length - 1]] = req.query.value.toString();
        UpdateUserProfile(req.params.id, profile);

        const channel = client.channels.cache.get('1318329592095703060');
        if (channel && channel.isSendable()) channel.send(`(audit) ${user.username} (${user.id})`)

        res.json({success:true,prop:req.query.prop as string,value:req.query.value as string});
    });
}