import { readFileSync } from 'node:fs';

// Parser for MESY files (Millie's Extremely Stupid... yes)
// This format stores only KV strings
// Each file can have a max of 256 key-value pairs (this limit is not present in TS/JS parsers)
// example: KEY:{{VALUE}}

const MESY_VERSION = "1.0.0";

export class MESYFile {
    public filename: string;
    public version: string = MESY_VERSION;
    protected pairs = new Map<string, string>();

    constructor(filename: string) {
        this.filename = filename;

        const data: string = readFileSync(filename, 'utf-8');
        const lines = data.split('\n');

        let line_num: number = 0;
        for (const line of lines) {
            line_num++;
            // kv pair must be at least 6 chars
            if (line.startsWith('>') || line.length < 6) continue;

            if (!(line.includes(":{{") && line.includes("}}"))) throw new Error(`Malformed line at line ${line_num}.`);

            const key = line.split(":{{")[0];
            const value = line.split(":{{")[1].split("}}")[0];

            if (this.pairs.has(key)) throw new Error(`Duplicate key of preexisting key "${key}" at line ${line_num}.`);
            this.pairs.set(key, value);
        }
    }


    public getValueOfKey(key: string): string {
        if (!this.pairs.has(key)) throw new Error("Key does not exist in loaded MESY file.");
        return this.pairs.get(key)!;
    }

    public getAllKeysAndValues(): {[key: string]: string} {
        const p: {[key: string]: string} = {};
        for (const key of this.pairs.keys()) p[key] = this.pairs.get(key)!;
        return p;
    }
}