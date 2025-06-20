import { Routes, SlashCommandBuilder } from "discord.js";
import { OkashSlashCommand } from "../interactions/okash";
import { DailySlashCommand } from "../interactions/daily";
import { PaySlashCommand } from "../interactions/pay";
import { MoveMoneySlashCommand } from "../interactions/transfer";
import { LeaderboardSlashCommand } from "../interactions/leaderboard";
import { CoinflipSlashCommand } from "../okash/games/coinflip";
import { RecentEarthquakeSlashCommand } from "../earthquakes/earthquakes";
import { UseSlashCommand } from "../interactions/use";
import { BuySlashCommand } from "../interactions/buy";
import { SellSlashCommand } from "../interactions/sell";
import { ShopSlashCommand } from "../interactions/shop";
import { PocketsSlashCommand } from "../interactions/pockets";
import { CustomizeSlashCommand } from "../interactions/customize";
import { LevelSlashCommand } from "../levels/levels";
import { BlackjackSlashCommand } from "../okash/games/blackjack";
import { StockSlashCommand } from "../interactions/stock";
import { HelpSlashCommand } from "../interactions/help";
import { REST } from "@discordjs/rest";
import { Logger } from "okayulogger";
import { RenderSlashCommand } from "../extra/datarenderer";
import { RouletteSlashCommand } from "../okash/games/roulette";
import { RobSlashCommand } from "../okash/games/rob";
import { AchievementsSlashCommand } from "../passive/achievement";
import {SlotsSlashCommand} from "../okash/games/slots";
import {CasinoSlashCommand} from "../okash/casinodb";
import {ToggleSlashCommand} from "../interactions/toggle";
import {TradeSlashCommand} from "../interactions/trade";
import {FortuneBallSlashCommand} from "../interactions/8ball";
import {CatgirlSlashCommand} from "../interactions/catgirl";
import { StorySlashCommand } from "../interactions/story";
import {CraftSlashCommand} from "../interactions/craft";


// these two don't have dedicated interactions files, and are handled by index.ts
// i don't want to clutter index any more so i will put them here
const InfoSlashCommand = 
    new SlashCommandBuilder()
        .setName('info').setNameLocalization('ja', 'インフォ')
        .setDescription('Get some info on the bot!').setDescriptionLocalization('ja', 'okabotのインフォを見る');

const DebugSlashCommand = 
    new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Replies with some debug info');


export async function DeployCommands(token: string, client_id: string): Promise<void> {
    const COMMANDS_TO_REGISTER = [
        InfoSlashCommand,
        DebugSlashCommand,
        OkashSlashCommand,
        DailySlashCommand,
        PaySlashCommand,
        MoveMoneySlashCommand,
        LeaderboardSlashCommand,
        CoinflipSlashCommand,
        RecentEarthquakeSlashCommand,
        UseSlashCommand,
        BuySlashCommand,
        SellSlashCommand,
        ShopSlashCommand,
        PocketsSlashCommand,
        CustomizeSlashCommand,
        LevelSlashCommand,
        BlackjackSlashCommand,
        HelpSlashCommand,
        RenderSlashCommand,
        RouletteSlashCommand,
        RobSlashCommand,
        AchievementsSlashCommand,
        SlotsSlashCommand,
        ToggleSlashCommand,
        TradeSlashCommand,
        // CasinoSlashCommand, // <-- not ready yet!
        FortuneBallSlashCommand,
        CatgirlSlashCommand,
        StorySlashCommand,
        CraftSlashCommand,
    ].map(command => command.toJSON());

    const L = new Logger('deployment');
    L.info('Deploying commands...');

    const rest = new REST({version: '10'})
        .setToken(token);

    return new Promise((resolve, reject) => {
     rest.put(Routes.applicationCommands(client_id), {body: COMMANDS_TO_REGISTER})
        .then((a) => {
            // console.log(a);
            L.info('Commands deployed successfully.');
            resolve();
        })
        .catch((err) => {
            L.error('Something went wrong while deploying commands.');
            console.error(err);
            reject();
        });
    });
}
