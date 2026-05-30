

function createMessageScore(message: string): number {
    let score = 0;

    // add/sub score based on length
    score += message.length >= 20 ? 2 : 0;
    score += message.length >= 50 ? 1 : 0;
    score -= message.length >= 300 ? 2 : 0;

    // deduct from messages that are just nothingburgers
    score -= /^(yea|yeah|nah|ok|lol|lmao|lmfao|real|same|true)$/i.test(message) ? 5 : 0;

    // add to messages that have "substance" ?? idk lol
    score += /\bwhy\b.*\b(is|are|did|does)\b/i.test(message) ? 2 : 0;
    score += /\bi (just|accidentally|somehow|literally)\b/i.test(message) ? 2 : 0;
    score += /\bthis is (so )?(cursed|evil|insane|bad|stupid|funny|awful)\b/i.test(message) ? 2 : 0;

    return score;
}

let MESSAGE_RECORD: Array<{message: string, score: number}> = [];

export function AddMessageToRecord(message: string) {
    if (/\b(my address|my phone number|password|token|api key)\b/i.test(message)) return;
    const score = createMessageScore(message);
    MESSAGE_RECORD.push({
        message, score
    });
}

export function GetLastMessages(reset: boolean) {
    const sorted = MESSAGE_RECORD.sort((a, b) => {
        if (a.score > b.score) return 1;
        if (a.score < b.score) return -1;
        else return 0;
    });
    if (reset) MESSAGE_RECORD = [];
    return sorted;
}