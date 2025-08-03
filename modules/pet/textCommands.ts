import {Embed, EmbedBuilder, Message, TextChannel} from "discord.js";
import {ACTIVITY_NAMES, FOOD_NAMES, FOOD_NAMES_TYPED, FOOD_STRING, SPECIAL_STRINGS} from "./strings";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {FOOD_PRICES, FOOD_VALUES, PET_EMOJIS, PET_NAMES} from "./common";
import {DEV} from "../../index";
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import {GetWallet, RemoveFromWallet} from "../okash/wallet";
import {
    CalculatePetTargetXP,
    PetFood,
    PetGetLikedFoodValue,
    PetLikeValue,
    PetType,
    UpdatePetStatusValues,
    UserPet
} from "./pet";


const allowed_subcommands: Array<string> = [
    'status',
    'list',
    'feed',
    'play',
    'hunt',
    'shop',
    'buy',
];

const allowed_shop_type: Array<string> = ['food1','food2','food3','pets'];
const allowed_buy_type: Array<string> = ['food','pet'];


export async function PetParseTextCommand(message: Message) {
    if (!DEV) return message.reply({content:':hourglass: That feature isn\'t ready quite yet!'});

    const args = message.content.split(' ');
    if (!args[1] || !allowed_subcommands.includes(args[1].toLowerCase()) && !DEV) return message.reply({
        content: ':x: Invalid subcommand. Valid subcommands are: `' + allowed_subcommands.join(', ') + '`.'
    });

    switch (args[1].toLowerCase()) {
        case 'shop':
            SubcommandShop(message, args);
            break;

        case 'list':
            SubcommandList(message, args);
            break;

        case 'buy':
            SubcommandBuy(message, args);
            break;

        case 'status':
            SubcommandStatus(message, args);
            break;

        case 'feed':
            SubcommandFeed(message, args);
            break;

        case 'play':
            break;

        case 'hunt':
            break;

        case 'debug-seed':
            DebugSeed(parseInt(args[2]), message);
            break;
    }
}

async function DebugSeed(seed: number, message: Message) {
    if (!DEV) return message.reply({content:':x: That subcommand isn\'t available unless the bot is running in developer mode!'});
    let final = `## Seed \`${seed}\` Food Values:\n`
    for (let i = 0; i < 26; i++) {
        const like_value = ['HATE','LIKE','LOVE','FAVORITE'][PetGetLikedFoodValue(seed, i, -1)];
        final += `- ${FOOD_NAMES[i]}: ${like_value}\n`;
    }

    message.reply({content:final});
}


async function SubcommandShop(message: Message, args: Array<string>) {
    if (!args[2] || !allowed_shop_type.includes(args[2].toLowerCase())) return message.reply({
         content: ':x: Invalid shop menu. Valid menus are: `' + allowed_shop_type.join(', ') + '`.'
    });

    let embed: EmbedBuilder;

    switch (args[2].toLowerCase()) {
        case 'food1':
            embed = new EmbedBuilder().setAuthor({name:message.author.displayName}).setTitle('Food Shop (page 1/3)').setColor(0x9d60cc);
            for (let i = 0; i < 9; i++) {
                embed.addFields({name:FOOD_NAMES[i],value:`\`(ID ${i+1})\` ${GetEmoji(EMOJI.OKASH)} OKA**${FOOD_PRICES[i]}**`});
            }
            break;

        case 'food2':
            embed = new EmbedBuilder().setAuthor({name:message.author.displayName}).setTitle('Food Shop (page 2/3)').setColor(0x9d60cc);
            for (let i = 9; i < 18; i++) {
                embed.addFields({name:FOOD_NAMES[i],value:`\`(ID ${i+1})\` ${GetEmoji(EMOJI.OKASH)} OKA**${FOOD_PRICES[i]}**`});
            }
            break;

        case 'food3':
            embed = new EmbedBuilder().setAuthor({name:message.author.displayName}).setTitle('Food Shop (page 3/3)').setColor(0x9d60cc);
            for (let i = 18; i < 27; i++) {
                embed.addFields({name:FOOD_NAMES[i],value:`\`(ID ${i+1})\` ${GetEmoji(EMOJI.OKASH)} OKA**${FOOD_PRICES[i]}**`});
            }
            break;

        case 'pets':
            embed = new EmbedBuilder().setAuthor({name:message.author.displayName}).setTitle('Pet Shop').setColor(0x9d60cc).addFields(
                {name: '🐈 Cat', value: `Adopt price: ${GetEmoji(EMOJI.OKASH)} OKA**100,000**`},
                {name: '🐕 Dog', value: `Adopt price: ${GetEmoji(EMOJI.OKASH)} OKA**100,000**`},
                {name: '🦊 Fox', value: `Adopt price: ${GetEmoji(EMOJI.OKASH)} OKA**100,000**`},
                {name: '🐺 Wolf', value: `Adopt price: ${GetEmoji(EMOJI.OKASH)} OKA**100,000**`},
                {name: `${GetEmoji(EMOJI.BOOST)}☕ 🐇 Bunny`, value: `Adopt price: ${GetEmoji(EMOJI.OKASH)} OKA**100,000**`},
            );
            break;
    }

    message.reply({
        content: args[2].toLowerCase()=='pets'?':warning: Please read the /help entry on pets before adopting one!\nUse command `o.pet buy pet <name>` to adopt a pet.':'Use command `o.pet buy food <id> [count]` to purchase!',
        embeds: [embed!]
    });
}


