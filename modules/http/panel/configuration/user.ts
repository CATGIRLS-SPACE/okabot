import {ps} from "../core";
import {CheckSessionValidity, GetUserBySession} from "../oauth2";
import {Snowflake} from "discord.js";
import {GetUserProfile, UpdateUserProfile} from "../../../user/prefs";
import { CONFIG } from "../../../..";
import { GetUserDevStatus, GetUserSupportStatus, GetUserTesterStatus } from "../../../../util/users";

export interface TokenUserData {
    id: Snowflake,
    username: string,
    avatar: string,
    global_name: string,
    can_manage: Array<Snowflake>
}

export function RegisterUserConfigurationPaths() {
    ps.get('/session/me', (req, res) => {
        if (!req.query || !req.query.session) {
            res.status(400).end();
            return;
        }

        if (!CheckSessionValidity(req.query.session as string)) return <never> res.status(401).end();

        const user_data = GetUserBySession(req.query.session as string)!;
        const profile = GetUserProfile(user_data.id);
        
        res.json({
            success: true,
            user: {
                username: user_data.username,
                displayName: user_data.global_name,
                id: user_data.id,
                avatar: user_data.avatar,
                is_admin: CONFIG.permitted_to_use_shorthands.includes(user_data.id),
                profile: {
                    support_type: GetUserSupportStatus(user_data.id),
                    dev_type: GetUserDevStatus(user_data.id),
                    tester_type: GetUserTesterStatus(user_data.id),
                    bot_data: {
                        okash_total: profile.okash.bank + profile.okash.wallet,
                        daily: profile.daily.streak,
                        is_banned: profile.restriction.active,
                        ban_reason: profile.restriction.active ? profile.restriction.reason : undefined,
                        ban_until: profile.restriction.active ? profile.restriction.until : undefined
                    }
                }
            }
        });
    });

    // pronouns

    ps.get('/cfg/user/pronouns', (req, res) => {
        if (!req.query || !req.query.session) {
            res.status(400).end();
            return;
        }

        if (!CheckSessionValidity(req.query.session as string)) return <never> res.status(401).end();

        const user_data = GetUserBySession(req.query.session as string)!;
        const profile = GetUserProfile(user_data.id);

        return <never> res.json({
            success: true,
            selection: profile.customization.global.pronouns.subjective
        });
    });

    ps.patch('/cfg/user/pronouns', (req, res) => {
        if (!req.query || !req.query.selection || !req.query.session) {
            res.status(400).json({success: false, reason:'Missing parameters', code:'core:1'});
            return;
        }

        if (!CheckSessionValidity(req.query.session as string)) return <never> res.status(401).json({success:false,code:'auth:1'});

        const pronoun_choice = req.query.selection as string;
        if (!['they','she','he'].includes(pronoun_choice)) return <never> res.status(400).json({success:false,code:'core:2'});

        const user_data = GetUserBySession(req.query.session as string)!;
        const profile = GetUserProfile(user_data.id);

        switch (pronoun_choice) {
            case 'they':
                profile.customization.global.pronouns.subjective = 'they';  // They are talking to me.
                profile.customization.global.pronouns.possessive = 'their'; // Their voice is soothing.
                profile.customization.global.pronouns.objective = 'them';   // I think I should tell them.
                break;

            case 'she':
                profile.customization.global.pronouns.subjective = 'she';   // She is talking to me.
                profile.customization.global.pronouns.possessive = 'her';   // Her voice is soothing.
                profile.customization.global.pronouns.objective = 'her';    // I think I should tell her.
                break;

            case 'he':
                profile.customization.global.pronouns.subjective = 'he';
                profile.customization.global.pronouns.possessive = 'his';
                profile.customization.global.pronouns.objective = 'him';
                break;
        }

        UpdateUserProfile(user_data.id, profile);
        res.status(200).json({success:true});
    });
}