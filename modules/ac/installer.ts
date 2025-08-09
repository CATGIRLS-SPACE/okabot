import { subtle } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { BASE_DIRNAME } from "../..";


export async function InstallHook(path: string, name: string, aes_key: string) {
    try {
        const ENCODER = new TextEncoder();
        const P_AES_KEY = aes_key;
        const P_AES_KEY_BYTES = ENCODER.encode(P_AES_KEY);
        let AES_KEY!: CryptoKey;
        await subtle.importKey('raw', P_AES_KEY_BYTES, { name: 'AES-CBC' }, false, ["decrypt"]).then(key => { AES_KEY = key; });
        
        const buffer_encrypted = readFileSync(path, 'utf-8');
        const buffer_decrypted = await subtle.decrypt({ name: 'AES-CBC', iv: P_AES_KEY_BYTES }, AES_KEY, Uint8Array.from(buffer_encrypted.match(/.{1,2}/g)!.map(b => parseInt(b, 16))));
        
        writeFileSync(join(BASE_DIRNAME, 'modules', 'ac', 'hooks', name), (new TextDecoder).decode(buffer_decrypted), 'utf-8');
    } catch (err) {
        console.error(err);
    }
}