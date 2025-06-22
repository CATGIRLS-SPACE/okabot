

export enum FOOD_STRING {
    RICE_CRACKER_LIKE = 100,
    RICE_CRACKER_HATE,
    LEMON_HATE,
    GRAPE_DOGS,
    HOT_PEPPER_HATE,
    WAFFLE_FAVORITE,
    WAFFLE_HATE,
    BEANS_FAVORITE,
    BEANS_HATE,
    DANGO_FAVORITE,
    DANGO_HATE,
}

const STRINGS: {[key: number]: string} = {
    // special feed strings
    100: "**$PET** likes the rice cracker--hey, wait! You're supposed to be focused on your grades!",
    101: "**$PET** hates the rice cracker. Guess they won't be eloping anytime soon...",
    102: "**$PET** thinks the lemon is *way* too sour...",
    103: "grapes are poisonous to dogs...",
    104: "**$PET** is nearly set on fire by how spicy the pepper is...",
    105: "**$PET** absolutely loves waffles, it's their favorite!\n-# I love waffles too...if you know what I mean.",
    106: "**$PET** hates the waffle! It makes me upset to know that!",
    107: "**$PET** absolutely loves beans, it's their favorite! I wonder if they like naughty beans, too?",
    108: "**$PET** hates the beans. I would suspect they hate naughty beans too...",
    109: "**$PET** absolutely loves the dango, it's their favorite! I understand how they feel, dango is amazing!",
    110: "I can't believe it, but **$PET** hates the dango.",
}

// corresponds to PetFood in pet.ts
export const FOOD_NAMES: Array<string> = [
    "🍎 Apple",
    "🍋 Lemon",
    "🍌 Banana",
    "🍉 Watermelon",
    "🍇 Grape",
    "🍓 Strawberry",
    "🫐 Blueberry",
    "🍒 Cherry",
    "🍍 Pineapple",
    "🍅 Tomato",
    "🥒 Cucumber",
    "🌶️ Hot Pepper",
    "🥕 Carrot",
    "🌽 Corn",
    "🥔 Potato",
    "🥐 Croissant",
    "🍞 Bread",
    "🧀 Cheese",
    "🥞 Pancakes",
    "🧇 Waffle",
    "🍣 Sushi",
    "🍙 Onigiri",
    "🍘 Rice Cracker",
    "🍢 Oden",
    "🍡 Dango",
    "🫘 Beans",
    "🥝 Kiwi",
];