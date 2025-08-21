import { Snowflake } from "discord.js";
import { TOOLS } from "./types";


const GlobalMemory: string[] = [];
const UserMemory = new Map<Snowflake, string[]>();

/**
 * Returns the tool used and executes the proper code for the tool if passive. Tools such as gif must be handled by Lilac.
 */
export function GetUsedTool(message: string, author: Snowflake): TOOLS {
    // message example: "[save2user=favorite color: pink]Got it, I'll remember that!"
    const regex = /\[[^\]]*\]/i;
    const tool_full = (message.match(regex) || [''])[0];
    if (tool_full == '') return TOOLS.NONE;
    const tool_name = tool_full.split('=')[0].substring(1);
    
    if (tool_name == 'save2mem') SaveToMemory('global', tool_full.split('=')[1].split(']')[0]);
    if (tool_name == 'save2user') SaveToMemory('user', tool_full.split('=')[1].split(']')[0], author);

    return {
        'save2mem': TOOLS.GLOBAL_MEM,
        'save2user': TOOLS.USER_GLOBAL_MEM,
        'osuscore': TOOLS.GET_OSU
    }[tool_name] || TOOLS.NONE;
}


export function SaveToMemory(mode: 'global' | 'user', entry: string, user?: Snowflake) {
    if (mode == 'global') {
        if (GlobalMemory.length >= 10) GlobalMemory.pop();
        GlobalMemory.push(entry);
        return;
    }

    if (mode == 'user') {
        const memory = UserMemory.get(user!);
        if (!memory) return UserMemory.set(user!, [entry]);
        if (memory.length >= 25) memory.pop();
        memory.push(entry);
        UserMemory.set(user!, memory);
    }
}

export function GetMemory(mode: 'global' | 'user', user?: Snowflake) {
    if (mode == 'global') return GlobalMemory.join('\n');
    if (mode == 'user') return (UserMemory.get(user || '0') || []).join('\n');
    return '';
}