async function SubcommandList(message: Message, args: Array<string>) {
    const profile = GetUserProfile(message.author.id);

    if (profile.pet_data.pets.length == 0) return message.reply({
        content: `:crying_cat_face: **${message.author.displayName}**, you don't have any pets! Check the shop with \`o.pet shop pets\`!`
    });

    // user has pets
    let index = 1;
    const now = Math.round((new Date()).getTime() / 1000);
    let content = 'Your pets:\n'
    profile.pet_data.pets.forEach(pet => {
        if (pet.neglect_runaway_date < now && pet.level < 10) {
            message.reply({content:`:crying_cat_face: You neglected ${PET_EMOJIS[pet.type]} **${pet.name}**, and they ran away...\nPlease try to take better care of your pets.`});
            profile.pet_data.pets.splice(profile.pet_data.pets.indexOf(pet), 1);
            UpdateUserProfile(message.author.id, profile);
            return;
        }
        content += `${index}. LVL**${pet.level}**  ${PET_EMOJIS[pet.type]} **${pet.name}**\n`;
        index++;
    });

    message.reply({content});
}


async function SubcommandBuy(message: Message, args: Array<string>) {
    if (!args[2] || !allowed_buy_type.includes(args[2].toLowerCase())) return message.reply({
        content: ':x: Invalid buy option. Valid options are `' + allowed_buy_type.join(', ') + '`'
    });

    let profile = GetUserProfile(message.author.id);
    const okash = GetWallet(message.author.id);

    switch (args[2]) {
        case 'food':
            const food = parseInt(args[3]);
            if (isNaN(food) || food < 1 || food > 26) return message.reply({content: ':x: Not a valid food item. Check the shop with `o.pet shop food[1-3]`.'});
            let count = parseInt(args[4]);
            if (isNaN(count)) count = 1;

            if (okash < FOOD_PRICES[food - 1]*count) return message.reply({content:":crying_cat_face: You don't have enough okash in your wallet to buy that!"});

            profile.okash.wallet -= FOOD_PRICES[food-1]*count;
            for (let i = 0; i < count; i++) profile.pet_data.inventory.push(food-1);
            message.reply({content: `:shopping_cart: **${message.author.displayName}**, you bought ${count}x ${FOOD_NAMES[food-1]}!`});
            break;

        case 'pet':
            if (!args[3]) return message.reply({content: ':x: Please tell me what pet you want to adopt!'});
            if (!['cat','dog','fox','wolf','bunny'].includes(args[3].toLowerCase())) return message.reply({content:':x: Not a valid pet! Valid pets are `cat, dog, fox, wolf, bunny`.'});
            if (profile.okash.wallet < 100_000) return message.reply({content:':crying_cat_face: You don\'t have enough okash to adopt that pet!'});

            if (args[3].toLowerCase() == 'bunny') {
                // ensure the user is a booster/donator
                let donator = false;
                // only ko-fi donator is tacobella03
                if (message.author.id == '502879264081707008') donator = true;
                // boost role
                const guild = message.client.guilds.cache.get(message.guild!.id)!;
                const booster_role = !DEV?guild.roles.premiumSubscriberRole:guild.roles.cache.find(role => role.name == 'fake booster role');
                console.log(`booster role found? ${booster_role?'yes':'no'}`);
                const user_is_booster = booster_role?guild.members.cache.get(message.author.id)!.roles.cache.some(role => role.id === booster_role.id):false;
                console.log(`user is booster? ${user_is_booster?'yes':'no'}`);
                if (!user_is_booster && !donator) return message.reply({
                    content: `:crying_cat_face: Sorry, **${message.author.displayName}**, but you need to either be a donator or server booster to adopt this type of pet!`
                });
            }

            let has_neglectable_pet = false;
            profile.pet_data.pets.forEach(pet => { if (pet.level < 25) has_neglectable_pet = true; });
            if (has_neglectable_pet) return message.reply({content: ':crying_cat_face: Sorry, but you have a pet under level 25. Please level up your pet to level 25 to adopt another!'});
            
            // create the pet
            profile.okash.wallet -= 100_000;
            const d = new Date();
            const randomness_seed = Math.floor(Math.random() * 1000000);

            const new_pet: UserPet = {
                name: `${message.author.displayName}'s ${PET_NAMES[['cat','dog','fox','wolf','bunny'].indexOf(args[3].toLowerCase())]}`,
                type: ['cat','dog','fox','wolf','bunny'].indexOf(args[3].toLowerCase()),
                adopt_date: Math.floor(d.getTime()/1000),
                neglect_runaway_date: Math.floor(d.getTime()/1000)+(86400)*3, // 3 days until neglect runaway
                serial: crypto.randomUUID(),
                energy: 50,
                hunger: 50,
                seed: randomness_seed,
                favorite: {
                    unlocks: {
                        activity: false,
                        food: false,
                    },
                    activity: Math.floor(Math.random() * 4),
                    food: Math.floor(Math.random() * (FOOD_NAMES.length))
                },
                flags: {
                    claim_next_daily: false,
                },
                level: 1,
                xp: 0,
                stats: {dailies:0,feeds:0,hunts:{food:0,items:0,scraps:0},plays:0},
                last_interact: Math.floor(d.getTime()/1000)
            };

            profile.pet_data.pets.push(new_pet);

            message.reply({
                content: `:purple_heart: You adopted a **${PET_NAMES[['cat','dog','fox','wolf','bunny'].indexOf(args[3].toLowerCase())]}**! Be sure to take good care of it!`
            });

            break;
    }

    UpdateUserProfile(message.author.id, profile);
}


