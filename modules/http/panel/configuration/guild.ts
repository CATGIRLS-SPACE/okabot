import {ps} from "../core";
import {client} from "../../../../index";
import {GetPreferencesFor, ServerFeature, SetPreference} from "../../../system/serverPrefs";
import {CheckSessionValidity, GetUserBySession} from "../oauth2";


const SERVER_PREF_KEYS: {[key: string]: string} = {
    'basic.okash':ServerFeature.okash,
    'basic.daily':ServerFeature.daily,
    'basic.gambling':ServerFeature.gambling,
    'leveling.msgxp':ServerFeature.msg_xp,
    'leveling.voicexp':ServerFeature.voice_xp,
    'passive.drops':ServerFeature.drops,
    'passive.eastereggs':ServerFeature.easter_eggs,
    'games.coinflip':ServerFeature.coinflip,
    'games.blackjack':ServerFeature.blackjack,
    'games.roulette':ServerFeature.roulette,
    'games.slots':ServerFeature.slots,
    'games.8ball':ServerFeature.magicball,
    'games.blue':ServerFeature.pixelguess,
    'misc.catgirl':ServerFeature.catgirl,
    'misc.danbooru':ServerFeature.danbooru,
    'misc.danbooru_nsfw':ServerFeature.danbooru_nsfw,
    'moderation.commands':ServerFeature.mod_shorthands
};

export function RegisterServerConfigurationPaths() {
    ps.get('/cfg/guilds/:guild/all', (req, res) => {
        if (!req.query || !req.query.session) return <never> res.status(400).json({success:false,code:'core:1'});
        if (!req.params.guild) return <never> res.status(400).json({success:false,code:'core:3'});

        if (!CheckSessionValidity(req.query.session as string)) return <never> res.status(401).json({success:false,code:'auth:1'});
        if (!client.guilds.cache.has(req.params.guild)) return <never> res.status(417).json({success:false,reason:'okabot is not present in this server',code:'cfgs:3'});

        const prefs = GetPreferencesFor(req.params.guild);
        if (!prefs) return <never> res.status(404).json({success:false,reason:'This server\'s preferences are invalid',code:'cfgs:0'});
        res.json({
            success: true,
            configuration: prefs
        });
    });

    ps.patch('/cfg/guilds/:guild/:pref/:enabled', (req, res) => {
        if (!req.query || !req.query.session) return <never> res.status(400).json({success:false,code:'core:1'});
        if (!req.params.guild) return <never> res.status(400).json({success:false,code:'core:3'});

        if (!CheckSessionValidity(req.query.session as string)) return <never> res.status(401).json({success:false,code:'auth:1'});
        if (!client.guilds.cache.has(req.params.guild)) return <never> res.status(417).json({success:false,reason:'okabot is not present in this server',code:'cfgs:3'});
        if (!(GetUserBySession(req.query.session as string)!.can_manage || []).includes(req.params.guild)) return <never> res.status(403).json({success:false,reason:'The current user cannot manage this server',code:'auth:2'});
        if (!Object.keys(SERVER_PREF_KEYS).includes(req.params.pref)) return <never> res.status(400).json({success:false,reason:'Invalid preference to set',code:'core:4'})

        SetPreference(req.params.guild, SERVER_PREF_KEYS[req.params.pref] as ServerFeature, req.params.enabled=='true');
        res.json({success:true,prop:req.params.pref,enabled:req.params.enabled=='true'});
    });
}