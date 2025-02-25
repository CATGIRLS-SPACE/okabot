import {ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, Snowflake} from "discord.js";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {BASE_DIRNAME} from "../../index";
import {join} from "path";
import { Logger } from "okayulogger";

const L = new Logger('casino');

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
    L.info(`add ${game} win for ${user_id}`);
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
    L.info(`add ${game} loss for ${user_id}`);

    // global all
    LoadedCasinoDB.losses++;
    LoadedCasinoDB.okash_lost += lost_amount;
    // global per-game
    LoadedCasinoDB.games[game].losses++;
    LoadedCasinoDB.games[game].okash_lost += lost_amount;

    // user per-game
    if (!LoadedCasinoDB.users[user_id]) LoadedCasinoDB.users[user_id] = {
        coinflip: DEFAULT_WINLOSS_INFO,
        blackjack: DEFAULT_WINLOSS_INFO,
        roulette: DEFAULT_WINLOSS_INFO,
        slots: DEFAULT_WINLOSS_INFO
    };

    LoadedCasinoDB.users[user_id][game].losses++;
    LoadedCasinoDB.users[user_id][game].okash_lost += lost_amount;

    SaveCasinoDB();
}

export function GetCasinoDB(): CasinoDB {
    return LoadedCasinoDB;
}


export async function HandleCommandCasino(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const embed = new EmbedBuilder();

    switch (interaction.options.getSubcommand()) {
        case 'alltime':
            embed
                .setTitle('All-time Casino Stats')
                .addFields(
                    {name:'Global Wins', value:`${LoadedCasinoDB.wins} wins totaling ${LoadedCasinoDB.okash_won}`},
                    {name:'Global Losses', value:`${LoadedCasinoDB.losses} losses totaling ${LoadedCasinoDB.okash_lost}`, inline: true},
                    {name:'Coinflip Wins', value:`${LoadedCasinoDB.games.coinflip.wins} wins totaling ${LoadedCasinoDB.games.coinflip.okash_won}`},
                    {name:'Coinflip Losses', value:`${LoadedCasinoDB.games.coinflip.losses} losses totaling ${LoadedCasinoDB.games.coinflip.okash_lost}`, inline: true},
                    {name:'Blackjack Wins', value:`${LoadedCasinoDB.games.blackjack.wins} wins totaling ${LoadedCasinoDB.games.blackjack.okash_won}`},
                    {name:'Blackjack Losses', value:`${LoadedCasinoDB.games.blackjack.losses} losses totaling ${LoadedCasinoDB.games.blackjack.okash_lost}`, inline: true},
                    {name:'Roulette Wins', value:`${LoadedCasinoDB.games.roulette.wins} wins totaling ${LoadedCasinoDB.games.roulette.okash_won}`},
                    {name:'Roulette Losses', value:`${LoadedCasinoDB.games.roulette.losses} losses totaling ${LoadedCasinoDB.games.roulette.okash_lost}`, inline: true},
                    {name:'Slots Wins', value:`${LoadedCasinoDB.games.slots.wins} wins totaling ${LoadedCasinoDB.games.slots.okash_won}`},
                    {name:'Slots Losses', value:`${LoadedCasinoDB.games.slots.losses} losses totaling ${LoadedCasinoDB.games.slots.okash_lost}`, inline: true},
                )
            break;
    }

    await interaction.editReply({
        embeds:[embed]
    });
}

export const CasinoSlashCommand = new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Get information on the casino')
    .addSubcommand(sc => sc
        .setName('alltime')
        .setDescription('All-time information on the casino')
    )