async function SubcommandStatus(message: Message, args: Array<string>) {
    if (!args[2] || isNaN(parseInt(args[2]))) return message.reply({content:`:x: Please supply the number pet you want to view the status of! Use command \`o.pet list\` to see.`});

    const profile = GetUserProfile(message.author.id);
    if (profile.pet_data.pets.length == 0) return message.reply({content:':x: You don\'t have any pets yet!'});
    if (profile.pet_data.pets.length < parseInt(args[2])) return message.reply({content:':x: You don\'t have that many pets!'});

    const pet = profile.pet_data.pets[parseInt(args[2]) - 1];

    const d = new Date();
    if (Math.round(d.getTime()/1000) > pet.neglect_runaway_date && pet.level < 25) {
        message.reply({content:`:crying_cat_face: You neglected ${PET_EMOJIS[pet.type]} **${pet.name}**, and they ran away...\nPlease try to take better care of your pets.`});
        profile.pet_data.pets.splice(profile.pet_data.pets.indexOf(pet));
        return;
    }

    const pet_fav_food = pet.favorite.unlocks.food?FOOD_NAMES[pet.favorite.food]:'[ ??? ]';
    const pet_fav_activity = pet.favorite.unlocks.activity?ACTIVITY_NAMES[pet.favorite.activity]:'[ ??? ]';

    const values = UpdatePetStatusValues(pet);

    message.reply({
        content: `${PET_EMOJIS[pet.type]}  LVL**${pet.level}**  (${pet.xp}/${CalculatePetTargetXP(pet.level)}XP)  |  **${pet.name}**\n> Favorite Food: **${pet_fav_food}**  |  Favorite Activity: **${pet_fav_activity}**\n` +
            `> Hunger: ${values.hunger}/100  |  Energy: ${values.energy}/100`
    });
}


