/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import {Agent, CredentialSession} from "@atproto/api";
import {BASE_DIRNAME, client, CONFIG, DEV} from "../../index";
import {Logger} from "okayulogger";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {join} from "path";
import {Message, TextChannel} from "discord.js";
import {scheduleJob} from "node-schedule";
import {GeneratePostForBsky} from "../passive/geminidemo";
import {GetLastMessages} from "./contentRecord";

const L = new Logger('bsky');
let agent: Agent;

interface LastPostDB {
    posts: Array<{
        time_posted: number,
        content: string
    }>
}

let LAST_POSTS: LastPostDB = {posts:[]};

const POST_FREQUENCY = '0 6,10,18,12 * * *';
const ANNOUNCE_CHANNEL = DEV?'941843973641736253':'1510111491460956321';

async function authenticate() {
    try {
        const session = new CredentialSession(new URL('https://bsky.social'))
        await session.login({identifier: CONFIG.bluesky.username, password: CONFIG.bluesky.password})
        agent = new Agent(session);
        L.info('Authenticated with BlueSky OK!');
        return true;
    } catch (err) {
        L.error('Failed to authenticate with BlueSky!');
        console.error(err);
        return false;
    }
}

export async function SetupBlueskyJob() {
    L.debug('loading db...');
    if (existsSync(join(BASE_DIRNAME, 'db', 'bsky.oka'))) {
        LAST_POSTS = JSON.parse(readFileSync(join(BASE_DIRNAME, 'db', 'bsky.oka'), 'utf-8'));
    } else {
        writeFileSync(join(BASE_DIRNAME, 'db', 'bsky.oka'), '{"posts":[]}');
    }
    L.debug('loaded db!');

    L.debug('logging in...');
    const success = await authenticate();
    if (!success) return L.error('Halting BlueSky setup!')

    L.debug('preparing cronjob...');
    scheduleJob(POST_FREQUENCY, () => CreateRegularPost(true));
}

export async function CreateRegularPost(reset: boolean, message?: Message | undefined) {
    L.info('okabot is posting on bsky...');
    // ensure we're logged in
    try {
        L.debug(`assertDid value = ${agent.assertDid}`)
    } catch {
        L.debug('not logged in, reauthing...')
        const login_success = await authenticate();
        if (!login_success) return L.error('CreateTestPost: halting due to failed login!');
    }

    const messages = GetLastMessages(reset).splice(0, 10);
    // gemini, your time to shine!
    const response = await GeneratePostForBsky(`- ${messages.map(m => m.message).join('\n- ')}`, `- ${LAST_POSTS.posts.splice(0, 5).map(post => post.content).join('\n- ')}`);

    if (response == '') return L.error('Failed to post, because response.text was empty!');

    // ok post it!
    L.debug('posting...');
    const result = await agent.post({
        text: response.substring(0, 300)
    });
    L.debug('done!');
    console.log(result);

    LAST_POSTS.posts.push({
        time_posted: Date.now(),
        content: response.substring(0, 300)
    });
    writeFileSync(join(BASE_DIRNAME, 'db', 'bsky.oka'), JSON.stringify(LAST_POSTS));

    if (message) message.reply({
        content: `Posted! https://bsky.app/profile/${CONFIG.bluesky.username}/post/${result.uri.split('/').at(-1)}`
    });
    else {
        const channel = client.channels.cache.get(ANNOUNCE_CHANNEL);
        if (!channel) return;
        (channel as TextChannel).send({
            content: `https://bsky.app/profile/${CONFIG.bluesky.username}/post/${result.uri.split('/').at(-1)}`
        });
    }
}

export async function CreateTestPost(message: Message) {
    L.debug('Creating test post...');
    // ensure we're logged in
    try {
        L.debug(`assertDid value = ${agent.assertDid}`)
    } catch {
        L.debug('not logged in, reauthing...')
        const login_success = await authenticate();
        if (!login_success) return L.error('CreateTestPost: halting due to failed login!');
    }

    // ok test post
    L.debug('posting...');
    const result = await agent.post({
        text: '😺 This is a test post created from within okabot! Wow! :3'
    });
    L.debug('done!')
    console.log(result);
    message.reply({
        content: `Posted! https://bsky.app/profile/${CONFIG.bluesky.username}/post/${result.uri.split('/').at(-1)}`
    });
}