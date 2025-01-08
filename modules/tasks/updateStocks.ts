import { scheduleJob } from "node-schedule";
import { UpdateMarkets } from "../okash/stock";


export function ScheduleStocksTask() {
    scheduleJob('*/5 * * * *', () => {
        UpdateMarkets();
    });
    console.log('Stocks task has been scheduled.');
}