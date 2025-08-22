import { Snowflake } from "discord.js";
import { LilacOsuPlay, TOOLS } from "./types";
import { CONFIG } from "../../../..";


const GlobalMemory: string[] = [];
const UserMemory = new Map<Snowflake, string[]>();

/**
 * Returns the tool used and executes the proper code for the tool if passive. Tools such as gif must be handled by Lilac.
 */
export function GetUsedTool(message: string, author: Snowflake): TOOLS {
    // message example: "[save2user=favorite color: pink]Got it, I'll remember that!"
    const regex = /\[[^\]]*\]/i;
    const tool_full = ((message||'').match(regex) || [''])[0];
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


export async function GetLastOsuPlay(toolstring: string): Promise<LilacOsuPlay | undefined> {
    const regex = /\[[^\]]*\]/i;
    const tool_full = ((toolstring + ']').match(regex) || [''])[0];
    const username = toolstring.split('=')[1].split(']')[0]; // janky

    console.log('get result for', username);

    const data = await fetch(`https://osu.ppy.sh/api/get_user_recent?k=${CONFIG.lilac.osu_key}&u=${username}`);
    const json_data = await data.json();
    // console.log(data, json_data);
    if (json_data.length == 0) return undefined;


    const play = json_data[0];
    const beatmap = await fetch(`https://osu.ppy.sh/api/get_beatmaps?k=${CONFIG.lilac.osu_key}&b=${json_data[0].beatmap_id}`);
    const beatmap_json_list = await beatmap.json();
    if (!beatmap || !beatmap_json_list) return console.log('failed to get beatmap info') as undefined;

    const beatmap_json = beatmap_json_list[0];

    return {
        beatmap: {
            artist: beatmap_json.artist,
            name: beatmap_json.title,
            bpm: beatmap_json.bpm,
            diff: {
                name: beatmap_json.version,
                stars: parseFloat(beatmap_json.difficultyrating).toPrecision(3)
            }
        },
        countmiss: play.countmiss,
        maxcombo: play.maxcombo,
        score: play.score,
        when: play.date,
        rank: play.rank
    }
}