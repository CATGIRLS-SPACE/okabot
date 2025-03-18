import {CanvasRenderingContext2D, createCanvas} from "canvas";
import { AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { BASE_DIRNAME, CoinFloats } from "../../index";
import { GetLastNumValues, Stocks } from "../okash/stock";
import {GetCasinoDB} from "../okash/casinodb";


export async function GenerateCoinflipDataDisplay(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const width = 550;
    const height = 125;
    const canvas = createCanvas(width,height);
    const ctx = canvas.getContext('2d');
    const render_count = interaction.options.getNumber('length', false) || -1;

    // bg
    ctx.fillStyle = '#2b2d42';
    ctx.fillRect(0,0,width,height);

    ctx.font = 'bold 120px azuki_font';
    ctx.textAlign = "center";
    ctx.fillStyle = '#35364a';
    ctx.fillText('okabot', width/2, height-20);

    // the little notchy lines
    ctx.fillStyle = '#4b4d82';
    ctx.fillRect(25, 90, 500, 2); // bottom
    ctx.fillRect(25, 80, 2, 20); // left far line
    ctx.fillRect(525, 80, 2, 20); // right far line
    ctx.fillRect(274, 80, 2, 20); // center line

    ctx.font = 'bold 16px Arial';
    ctx.fillText('0.0', 25, 115); // far left text
    ctx.fillText('0.5', 274, 115); // center text
    ctx.fillText('1.0', 525, 115); // far right text

    // get all the stats
    const stats: CoinFloats = JSON.parse(readFileSync(join(BASE_DIRNAME, 'stats.oka'), 'utf-8'));
    if (render_count != -1) stats.coinflip.all_rolls = stats.coinflip.all_rolls.slice(-render_count);
    
    // create a tick for each of them and do an average
    let total = 0;
    stats.coinflip.all_rolls.forEach(roll => {
        total += roll;
        const x = 25 + (500*roll);
        ctx.fillStyle = randomColor();
        ctx.fillRect(x, 85, 1, 12);
    });

    ctx.fillStyle = '#7bedd3';
    ctx.fillRect(25+((total/stats.coinflip.all_rolls.length)*500), 70, 1, 25);

    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`amin/amax: ${stats.coinflip.low.value} / ${stats.coinflip.high.value}`, 4, 12);
    ctx.fillText(`group median of ${stats.coinflip.all_rolls.length} values: ${total/stats.coinflip.all_rolls.length}`, 4, 24);
    ctx.fillStyle = 'rgba(252, 199, 252, 0.6)';
    ctx.fillText(`dmin/dmax: ${stats.coinflip.daily!.low.value} / ${stats.coinflip.daily!.high.value}`, 4, 36);
    let nwc_win = 0;
    let wc_win = 0;
    stats.coinflip.all_rolls.forEach(roll => {
        if (roll >= 0.5) nwc_win += 1;
        if (roll >= 0.3) wc_win += 1;
    });
    ctx.font = '16px monospace';
    ctx.fillText(`HW% (nwc/wc): ${Math.round((nwc_win/stats.coinflip.all_rolls.length)*100)}% / ${Math.round((wc_win/stats.coinflip.all_rolls.length)*100)}%`, 4, 50);

    // save image
    const buffer = canvas.toBuffer('image/png');
    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
    writeFileSync(join(BASE_DIRNAME, 'temp', 'render-demo.png'), buffer);
    
    const image = new AttachmentBuilder(join(BASE_DIRNAME, 'temp', 'render-demo.png'));
    interaction.editReply({
        content:``,
        files: [image]
    });
}





function randomColor(): string {
    return `rgb(25, ${Math.round(Math.random() * 155)+100}, 50);`
}


