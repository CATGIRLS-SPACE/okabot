import { existsSync, readFileSync, writeFileSync } from "fs";
import { BASE_DIRNAME } from "../../index";
import { join } from "path";
import { Snowflake } from "discord.js";


export function RunAutoBanCheck(user_id: Snowflake): boolean {
    if (!existsSync(join(BASE_DIRNAME, 'db', 'bans.oka'))) writeFileSync(join(), '{"users":[]}');
    const bans: Snowflake[] = JSON.parse(readFileSync(join(BASE_DIRNAME, 'db', 'bans.oka'), 'utf-8')).users;
    return (bans.indexOf(user_id) != -1);
}