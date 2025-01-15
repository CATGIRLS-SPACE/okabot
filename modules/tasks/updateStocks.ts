import { scheduleJob } from "node-schedule";
import { UpdateMarkets } from "../okash/stock";
import { Client } from "discord.js";

const INTERVAL = '*/5 * * * *';

// '*/2 * * * * *'

export function ScheduleStocksTask(c: Client) {
    scheduleJob(INTERVAL, () => {
        UpdateMarkets(c);
    });
    console.log('Stocks task has been scheduled.');
}