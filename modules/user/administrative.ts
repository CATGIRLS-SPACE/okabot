import {Snowflake} from "discord.js";
import {CheckUserIdOkashRestriction} from "./prefs";


const BAN_LIST = new Map<Snowflake, boolean>();

export function IsUserBanned(user_id: Snowflake): boolean {
    BAN_LIST.set(user_id, CheckUserIdOkashRestriction(user_id, 'any'));
    return BAN_LIST.has(user_id) && BAN_LIST.get(user_id)!;
}