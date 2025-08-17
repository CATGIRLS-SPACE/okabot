import { exec } from "child_process";
import { Message } from "discord.js";
import { Logger } from "okayulogger";
import {BASE_DIRNAME, COMMIT, DEV} from "../index";
import { stat, writeFileSync } from "fs";
import { join } from "path";

const PL = new Logger('child process');

export async function SelfUpdate(message: Message, commit?: string) {
    const L = new Logger('self updater');
    L.info('beginning update...');

    if (DEV) return await message.reply({
        content: ':bangbang: You called `SelfUpdate()`, but it will not run due to devmode being enabled.'
    });

    const changes = (commit?'`git reset --hard ' + commit + '`':'Pulling latest changes from GitHub...')
    const changes_done = (commit?'`git reset --hard ' + commit + '`':'Pulled latest changes from GitHub!')

    const status = await message.reply({
        content: `
        :arrow_right: ${changes}\n
:hourglass: Install npm packages\n
:hourglass: Re-compile\n
:hourglass: Deploy commands\n
:hourglass: Restart
        `
    });

    writeFileSync(join(BASE_DIRNAME, 'update_id'), `${status.channel.id},${status.id}`);

    await pull_changes(commit);
    L.info('pull ok');

    await status.edit({
        content: `
        :ballot_box_with_check: ${changes_done}\n
:arrow_right: Installing npm packages...\n
:hourglass: Re-compile\n
:hourglass: Deploy commands\n
:hourglass: Restart
        `
    });

    await npm_install();
    L.info('npm ok');

    await status.edit({
        content: `
        :ballot_box_with_check: ${changes_done}\n
:ballot_box_with_check: Installed npm packages\n
:arrow_right: Re-compiling...\n
:hourglass: Deploy commands\n
:hourglass: Restart
        `
    });

    // await recompile();
    // L.info('tsc ok');

    await status.edit({
        content: `
        :ballot_box_with_check: ${changes_done}\n
:ballot_box_with_check: Installed npm packages\n
:ballot_box_with_check: Re-compiled\n
:arrow_right: Deploying commands...\n
:hourglass: Restart
        `
    });

    await deploycmds();
    L.info('deploy ok');

    await status.edit({
        content: `
        :ballot_box_with_check: ${changes_done}\n
:ballot_box_with_check: Installed npm packages\n
:ballot_box_with_check: Re-compiled\n
:ballot_box_with_check: Deployed commands\n
:arrow_right: Restarting...
        `
    });

    L.info('terminating self for update. goodbye!');
    process.exit();
}

export async function OnlyPull(message: Message) {
    const reply = await message.reply('Pulling...');
    await pull_changes();
    reply.edit(`Pulling... done! Directory contents are now up-to-date with \`${require('child_process').execSync('git rev-parse HEAD').toString().trim().slice(0, 7)}\`. okabot is still running \`${COMMIT}\`.`);
}

async function pull_changes(commit?: string): Promise<void> {
    return new Promise((resolve) => {
        exec('git reset --hard', () => {
            exec(commit?`git reset --hard ${commit}`:'git pull', () => {
                resolve();
            }).on('message', (m: string) => {
                PL.warn(m);
            });
        }).on('message', (m: string) => {
            PL.warn(m);
        });
    });
}

async function npm_install(): Promise<void> {
    return new Promise((resolve) => {
        exec('npm i', () => {
            resolve();
        }).on('message', (m: string) => {
            PL.warn(m);
        });
    });
}

async function recompile(): Promise<void> {
    return new Promise((resolve) => {
        exec('tsc', () => {
            resolve();
        }).on('message', (m: string) => {
            PL.warn(m);
        });
    });
}

async function deploycmds(): Promise<void> {
    return new Promise((resolve) => {
        exec('bun run . --no-launch --deploy', () => {
            resolve();
        }).on('message', (m: string) => {
            PL.warn(m);
        });
    });
}

