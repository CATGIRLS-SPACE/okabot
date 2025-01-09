import { scheduleJob } from "node-schedule";
import { UpdateMarkets } from "../okash/stock";

const INTERVAL = '*/5 * * * *';

// '*/2 * * * * *'

export function ScheduleStocksTask() {
    scheduleJob(INTERVAL, () => {
        UpdateMarkets();
    });
    console.log('Stocks task has been scheduled.');
}