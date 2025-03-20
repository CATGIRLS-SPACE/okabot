import {Snowflake} from "discord.js";


const BAN_LIST = new Map<Snowflake, boolean>();

export function IsUserBanned(user_id: Snowflake): boolean {
    return BAN_LIST.has(user_id) && BAN_LIST.get(user_id)!;
}