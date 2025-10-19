import {readFileSync} from "fs";


export class MMFFile {
    private schema_prop_count = 0;
    private readonly schema_prop_names: string[] = [];

    public readonly name;
    public readonly author;
    public readonly ok: boolean = false;
    public cards: Array<{[key:string]:string}> = [];

    constructor(path: string) {
        const filedata = readFileSync(path, 'utf-8');
        const lines = filedata.split(';').map(item => item.trim());
        const unmapped_card_values: Array<string>[] = [];

        for (const line of lines) {
            const line_parts = line.split('::');
            if (line_parts[0] == '_meta') {
                this.name = line_parts[1];
                this.author = line_parts[2];
                continue;
            }
            if (line_parts[0] == '_schema') {
                this.schema_prop_count = line_parts[1].split(',').length;
                this.schema_prop_names = line_parts[1].split(',');
                continue;
            }

            unmapped_card_values.push(line_parts);
        }

        if (this.schema_prop_names.length == 0) throw new Error('schema was never provided');

        console.log(this.schema_prop_names);

        for (const values in unmapped_card_values) {
            const card: {[key: string]: string} = {};
            for (const value in unmapped_card_values[values]) {
                card[this.schema_prop_names[value]] = unmapped_card_values[values][value];
                this.cards.push(card);
            }
        }

        this.ok = true;
        console.log(this.cards);
    }


}