export async function RenderStockDisplay(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const width = 550, height = 125;
    const canvas = createCanvas(width,height);
    const ctx = canvas.getContext('2d');

    const values = GetLastNumValues(interaction.options.getString('stock', true) as Stocks, parseInt(interaction.options.getString('length', true)));
    const sorted_values = GetLastNumValues(interaction.options.getString('stock', true) as Stocks, parseInt(interaction.options.getString('length', true))).sort(sortPrices);

    if (values.length < 25) {
        const d = new Date();
        return interaction.editReply({
            content:`:crying_cat_face: Sorry, there isn't enough data to render this graph yet. Check back <t:${Math.floor(d.getTime() / 1000) + ((26-values.length)*300)}:R>`
        });
    }

    // bg
    ctx.fillStyle = '#2f1c3d00';
    ctx.fillRect(0,0,width,height);

    ctx.font = '14px monospace';

    // graph
    ctx.fillStyle = '#2c2630';
    ctx.beginPath();
    ctx.roundRect(5, 5, width - 10, height - 10, 12);
    ctx.fill();
    ctx.strokeStyle = '#9e8bad';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(5, 5, width - 10, height - 10, 12);
    ctx.stroke();

    const graph_width = width - 10;
    const graph_height = height - 10;

    // we want nine lines for horizontal
    // ctx.strokeStyle = '#cfcfcf';
    // for (let i = 1; i < 10; i++) {
    //     ctx.strokeRect(i * (graph_width / 10) + 45, 5, 1, graph_height);
    // }

    ctx.font = '100px azuki_font';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#9d60cc33';
    ctx.fillText('okabot', 125, 5);

    const graph_max = Math.round(sorted_values[0]);
    const graph_min = Math.round(sorted_values.at(-1)!);
    const graph_line_limit_top = graph_min + (((graph_max - graph_min) / 3) * 2)
    const graph_line_limit_mid = graph_min + ((graph_max - graph_min) / 3);
    ctx.fillStyle = '#eee';

    ctx.font = 'bold 16px monospace';
    ctx.textBaseline = 'alphabetic';

    let current_hilow: 'high' | 'low' = 'low';

    // move the min/max
    if (values.at(-1)! > graph_line_limit_top) {
        // only bottom
        current_hilow = 'high';
    } else if (values.at(-1)! < graph_line_limit_mid) {
        // only top
        current_hilow = 'low';
    }

    if (values[3] > graph_line_limit_top) {
        // bottom
        ctx.fillText('⬆️ ' + graph_max.toString(), 10, height - 14 - 14);
        ctx.fillText('⬇️ ' + graph_min.toString(), 10, height - 14);
    } else if (values[3] < graph_line_limit_mid) {
        // top
        ctx.fillText('⬆️ ' + graph_max.toString(), 10, 22);
        ctx.fillText('⬇️ ' + graph_min.toString(), 10, 22 + 14);
    } else {
        // split
        ctx.fillText(graph_max.toString(), 10, 22);
        ctx.fillText(graph_min.toString(), 10, height - 14);
    }


    
    
    const total_range = graph_max - graph_min;

    const total_points = values.length;
    const x_spacing = (545 - 5) / (total_points - 1); // Evenly space points

    let x2 = 0;
    let y2 = 0;

    for (let i = 0; i < total_points - 1; i++) {
        const target_difference = values[i] - graph_min;
        const next_difference = values[i + 1] - graph_min;

        // Keep the 5px margin in Y calculation
        const y_min = 8;
        const y_max = graph_height;
        const y1 = y_max - ((target_difference / total_range) * (y_max - y_min));
        y2 = y_max - ((next_difference / total_range) * (y_max - y_min));

        // Reverse the x calculation to go from right to left
        const x1 = 5 + i * x_spacing;
        x2 = 5 + (i + 1) * x_spacing;

        // Determine trend color
        const trend_pos = values[i + 1] >= values[i];
        ctx.strokeStyle = trend_pos ? '#54d672' : '#f76571';
        ctx.lineWidth = 3;

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke(); // Apply the stroke immediately

    }

    // render current
    ctx.fillStyle = '#20403799';
    ctx.textAlign = 'center';
    if (current_hilow == 'high') {
        ctx.beginPath();
        ctx.roundRect((550/2)-50, 10, 100, 20, 6);
        ctx.fill();

        ctx.fillStyle = '#b5ffeb';
        ctx.fillText(Math.round(values.at(-1)!).toString(), 550/2, 25);

        ctx.strokeStyle = '#b5ffeb66';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo((550/2) + 52, 20);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.roundRect((550/2)-50, height-30, 100, 20, 6);
        ctx.fill();

        ctx.fillStyle = '#b5ffeb';
        ctx.fillText(Math.round(values.at(-1)!).toString(), 550/2, height-14);

        ctx.strokeStyle = '#b5ffeb66';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo((550/2) + 52, height - 20);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // save image
    const buffer = canvas.toBuffer('image/png');
    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
    writeFileSync(join(BASE_DIRNAME, 'temp', 'render-stock.png'), buffer);
    
    const image = new AttachmentBuilder(join(BASE_DIRNAME, 'temp', 'render-stock.png'));
    interaction.editReply({
        content:``,
        files: [image]
    });
}


function GenerateMultiBar(
    ctx: CanvasRenderingContext2D,
    bar_start_x: number,
    bar_start_y: number,
    bar_width: number,
    bar_height: number,
    sections: {
        count: 2 | 4,
        total: number,
        values: Array<number>,
        colors: Array<string>
    }
) {
    // create mask
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bar_start_x, bar_start_y, bar_width, bar_height, 6);
    ctx.closePath();
    ctx.clip();

    // make bar
    switch (sections.count) {
        case 2:
            const double_first_width = Math.round((sections.values[0]/sections.total) * bar_width);
            ctx.fillStyle = sections.colors[0];
            ctx.fillRect(bar_start_x, bar_start_y, double_first_width, bar_height);
            ctx.fillStyle = sections.colors[1];
            ctx.fillRect(bar_start_x + double_first_width, bar_start_y, bar_width - double_first_width, bar_height);
            break;

        case 4:
            const quad_first_width = Math.round((sections.values[0]/sections.total) * bar_width);
            const quad_second_width = Math.round((sections.values[1]/sections.total) * bar_width);
            const quad_third_width = Math.round((sections.values[2]/sections.total) * bar_width);
            const quad_final_width = Math.round((sections.values[3]/sections.total) * bar_width);
            ctx.fillStyle = sections.colors[0];
            ctx.fillRect(bar_start_x, bar_start_y, quad_first_width, bar_height);
            ctx.fillStyle = sections.colors[1];
            ctx.fillRect(bar_start_x + quad_first_width, bar_start_y, quad_second_width, bar_height);
            ctx.fillStyle = sections.colors[2];
            ctx.fillRect(bar_start_x + quad_first_width + quad_second_width, bar_start_y, quad_third_width, bar_height);
            ctx.fillStyle = sections.colors[3];
            ctx.fillRect(bar_start_x + quad_first_width + quad_second_width + quad_third_width, bar_start_y, quad_final_width, bar_height);
            break;
    }

    // render bar
    ctx.restore();
    ctx.fillStyle = '#ffffff00';
    ctx.fill();
}

