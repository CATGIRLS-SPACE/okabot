/* eslint-disable @typescript-eslint/no-require-imports */
/*

okabot anti-cheat bridge
loads hooks for private ac modules

*/

import { ChatInputCommandInteraction, Snowflake } from "discord.js";
import { existsSync } from "fs";
import { Logger } from "okayulogger";
import { join } from "path";
import { client, LISTENING } from "../../index";
import { RestrictUser } from "../user/prefs";

const L = new Logger('ac');
const LOADED_HOOKS: Array<string> = [];
const HOOKS_AC_COMMAND: Array<CallableFunction> = [];

/**
 * load a hook module from modules/ac/hooks
 * @param name file name to load
 */
export async function ACLoadHookModule(name: string, expected_version: string): Promise<boolean> {
    const hookPath = join(__dirname, 'hooks', name);
    L.info(`loading ${hookPath} ...`);

    if (!existsSync(hookPath)) {
        L.error(`could not load ${name} (nonexisting file)`);
        return false;
    }

    try {
        const hookModule = require(hookPath);
        console.log(hookModule);

        if (typeof hookModule.okabot_ac_hook_test !== 'function') {
            throw new Error('okabot_ac_hook_test is not a function');
        }

        const hook_version = hookModule.okabot_ac_hook_test();
        if (hook_version !== expected_version) 
            throw new Error('hook version does not match expected version');
        
        if (typeof hookModule.okabot_ac_hook_onCommand !== 'function') {
            throw new Error('okabot_ac_hook_onCommand is not a function');
        }
        HOOKS_AC_COMMAND.push(hookModule.okabot_ac_hook_onCommand);


        L.info(`anticheat module ${name} load success!`);
        LOADED_HOOKS.push(name);

        if (typeof hookModule.okabot_ac_ptr_ban == 'function') hookModule.okabot_ac_ptr_ban(ACPtrBanUser);

        return true;
    } catch (err) {
        console.error(err);
        L.error(`could not load ${name} (hook test failure)`);
        return false;
    }
}

async function ACPtrBanUser(user_id: Snowflake, reason: string, until: Date) {
    L.info(`Restriction issued by hook for user ${user_id}`);
    RestrictUser(client, user_id, until.toDateString(), reason);
}

/**
 * Fires event for each OnCommand hook. If any hook returns false, this function will return false;
 * @param interaction The command interaction data
 * @returns true if pass, false if failure
 */
export async function AC_OnCommand(interaction: ChatInputCommandInteraction): Promise<boolean> {
    let result = true;
    for (const hook of HOOKS_AC_COMMAND) {
        result = result && await hook(interaction, {listening:LISTENING});
    }
    return result;
}