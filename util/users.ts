import {Snowflake} from "discord.js";
import {FLAG, GetUserProfile} from "../modules/user/prefs";

export function GetUserSupportStatus(user_id: Snowflake): 'none' | 'ko-fi' | 'booster' | 'granted' {
    const profile = GetUserProfile(user_id);
    if (profile.flags.includes(FLAG.PREMIUM_TIER_BOOSTER)) return 'booster';
    if (profile.flags.includes(FLAG.PREMIUM_TIER_GRANTED)) return 'granted';
    if (profile.flags.includes(FLAG.PREMIUM_TIER_DONATOR)) return 'ko-fi';
    return 'none';
}

export function GetUserDevStatus(user_id: Snowflake): 'none' | 'developer' | 'contributor' {
    const profile = GetUserProfile(user_id);
    if (profile.flags.includes(FLAG.IS_ACTIVE_DEVELOPER)) return 'developer';
    if (profile.flags.includes(FLAG.IS_CONTRIBUTOR)) return 'contributor';
    return 'none';
}

export function GetUserTesterStatus(user_id: Snowflake): 'none' | 'cgc-beta' | 'public' {
    const profile = GetUserProfile(user_id);
    if (profile.flags.includes(FLAG.IS_BETA_TESTER)) return 'public';
    if (profile.flags.includes(FLAG.IS_BETA_TESTER_CGC)) return 'cgc-beta';
    return 'none';
}