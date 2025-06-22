import {EmbedBuilder, Message} from "discord.js";
import {FOOD_NAMES} from "./strings";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {FOOD_PRICES, PET_EMOJIS, PET_NAMES} from "./common";
import {DEV} from "../../index";
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import {GetWallet, RemoveFromWallet} from "../okash/wallet";
import {UserPet} from "./pet";


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
    if (!args[1] || !allowed_subcommands.includes(args[1].toLowerCase())) return message.reply({
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
    }
}


async function SubcommandShop(message: Message, args: Array<string>) {
    if (!args[2] || !allowed_shop_type.includes(args[2].toLowerCase())) return message.reply({
         content: ':x: Invalid shop menu. Valid menus are: `' + allowed_shop_type.join(', ') + '`.'
    });

    let embed;

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
            embed = new EmbedBuilder().setAuthor({name:message.author.displayName}).setTitle('Food Shop (page 2/3)').setColor(0x9d60cc);
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
                {name: '🐇 Bunny', value: `Adopt price: ${GetEmoji(EMOJI.OKASH)} OKA**100,000**`},
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
    let content = 'Your pets:\n'
    profile.pet_data.pets.forEach(pet => {
        content += `${index}. LVL${pet.level} ${PET_EMOJIS[pet.type]} **${pet.name}**`;
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
            if (profile.okash.wallet < 100_000) return message.reply({content:':crying_cat_face: You don\'t have enough okash to adopt that pet!'})
            // create the pet
            profile.okash.wallet -= 100_000;
            const d = new Date();
            const randomness_seed = Math.floor(Math.random() * 1000000);

            const new_pet: UserPet = {
                name: `${message.author.displayName}'s ${PET_NAMES[['cat','dog','fox','wolf','bunny'].indexOf(args[3].toLowerCase())]}`,
                type: ['cat','dog','fox','wolf','bunny'].indexOf(args[3].toLowerCase()),
                adopt_date: Math.floor(d.getTime()/1000),
                neglect_runaway_date: Math.floor(d.getTime()/1000)+(86400)*5, // 5 days until neglect runaway
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
                content: `:purple_heart: You adopted a ${PET_NAMES[['cat','dog','fox','wolf','bunny'].indexOf(args[3].toLowerCase())]}! Be sure to take good care of it!`
            });

            break;
    }

    UpdateUserProfile(message.author.id, profile);
}