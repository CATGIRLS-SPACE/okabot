import { createCanvas } from "canvas";
import { AttachmentBuilder, ChatInputCommandInteraction } from "discord.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { BASE_DIRNAME, CoinFloats } from "../..";
import { GetLastNumValues, Stocks } from "../okash/stock";


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


export async function GenerateCoinflipRecentsGraph(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    
}


function randomColor(): string {
    return `rgb(25, ${Math.round(Math.random() * 155)+100}, 50);`
}


export async function RenderStockDisplay(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const width = 550, height = 125;
    const canvas = createCanvas(width,height);
    const ctx = canvas.getContext('2d');

    const values = GetLastNumValues(interaction.options.getString('stock', true) as Stocks, 100);
    const sorted_values = GetLastNumValues(interaction.options.getString('stock', true) as Stocks, 100).sort(sortPrices);

    // bg
    ctx.fillStyle = '#2b2d42';
    ctx.fillRect(0,0,width,height);

    ctx.font = '14px monospace';

    // graph
    ctx.fillStyle = '#ddd';
    ctx.fillRect(45, 5, width - 50, height - 10);
    ctx.strokeStyle = '#bfbfbf';
    ctx.lineWidth = 2;
    ctx.strokeRect(45, 5, width - 50, height - 10);

    const graph_width = width - 50;
    const graph_height = height - 10;

    // we want nine lines for horizontal
    ctx.strokeStyle = '#cfcfcf';
    for (let i = 1; i < 10; i++) {
        ctx.strokeRect(i * (graph_width / 10) + 45, 5, 1, graph_height);
    }

    const graph_max = Math.round(sorted_values[0]);
    const graph_min = Math.round(sorted_values.at(-1)!);
    const graph_line_limit_top = graph_min + (((graph_max - graph_min) / 3) * 2)
    const graph_line_limit_mid = graph_min + ((graph_max - graph_min) / 3);
    ctx.fillStyle = '#eee';

    // move the min/max
    if (values.at(-1)! > graph_line_limit_top) {
        // only bottom
        ctx.fillText(graph_max.toString(), 4, height - 24);
        ctx.fillText(graph_min.toString(), 4, height - 8);
    } else if (values.at(-1)! < graph_line_limit_mid) {
        // only top
        ctx.fillText(graph_max.toString(), 4, 14);
        ctx.fillText(graph_min.toString(), 4, 34);
    } else {
        // top and bottom
        ctx.fillText(graph_max.toString(), 4, 14);
        ctx.fillText(graph_min.toString(), 4, height - 8);
    }
    
    const total_range = graph_max - graph_min;

    const total_points = values.length;
    const x_spacing = (545 - 45) / (total_points - 1); // Evenly space points

    let y2 = 0;

    for (let i = 0; i < total_points - 1; i++) {
        const target_difference = values[i] - graph_min;
        const next_difference = values[i + 1] - graph_min;

        // Keep the 5px margin in Y calculation
        const y_min = 5;
        const y_max = graph_height - 5;
        const y1 = y_max - ((target_difference / total_range) * (y_max - y_min));
        y2 = y_max - ((next_difference / total_range) * (y_max - y_min));

        // Reverse the x calculation to go from right to left
        const x1 = 45 + i * x_spacing;
        const x2 = 45 + (i + 1) * x_spacing;

        // Determine trend color
        const trend_pos = values[i + 1] >= values[i];
        ctx.strokeStyle = trend_pos ? '#080' : '#f00';
        ctx.lineWidth = 3;

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke(); // Apply the stroke immediately

        // console.log(values[i], x1, y1, "->", values[i + 1], x2, y2, "Color:", ctx.strokeStyle);
    }

    // render current
    ctx.fillStyle = '#00bdb0';
    ctx.fillRect(45, y2, 500, 1);
    ctx.fillText(Math.round(values.at(-1)!).toString(), 4, y2 + 8);

    // save image
    const buffer = canvas.toBuffer('image/png');
    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
    writeFileSync(join(BASE_DIRNAME, 'temp', 'render-stock.png'), buffer);
    
    const image = new AttachmentBuilder(join(BASE_DIRNAME, 'temp', 'render-stock.png'));
    interaction.editReply({
        content:`Stock history for ${interaction.options.getString('stock', true)}`,
        files: [image]
    });
}

function sortPrices(a: number, b: number): -1 | 1 | 0 {
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
}