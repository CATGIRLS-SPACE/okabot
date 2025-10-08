import { AudioPlayerStatus, AudioResource, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, NoSubscriberBehavior, VoiceConnectionStatus } from "@discordjs/voice";
import { VoiceChannel } from "discord.js";
import { Logger } from "okayulogger";
import { GetLLMStream } from "./streams/llm";
import { GetAzureVoiceStream } from "./streams/voice";
import { Readable } from "stream";
import { appendFileSync } from "fs";
import { join } from "path";
import { ConnectAzureTTS } from "./streams/ws/azure";
import { CONFIG } from "../..";

const L = new Logger('LiveAI');

export async function SetupVC(channel: VoiceChannel, text: string) {
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
    });

    connection.on(VoiceConnectionStatus.Ready, async () => {
        L.debug(`voice connection to [${channel.name}] is ready`);

        await ConnectAzureTTS(CONFIG.gemini.azure_region, CONFIG.gemini.azure_api_key, (chunk: Buffer) => {
            L.debug('new tts chunk');
            appendFileSync(join(__dirname, 'voiceout-ws.mp3'), chunk);
        });

        const audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });
        // const resource = createAudioResource(join(__dirname, 'test.mp3'));
        connection.subscribe(audioPlayer);
    
        // audioPlayer.play(resource);

        const stream = await GetLLMStream(text);
        const voice = GetAzureVoiceStream(stream);

        const chunk_queue: Array<AudioResource> = [];
        let playing = false;

        for await (const chunk of voice) {
            L.debug(`new voice chunk`);
            appendFileSync(join(__dirname, 'voiceout.mp3'), chunk);
            const resource = createAudioResource(Readable.from(chunk));
            if (playing) {
                chunk_queue.push(resource);
            } else {
                audioPlayer.play(resource);
                playing = true;
            }
        }

        audioPlayer.on(AudioPlayerStatus.Idle, () => {
            // connection.disconnect();
            if (chunk_queue.length != 0) {
                L.debug(`chunks remaining: ${chunk_queue.length}`);
                const chunk = chunk_queue.shift();
                if (!chunk) return;
                audioPlayer.play(chunk);
            } else playing = false;
        });
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
    	try {
    		await Promise.race([
    			entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
    			entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
    		]);
    		// Seems to be reconnecting to a new channel - ignore disconnect
    	} catch {
    		// Seems to be a real disconnect which SHOULDN'T be recovered from
    		connection.destroy();
    	}
    });
}