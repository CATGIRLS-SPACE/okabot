import { join } from "path";
import { MESYFile } from "./mesy";
import { existsSync } from "fs";
import { Logger } from "okayulogger";
import { subtle } from "crypto";
import { BASE_DIRNAME, CONFIG } from "../..";
import { MessageFlags, Snowflake, TextChannel, User } from "discord.js";
import { GetUserProfile, UpdateUserProfile } from "../user/prefs";

const L = new Logger('story');

const ENCODER = new TextEncoder();
const STORY_KEY = CONFIG.story_key;
const STORY_KEY_BYTES = ENCODER.encode(STORY_KEY);
let AES_KEY!: CryptoKey;

subtle.importKey('raw', STORY_KEY_BYTES, {name: 'AES-CBC'}, false, ["decrypt"]).then(key => {AES_KEY = key;});

async function DecryptAESString(data: string): Promise<ArrayBuffer> {
    return await subtle.decrypt({name: 'AES-CBC', iv:STORY_KEY_BYTES}, AES_KEY!, Uint8Array.from(data.match(/.{1,2}/g)!.map(b => parseInt(b, 16))));
}

interface StoryData {
    success: boolean,
    page_count: number,
    data: string
}

export async function ReadChapterData(chapter: number, page: number): Promise<StoryData> {
    const mesy_path = join(BASE_DIRNAME, 'assets', 'stories', `ch${chapter}.mesy`);
    if (!existsSync(mesy_path)) throw new Error(`could not load story data from "${mesy_path}" (exist)`);
    let data;
    try {
        data = new MESYFile(mesy_path);
    } catch(err) {
        L.error(`Failed to load MESY file: ${err}`);
        return {success:false, page_count: -1, data:'Story failed to load'};
    }

    // test AES
    const aes_test_data = data.getValueOfKey('AES_TEST');
    const expected_result = data.getValueOfKey('EXPECT_AES_TEST');
    try {
        const test_result = new TextDecoder().decode((await DecryptAESString(aes_test_data)));
        if (test_result != expected_result) {
            L.error(`AES Test failed! Expected result "${expected_result}", but got result "${test_result}"!`);
            return {success:false, page_count: -1, data:'Story data decryption failed'};
        }
    } catch (err) {
        return {success:false, page_count: -1, data:`Story data decryption failed (${err})`};
    }
    L.debug(`AES Test succeeded for chapter ${chapter}!`);

    try {
        data.getValueOfKey(`pg${page}`);
    } catch (err) {
        return {success:false, page_count: -1, data:`Not a valid page of chaper ${chapter}`};
    }
    const page_data = (page>=0)?data.getValueOfKey(`pg${page}`):data.getValueOfKey('title');
    const title = new TextDecoder().decode(await DecryptAESString(data.getValueOfKey('title')));
    const pages = data.getValueOfKey('pg_count');
    const story_content = new TextDecoder().decode(await DecryptAESString(page_data));

    return {success: true, page_count:parseInt(pages), data:`📚 **${title}** (Ch${chapter+1} page ${page+1}/${pages})\n \n${story_content}\n-# Keep in mind, many parts of the story are up for interpretation, or may not become clear until later chapters.\n-# Feel free to discuss these parts, however do not spoil the story for others.`};
}


export function GrantStoryAccess(user: User, story_number: number, channel: TextChannel) {
    const user_id = user.id;
    const profile = GetUserProfile(user_id);
    if (story_number != 1 && profile.story_unlocks.includes(story_number)) return console.debug(`can't unlock story ${story_number} because previous story isn't unlocked`);
    if (profile.story_unlocks.includes(story_number)) return;
    profile.story_unlocks.push(story_number);
    UpdateUserProfile(user_id, profile);
    L.info(`gave user ${user_id} access to ${story_number}`);
    channel.send({
        content:`*:books: **${user.displayName}**, you now have access to story chapter ${story_number}!*`,
        flags: [MessageFlags.SuppressNotifications]
    });
}