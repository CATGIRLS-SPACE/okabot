


export enum PetType {
    CAT,
    DOG,
    FOX,
    WOLF,
    BUNNY,
}

export enum PetFood {
    APPLE,
    LEMON,
    BANANA,
    WATERMELON,
    GRAPE,
    STRAWBERRY,
    BLUEBERRY,
    CHERRY,
    PINEAPPLE,
    TOMATO,
    CUCUMBER,
    HOT_PEPPER,
    CARROT,
    CORN,
    POTATO,
    CROISSANT,
    BREAD,
    CHEESE,
    PANCAKES,
    WAFFLE,
    SUSHI,
    ONIGIRI,
    RICE_CRACKER,
    ODEN,
    DANGO,
    BEANS,
    KIWI,

    DEBUG = -1,
}

export enum PetLikeValue {
    HATES,
    LIKES,
    LOVES,
    FAVORITE
}

export enum PetActivity {
    PLAYING,
    SLEEPING,
    HUNTING,
    EATING,
}

export interface UserPet {
    name: string,
    type: PetType,
    level: number, // if the pet is less than rank 10, it has a chance of running away if neglected
    xp: number,
    adopt_date: number,
    neglect_runaway_date: number, // when the pet will run away if neglected
    serial: string, // unique identifier for this pet
    seed: number, // randomness seed for this pet
    stats: {
        dailies: number, // how many dailies claimed
        hunts: {
            items: number, // how many items the pet has brought back
            scraps: number, // how many scraps the pet has brought back
            food: number, // how many food items the pet has brought back
        },
        feeds: number, // how many times the user has fed the pet
        plays: number, // how many times the user has done an activity with the pet
    },
    flags: {
        claim_next_daily: boolean, // will the pet automatically claim the next daily?
    },
    favorite: { // the pet's favorite xyz
        unlocks: { // has the user discovered their pet's favorite thing yet?
            food: boolean,
            activity: boolean
        },
        food: PetFood,
        activity: PetActivity
    },
    hunger: number,
    energy: number,
    last_interact: number, // when was the last time the user interacted with their pet
}


export function CalculatePetTargetXP(level: number): number {
    return 250 + (150 * (level-1)) + Math.round(150 * ((level-1) * 0.01));
}


export function UpdatePetStatusValues(pet: UserPet): {hunger: number, energy: number} {
    // pets lose hunger and energy twice an hour
    // pets can only naturally go down to 25 energy and will instead gain energy if they are below 25
    const now = Math.round((new Date()).getTime()/1000);
    const hours_elapsed = Math.round((now-pet.last_interact) / 1600);
    let energy = Math.max(25, pet.energy - hours_elapsed);
    if (pet.energy < 25) energy = Math.min(25, pet.energy + hours_elapsed);
    return {hunger: Math.max(pet.hunger-hours_elapsed, 0), energy};
}

export function PetGetLikedFoodValue(seed: number, food: PetFood, favorite: PetFood): PetLikeValue {
    // a really stupid way of doing seeded randomness for food like values
    // returns 0-3 based on like value

    // will always return favorite for predetermined favorite food
    if (food == favorite) return PetLikeValue.FAVORITE;

    const values = [0,1,2,3];
    const picked = values[((1664525 * (seed + (food*3%5)) * (1013904223)) % (2 ** 32)) % 3];
    if (picked != 3) return picked; else return 2; // can't return 3 because that's favorite
}

export function PetGetLikedActivityValue(seed: number, activity: PetActivity, favorite: PetActivity): PetLikeValue {
    // a really stupid way of doing seeded randomness for activity like values
    // returns 0-3 based on like value

    // will always return favorite for predetermined favorite activity
    if (activity == favorite) return PetLikeValue.FAVORITE;

    const values = [0,1,2,3];
    const picked = values[((1664525 * (seed + (activity*3%5)) * (1013904223)) % (2 ** 32)) % 3];
    if (picked != 3) return picked; else return 2; // can't return 3 because that's favorite
}