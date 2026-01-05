import {Snowflake} from "discord.js";
import {USER_PROFILE} from "../modules/user/prefs";
import {join} from "path";
import {JSONFilePreset} from "lowdb/node";
import {readdirSync, readFileSync} from "fs";


async function main() {
    const LOWDB_PATH = join(__dirname, '..', 'db', 'profiles.oka2');
    const PROFILES_PATH = join(__dirname, '..', 'profiles');

    console.log(LOWDB_PATH);

    const ProfilesDB = await JSONFilePreset(LOWDB_PATH, {
        profiles: {} as { [key: Snowflake]: USER_PROFILE }
    });
    ProfilesDB.data.profiles = {};

    const profiles = readdirSync(PROFILES_PATH);

    console.log(`ready to migrate ${profiles.length} profiles...`);

    profiles.forEach(profile => {
        ProfilesDB.data.profiles[profile.split('.oka')[0]] = JSON.parse(readFileSync(join(PROFILES_PATH, profile), 'utf-8'));
        console.log(`migrated ${profile} successfully!`);
    });

    ProfilesDB.write();

    console.log('migration complete!');
}

console.warn('WARNING: THIS WILL OVERWRITE EXISTING PROFILES IN THE CURRENT DATABASE! BACK UP YOUR DATABASE BEFORE CONTINUING IF THIS IS NOT YOUR FIRST TIME!!!');
console.log('migration will begin in 5 seconds...');

setTimeout(main, 5_000);