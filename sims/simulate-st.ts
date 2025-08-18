enum MAIN_REWARD {
    LOSS,
    SMALL,
    MEDIUM,
    LARGE,
    JACKPOT
};

enum SUB_REWARD {
    SMALL,
    MEDIUM,
    LARGE
}

const PAYOUTS = {
    SMALL: [
        100,
        250,
        500
    ],
    MEDIUM: [
        1_000,
        3_000,
        5_000,
    ],
    LARGE: [
        25_000,
        30_000,
        50_000
    ],
    JACKPOT: [
          100_000,
          500_000,
        1_000_000
    ]
};

const rolls = {
    none: 0,
    small: 0,
    medium: 0,
    large: 0,
    jackpot: 0,
}
const winnings = {
    small: 0,
    medium: 0,
    large: 0,
    jackpot: 0,
}

function roll(forced_sub?: SUB_REWARD) {
    const reward_tier_roll = Math.floor((Math.random() * 50) - 1) + 1;
    let reward_tier = MAIN_REWARD.LOSS;

    if (reward_tier_roll > 15) reward_tier = MAIN_REWARD.SMALL;
    if (reward_tier_roll > 30) reward_tier = MAIN_REWARD.MEDIUM;
    if (reward_tier_roll > 37) reward_tier = MAIN_REWARD.LARGE;
    if (reward_tier_roll > 45) reward_tier = MAIN_REWARD.JACKPOT;

    const reward_value = forced_sub?forced_sub:<SUB_REWARD>(Math.floor((Math.random() * 3) - 1) + 1);

    switch (reward_tier) {
        case MAIN_REWARD.LOSS:
            rolls.none++;
            break;

        case MAIN_REWARD.SMALL:
            rolls.small++;
            winnings.small += PAYOUTS.SMALL[reward_value];
            break;

        case MAIN_REWARD.MEDIUM:
            rolls.medium++;
            winnings.medium += PAYOUTS.MEDIUM[reward_value];
            break;

        case MAIN_REWARD.LARGE:
            rolls.large++;
            winnings.large += PAYOUTS.LARGE[reward_value];
            break;

        case MAIN_REWARD.JACKPOT:
            rolls.jackpot++;
            winnings.jackpot += PAYOUTS.JACKPOT[reward_value];
            break;
    }
}


const runs = 1000;
for (let i = 0; i < runs; i++) roll(SUB_REWARD.LARGE);

console.log(`rolls: ${Math.round(winnings.small/rolls.small)} ${Math.round(winnings.medium/rolls.medium)} ${Math.round(winnings.large/rolls.large)} ${Math.round(winnings.jackpot/rolls.jackpot)}`);
console.log(`winnings: `, winnings);
console.log(`averages: ${Math.round(winnings.small/rolls.small)} ${Math.round(winnings.medium/rolls.medium)} ${Math.round(winnings.large/rolls.large)} ${Math.round(winnings.jackpot/rolls.jackpot)}`)