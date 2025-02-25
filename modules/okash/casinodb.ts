import {ChatInputCommandInteraction, SlashCommandBuilder, Snowflake} from "discord.js";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {BASE_DIRNAME} from "../../index";
import {join} from "path";


interface WinLossInfo {
    wins: number, // number of game wins
    losses: number, // number of game losses
    okash_won: number, // amount of okash won
    okash_lost: number, // amount of okash lost
}

interface GameInfo {
    coinflip: WinLossInfo,
    blackjack: WinLossInfo,
    roulette: WinLossInfo,
    slots: WinLossInfo,
}

const DEFAULT_WINLOSS_INFO = {
    wins: 0, losses: 0, okash_won: 0, okash_lost: 0,
}

export interface CasinoDB extends WinLossInfo {
    games: GameInfo,
    users: {
        [key: Snowflake]: GameInfo,
    }
}

let LoadedCasinoDB: CasinoDB;

export function LoadCasinoDB() {
    if (!existsSync(join(BASE_DIRNAME, 'db', 'casino.oka'))) {
        LoadedCasinoDB = {
            wins: 0,
            losses: 0,
            okash_won: 0,
            okash_lost: 0,
            users: {},
            games: {
                coinflip: DEFAULT_WINLOSS_INFO,
                blackjack: DEFAULT_WINLOSS_INFO,
                roulette: DEFAULT_WINLOSS_INFO,
                slots: DEFAULT_WINLOSS_INFO
            }
        };
        writeFileSync(join(BASE_DIRNAME, 'db', 'casino.oka'), JSON.stringify(LoadedCasinoDB), 'utf-8');
        return;
    }

    LoadedCasinoDB = JSON.parse(readFileSync(join(BASE_DIRNAME, 'db', 'casino.oka'), 'utf-8'));
}

function SaveCasinoDB() {
    writeFileSync(join(BASE_DIRNAME, 'db', 'casino.oka'), JSON.stringify(LoadedCasinoDB), 'utf-8');
}


export function AddCasinoWin(user_id: Snowflake, won_amount: number, game: 'coinflip' | 'blackjack' | 'roulette' | 'slots') {
    // global all
    LoadedCasinoDB.wins++;
    LoadedCasinoDB.okash_won += won_amount;
    // global per-game
    LoadedCasinoDB.games[game].wins++;
    LoadedCasinoDB.games[game].okash_won += won_amount;

    // user per-game
    if (!LoadedCasinoDB.users[user_id]) LoadedCasinoDB.users[user_id] = {
        coinflip: DEFAULT_WINLOSS_INFO,
        blackjack: DEFAULT_WINLOSS_INFO,
        roulette: DEFAULT_WINLOSS_INFO,
        slots: DEFAULT_WINLOSS_INFO
    };

    LoadedCasinoDB.users[user_id][game].wins++;
    LoadedCasinoDB.users[user_id][game].okash_won += won_amount;

    SaveCasinoDB();
}

export function AddCasinoLoss(user_id: Snowflake, lost_amount: number, game: 'coinflip' | 'blackjack' | 'roulette' | 'slots') {
    // global all
    LoadedCasinoDB.wins--;
    LoadedCasinoDB.okash_won -= lost_amount;
    // global per-game
    LoadedCasinoDB.games[game].wins--;
    LoadedCasinoDB.games[game].okash_won -= lost_amount;

    // user per-game
    if (!LoadedCasinoDB.users[user_id]) LoadedCasinoDB.users[user_id] = {
        coinflip: DEFAULT_WINLOSS_INFO,
        blackjack: DEFAULT_WINLOSS_INFO,
        roulette: DEFAULT_WINLOSS_INFO,
        slots: DEFAULT_WINLOSS_INFO
    };

    LoadedCasinoDB.users[user_id][game].wins--;
    LoadedCasinoDB.users[user_id][game].okash_won -= lost_amount;

    SaveCasinoDB();
}

export function GetCasinoDB(): CasinoDB {
    return LoadedCasinoDB;
}


export async function HandleCommandCasino(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const global_line = `Total Wins/Losses: ${LoadedCasinoDB.wins}/${LoadedCasinoDB.losses}\nTotal okash Won/Lost: ${LoadedCasinoDB.okash_won}/${LoadedCasinoDB.okash_lost}`;
    const per_game = [
        `## Coinflip\nTotal Wins/Losses: ${LoadedCasinoDB.games.coinflip.wins}/${LoadedCasinoDB.games.coinflip.losses}\nTotal okash Won/Lost: ${LoadedCasinoDB.games.coinflip.okash_won}/${LoadedCasinoDB.games.coinflip.okash_lost}`,
        `## Blackjack\nTotal Wins/Losses: ${LoadedCasinoDB.games.blackjack.wins}/${LoadedCasinoDB.games.blackjack.losses}\nTotal okash Won/Lost: ${LoadedCasinoDB.games.blackjack.okash_won}/${LoadedCasinoDB.games.blackjack.okash_lost}`,
        `## Roulette\nTotal Wins/Losses: ${LoadedCasinoDB.games.roulette.wins}/${LoadedCasinoDB.games.roulette.losses}\nTotal okash Won/Lost: ${LoadedCasinoDB.games.roulette.okash_won}/${LoadedCasinoDB.games.roulette.okash_lost}`,
        `## Slots\nTotal Wins/Losses: ${LoadedCasinoDB.games.slots.wins}/${LoadedCasinoDB.games.slots.losses}\nTotal okash Won/Lost: ${LoadedCasinoDB.games.slots.okash_won}/${LoadedCasinoDB.games.slots.okash_lost}`,
    ];

    await interaction.editReply({
        content:`# Casino (beta)\n${global_line}\n${per_game.join('\n')}`
    });
}

export const CasinoSlashCommand = new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Get information on the casino')