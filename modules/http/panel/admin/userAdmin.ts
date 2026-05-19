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


function setNestedProperty(obj: any, path: string, value: string | boolean | number): boolean {
    const keys = path.split('.');
    const lastKey = keys.pop(); // The final property to update
    
    // Traverse to the second-to-last level
    const lastObj = keys.reduce((current, key) => {
        if (!current[key]) return false; // property doesnt exist
        return current[key];
    }, obj);

    if (lastKey) {
        lastObj[lastKey] = value;
    }

    return true;
}


export function RegisterUserAdminRoutes() {
    ps.get('/admin/user/:id', NeedsValidSession, NeedsAdminSession, async (req, res) => {
        if (!CheckForProfile(req.params.id, true)) return <never> res.status(404).json({success:false,code:'admin:u-1'});
        const user = await client.users.fetch(req.params.id);
        res.json({
            username: user.username,
            profile: GetUserProfile(req.params.id)
        });
    });

    ps.patch('/admin/user/:id/set-prop', NeedsValidSession, NeedsAdminSession, (req, res) => {
        if (!req.query.prop || !req.query.value || !req.query.type) return <never> res.status(400).json({success:false,code:'core:1'});
        let value: string | number | boolean = req.query.value as string;
        switch (req.query.type as string) {
            case 'number':
                value = value.includes('.') ? parseFloat(value) : parseInt(value);
                break;

            case 'boolean':
                value = value.toLowerCase() == 'true';
                break;

            case 'string': default:
                break;
        }

        if (!CheckForProfile(req.params.id, true)) return <never> res.status(404).json({success:false,code:'admin:u-1'});
        const user = GetUserBySession(req.query.session as string)!;
        const profile = GetUserProfile(req.params.id);
        
        const return_value = setNestedProperty(profile, req.query.prop as string, value);
        if (!return_value) return <never> res.status(400).json({success:false,code:'core:2'});
        
        UpdateUserProfile(req.params.id, profile);

        const modded_user = client.users.cache.get(req.params.id);
        const channel = client.channels.cache.get('1318329592095703060');
        if (channel && channel.isSendable()) channel.send(`(audit) (panel) ${user.username} (${user.id}) MODIFIED ${modded_user?.username} (${modded_user?.id}) PROP \`${req.query.prop}\` NOW IS \`${value}\``);

        console.log(`(audit) (panel) ${user.username} (${user.id}) MODIFIED ${modded_user?.username} (${modded_user?.id}) PROP "${req.query.prop}" NOW IS "${value}"`)

        res.json({success:true,prop:req.query.prop as string,value:req.query.value as string});
    });
}