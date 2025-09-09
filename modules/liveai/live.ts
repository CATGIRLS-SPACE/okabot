import { AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, NoSubscriberBehavior, VoiceConnectionStatus } from "@discordjs/voice";
import { VoiceChannel } from "discord.js";
import { Logger } from "okayulogger";
import { join } from "path";

const L = new Logger('LiveAI');

export async function SetupVC(channel: VoiceChannel) {
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator
    });

    connection.on(VoiceConnectionStatus.Ready, () => {
        L.debug(`voice connection to [${channel.name}] is ready`);

        const audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });
        const resource = createAudioResource(join(__dirname, 'test.mp3'));
        connection.subscribe(audioPlayer);
    
        audioPlayer.play(resource);

        audioPlayer.on(AudioPlayerStatus.Idle, () => {
            connection.disconnect();
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