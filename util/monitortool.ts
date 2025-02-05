/*
    This is a tool for okabot to log everything it does to a user
    This will be useful for bugtesting in the event of, eg, money mismatch
    as well as finding an issue's source
*/

export enum EventType {
    MISC_EVENT      ='misc',        // anything that cannot be categorized (yet)
    BALANCE_CHANGE  ='balchg',      // the user's wallet was changed in any way
    BANK_CHANGE     ='bnkchg',      // the user's bank was changed in any way
    BUY             ='buy',         // the user bought something from the shop
    SELL            ='sell',        // the user sold something
    GAMBLE          ='gamble',      // the user used a gambling-related command
    MOVE_MONEY      ='move',        // the user moved money between their wallet and bank
    GAIN_XP         ='xpgain',      // the user gained XP
    GAIN_LEVEL      ='levelgain',   // the user reached the XP threshold to level up
    USE_ITEM        ='itemuse',     // the user used any item
    INTERNAL_ERROR  ='error',       // okabot encountered some form of error internally
    GET_DAILY       ='dailyget',    // the user claimed their daily
    COINFLIP_START  ='startcf',
    COINFLIP_END    ='endcf',
    BLACKJACK_START ='startbj',
    BLACKJACK_END   ='endbj',
    ROULETTE_START  ='startrl',
    ROULETTE_END    ='endrl',
    DROP_GIVEN      ='dropget',
    POCKETS_MODIFIED='pocketmod',
}

interface MonitoringToolEvent {
    event_id: string,
    type: EventType,
    caller_function: string,
    data: any,
    readable_message: string,
}


export const MONITORING_EVENTS: Array<MonitoringToolEvent> = [];


export function RecordMonitorEvent(type: EventType, data: any, readable_message: string = 'no readable message supplied') {
    const event_data: MonitoringToolEvent = {
        event_id: `${type}-${Math.random().toString(16).slice(2)}`,
        type,
        caller_function: new Error().stack!.split('\n')[2].trim(),
        data,
        readable_message
    };

    // console.log(event_data, new Error().stack!.split('\n')[2]);

    MONITORING_EVENTS.push(event_data);
}

export function GetMostRecentEvents(): Array<MonitoringToolEvent> {
    return MONITORING_EVENTS.slice(0, 25);
}