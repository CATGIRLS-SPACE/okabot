import {Client, TextChannel, VoiceState} from "discord.js";
import { Logger } from "okayulogger";
import { BASE_DIRNAME } from "../../index";
import { AddXP } from "./onMessage";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Achievements, GrantAchievement } from "../passive/achievement";

const L = new Logger('voice xp');

const VoiceData: Map<string, number> = new Map<string, number>();

export async function HandleVoiceEvent(client: Client, oldState: VoiceState, newState: VoiceState) {
    const d = new Date();
    const event_time = Math.floor(d.getTime() / 1000);

    if (oldState.channelId == null) {
        // user has joined a channel
        L.info(`${newState.member!.displayName} joined voice.`);

        VoiceData.set(newState.member!.id, event_time);
    }

    if (newState.channelId == null || newState.channel?.name.toLowerCase().includes('afk')) {
        // user has left a channel
        L.info(`${newState.member!.displayName} left voice.`);
        
        if (!VoiceData.get(oldState.member!.id)) return;

        L.info(`total time in voice: ${event_time - VoiceData.get(newState.member!.id)!} sec`);
        
        if (event_time < VoiceData.get(newState.member!.id)! + 60) return;
        
        // calculate amount of XP to award
        let xp_gained = 0;
        const minutes_elapsed = Math.floor((event_time - VoiceData.get(newState.member!.id)!) / 60);
        if (minutes_elapsed == 0) return;
        for (let i = 0; i <= minutes_elapsed; i++) xp_gained += Math.floor(Math.random() * 7) + 3;
        
        // const channel = client.channels.cache.get(CHANNEL_CHATSIES) as TextChannel;
        const channel = oldState.channel;
        if (channel == null) return;

        AddXP(newState.member!.id, <unknown>channel as TextChannel, xp_gained);

        if (xp_gained >= 300) GrantAchievement(newState.member!.user, Achievements.VOICE_XP, <unknown>channel as TextChannel);

        VoiceData.delete(newState.member!.id);
    }

    // update voice DB
    const writeable: {[key: string]: number} = {};

    VoiceData.forEach((val, key) => {
        writeable[key] = val;
    });

    writeFileSync(join(BASE_DIRNAME, 'vcdb.oka'), JSON.stringify(writeable), 'utf-8');
}

export function LoadVoiceData() {
    if (!existsSync(join(BASE_DIRNAME, 'vcdb.oka'))) return;

    const data: {[key: string]: number} = JSON.parse(readFileSync(join(BASE_DIRNAME, 'vcdb.oka'), 'utf-8'));
    
    Object.keys(data).forEach(key => {
        VoiceData.set(key, data[key]);
    });
}