async function SubcommandFeed(message: Message, args: Array<string>) {
    if (!args[2] || isNaN(parseInt(args[2]))) return message.reply({content:':x: Please give me the number of the pet you want to feed! Use `o.pet list` to see.'});
    
    const profile = GetUserProfile(message.author.id);
    if (profile.pet_data.pets.length == 0) message.reply({content:':x: You don\'t have any pets yet!'});
    if (profile.pet_data.pets.length < parseInt(args[2])) message.reply({content:':x: You don\'t have that many pets!'});

    if (!args[3] || !FOOD_NAMES_TYPED.includes(args[3].toLowerCase())) return message.reply({content:':x: Not a valid food!\nIf your food has a space, join the two words (eg. `Rice Cracker` = `ricecracker`)'});
    const food_id = FOOD_NAMES_TYPED.indexOf(args[3].toLowerCase());
    if (!profile.pet_data.inventory.includes(food_id)) return message.reply({content:`You don't have any ${FOOD_NAMES[food_id]}!`});

    // all checks passed, feed the pet
    const pet = profile.pet_data.pets[parseInt(args[2]) - 1];

    if (pet.type == PetType.DOG && food_id == PetFood.GRAPE) return message.reply({content:SPECIAL_STRINGS[FOOD_STRING.GRAPE_DOGS].replace('$PET', pet.name)});
    
    const d = new Date();
    if (Math.round(d.getTime()/1000) > pet.neglect_runaway_date && pet.level < 25) {
        message.reply({content:`:crying_cat_face: You neglected ${PET_EMOJIS[pet.type]} **${pet.name}**, and they ran away...\nPlease try to take better care of your pets.`});
        profile.pet_data.pets.splice(profile.pet_data.pets.indexOf(pet));
        UpdateUserProfile(message.author.id, profile);
        return;
    }

    if (pet.hunger + FOOD_VALUES[food_id][0] > 100) return message.reply({content:`${PET_EMOJIS[pet.type]} **${pet.name}** is too full to eat ${FOOD_NAMES[food_id]} right now!`});

    profile.pet_data.inventory.splice(profile.pet_data.inventory.indexOf(food_id), 1);

    pet.hunger += FOOD_VALUES[food_id][0];
    pet.energy = Math.min(100, pet.energy + FOOD_VALUES[food_id][1]); // max of 100 energy

    pet.stats.feeds++;

    if (pet.level < 10) pet.neglect_runaway_date = Math.round(d.getTime()/1000) + (86400 * 3);
    pet.last_interact = Math.round(d.getTime()/1000);

    switch (PetGetLikedFoodValue(pet.seed, food_id, pet.favorite.food)) {
        case PetLikeValue.HATES:
            pet.xp += 5;
            if (food_id == PetFood.RICE_CRACKER) message.reply({content:PET_EMOJIS[pet.type] +' '+ SPECIAL_STRINGS[FOOD_STRING.RICE_CRACKER_HATE].replace('$PET', pet.name)});
            else if (food_id == PetFood.LEMON) message.reply({content:PET_EMOJIS[pet.type] +' '+ SPECIAL_STRINGS[FOOD_STRING.LEMON_HATE].replace('$PET', pet.name)});
            else if (food_id == PetFood.WAFFLE) message.reply({content:PET_EMOJIS[pet.type] +' '+ SPECIAL_STRINGS[FOOD_STRING.WAFFLE_HATE].replace('$PET', pet.name)});
            else if (food_id == PetFood.BEANS) message.reply({content:PET_EMOJIS[pet.type] +' '+ SPECIAL_STRINGS[FOOD_STRING.BEANS_HATE].replace('$PET', pet.name)});
            else if (food_id == PetFood.DANGO) message.reply({content:PET_EMOJIS[pet.type] +' '+ SPECIAL_STRINGS[FOOD_STRING.DANGO_HATE].replace('$PET', pet.name)});
            else message.reply({content:`${PET_EMOJIS[pet.type]} **${pet.name}** eats a ${FOOD_NAMES[food_id]}, but they absolutely hate it!`});
            break;

        case PetLikeValue.LIKES:
            pet.xp += 25;
            message.reply({content:`${PET_EMOJIS[pet.type]} **${pet.name}** eats a ${FOOD_NAMES[food_id]}, they think it's alright.`});
            break;

        case PetLikeValue.LOVES:
            pet.xp += 50;
            if (food_id == PetFood.RICE_CRACKER) message.reply({content:PET_EMOJIS[pet.type] +' '+ SPECIAL_STRINGS[FOOD_STRING.RICE_CRACKER_LIKE].replace('$PET', pet.name)});
            else message.reply({content:`${PET_EMOJIS[pet.type]} **${pet.name}** eats a ${FOOD_NAMES[food_id]}, and they seem to really like it!`});
            break;

        case PetLikeValue.FAVORITE:
            pet.xp += 150;
            pet.favorite.unlocks.food = true;
            if (food_id == PetFood.WAFFLE) message.reply({content:PET_EMOJIS[pet.type] +' '+ SPECIAL_STRINGS[FOOD_STRING.WAFFLE_FAVORITE].replace('$PET', pet.name)});
            else if (food_id == PetFood.BEANS) message.reply({content:PET_EMOJIS[pet.type] +' '+ SPECIAL_STRINGS[FOOD_STRING.BEANS_FAVORITE].replace('$PET', pet.name)});
            else if (food_id == PetFood.DANGO) message.reply({content:PET_EMOJIS[pet.type] +' '+ SPECIAL_STRINGS[FOOD_STRING.DANGO_FAVORITE].replace('$PET', pet.name)});
            else message.reply({content:`${PET_EMOJIS[pet.type]} **${pet.name}** eats a ${FOOD_NAMES[food_id]}, and they really, really like it, it's their favorite!`});
            break;
    }

    if (pet.xp >= CalculatePetTargetXP(pet.level)) {
        pet.xp -= CalculatePetTargetXP(pet.level);
        pet.level++;
        (message.channel as TextChannel).send({content: `:tada: Congrats, **${message.author.displayName}**! ${PET_EMOJIS[pet.type]} **${pet.name}** has leveled up to LVL**${pet.level}**!`});
    }

    profile.pet_data.pets[parseInt(args[2]) - 1] = pet;
    UpdateUserProfile(message.author.id, profile);
}