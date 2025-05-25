import {Snowflake} from "discord.js";


const LOCKS = new Map<Snowflake, boolean>();

export function CheckGambleLock(user_id: Snowflake) {
    return (LOCKS.has(user_id) && LOCKS.get(user_id));
}

export function SetGambleLock(user_id: Snowflake, locked: boolean) {
    LOCKS.set(user_id, locked);
}