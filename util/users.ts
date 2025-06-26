import {Snowflake} from "discord.js";
import {join} from "path";
import {debug, warn} from "okayulogger";
import {existsSync, readFileSync} from "fs";
import {DEV} from "../index";


const SUPPORTERS = new Map<Snowflake, 'ko-fi' | 'booster'>();
const TESTERS = new Map<Snowflake, 'cgc-beta' | 'public'>();
const DEVELOPERS = new Map<Snowflake, 'developer' | 'contributor'>();

interface UsersFile {
    supporters: Array<{name: string, id: Snowflake, type:'ko-fi'|'booster'}>,
    developers: Array<{name: string, id: Snowflake, type:'developer'|'contributor'}>,
    testers: Array<{name: string, id: Snowflake, type:'cgc-beta'|'public'}>,
}

export function LoadSpecialUsers(dirname: string) {
    if (!existsSync(join(dirname, 'users.json'))) return warn('users','no users.json found')
    const users_json: UsersFile = JSON.parse(readFileSync(join(dirname, 'users.json'),'utf-8'));

    users_json.supporters.forEach(supporter => {
        SUPPORTERS.set(supporter.id, supporter.type);
        if (DEV) debug('users', `${supporter.name} is a supporter (${supporter.type})`);
    });
    users_json.developers.forEach(developer => {
        DEVELOPERS.set(developer.id, developer.type);
        if (DEV) debug('users', `${developer.name} is a developer/contributor (${developer.type})`);
    });
    users_json.testers.forEach(tester => {
        TESTERS.set(tester.id, tester.type);
        if (DEV) debug('users', `${tester.name} is a tester (${tester.type})`);
    });
}

export function GetUserSupportStatus(user_id: Snowflake): 'none' | 'ko-fi' | 'booster' {
    if (!SUPPORTERS.has(user_id)) return 'none';
    return SUPPORTERS.get(user_id)!;
}

export function GetUserDevStatus(user_id: Snowflake): 'none' | 'developer' | 'contributor' {
    if (!DEVELOPERS.has(user_id)) return 'none';
    return DEVELOPERS.get(user_id)!;
}

export function GetUserTesterStatus(user_id: Snowflake): 'none' | 'cgc-beta' | 'public' {
    if (!TESTERS.has(user_id)) return 'none';
    return TESTERS.get(user_id)!;
}