export async function RenderCasinoDB(interaction: ChatInputCommandInteraction) {
    const casino = GetCasinoDB();

    const width = 550, height = 350;
    const canvas = createCanvas(width,height);
    const ctx = canvas.getContext('2d');

    // background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // first bar, winloss all
    let bar_start_x = 25;
    let bar_start_y = 50;
    let bar_width = 500;
    let bar_height = 25;

    GenerateMultiBar(ctx, bar_start_x, bar_start_y, bar_width, bar_height, {
        count: 2,
        values: [casino.wins, casino.losses],
        total: casino.wins + casino.losses,
        colors: [
            '#77ff7f',
            '#ff7171',
        ]
    });
    ctx.font = '16px azuki_font';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff7171';
    ctx.fillText(`${casino.losses} LOSS`, bar_start_x + bar_width, bar_start_y + bar_height + 20);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#77ff7f';
    ctx.fillText(`WINS ${casino.wins}`, bar_start_x, bar_start_y + bar_height + 20);

    // second bar, win all

    // GenerateMultiBar(ctx, bar_start_x, bar_start_y, bar_width, bar_height, {
    //     count: 4,
    //     values: [7, 3, 2, 6],
    //     total: 18,
    //     colors: [
    //         '#35ffc7',
    //         '#2657ff',
    //         '#ff4afb',
    //         '#2bea00'
    //     ]
    // });

    // third bar, loss all

    // save image
    const buffer = canvas.toBuffer('image/png');
    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
    writeFileSync(join(BASE_DIRNAME, 'temp', 'render-casino.png'), buffer);

    const image = new AttachmentBuilder(join(BASE_DIRNAME, 'temp', 'render-casino.png'));
    interaction.editReply({
        content:``,
        files: [image]
    });
}


function sortPrices(a: number, b: number): -1 | 1 | 0 {
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
}


export const RenderSlashCommand = new SlashCommandBuilder()
    .setName('render')
    .setDescription('Render data')
    .addSubcommand(sc => sc
        .setName('coinflip')
        .setDescription('Render coinflip data')
        .addNumberOption(option => option.setName('length').setDescription('how many of the last coinflips to render').setRequired(false)),
    );