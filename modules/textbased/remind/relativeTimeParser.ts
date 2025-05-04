
const MINUTE = 60;
const HOUR = MINUTE*60;
const DAY = HOUR*24;
const WEEK = DAY*7;
const MONTH = DAY*30;
const YEAR = MONTH*12;

/**
 * Parse something like "10m" or "5h" or "7d" into seconds.
 * Supports "s", "m", "h", "d", "w", "mo", and "y".
 * Assumes that one month is 30 days
 * @param time
 * @returns the provided relative time in seconds, or NaN if parsing failed
 */
export function ParseRelativeTime(time: string): number {
    try {
        if (time.endsWith('s')) return parseInt(time.split('s')[0]);
        if (time.endsWith('m')) return parseInt(time.split('m')[0]) * MINUTE;
        if (time.endsWith('h')) return parseInt(time.split('h')[0]) * HOUR;
        if (time.endsWith('d')) return parseInt(time.split('d')[0]) * DAY;
        if (time.endsWith('w')) return parseInt(time.split('w')[0]) * WEEK;
        if (time.endsWith('mo')) return parseInt(time.split('mo')[0]) * MONTH;
        if (time.endsWith('y')) return parseInt(time.split('y')[0]) * YEAR;
    } catch (e) {
        console.error(`relativeTimeParser: ${e}`);
        return NaN;
    }

    return NaN;
}