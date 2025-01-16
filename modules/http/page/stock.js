const socket = new WebSocket(`${window.location.toString().startsWith('https')?'wss://bot.lilycatgirl.dev':'ws://localhost:9256'}`);

let CURRENT_PRICES = {
    neko: 0,
    dogy: 0,
    fxgl: 0
}
let LAST_PRICES = {
    neko: '?',
    dogy: '?',
    fxgl: '?'
}

socket.onmessage = function(message) {
    console.log(message);

    const data = JSON.parse(message.data);

    switch (data._type) {
        case 'stocks':
            UpdatePriceDisplay(data);
            break;

        case 'user_positive': case 'user_negative':
            ManualPriceUpdate(data.stock, data.value);
            break;
    }
};

socket.onopen = function(ws) {
    socket.send('nya~');
    socket.send('stocks latest');
}


function UpdatePriceDisplay(data) {
    sfx_SNU.play();

    document.querySelector('#neko-price').innerHTML = data.neko;
    document.querySelector('#dogy-price').innerHTML = data.dogy;
    document.querySelector('#fxgl-price').innerHTML = data.fxgl;

    document.title = `${data.neko} | ${data.dogy} | ${data.fxgl} | okabot live stock view`

    document.querySelector('#neko-prev-price').innerHTML = 'was ' + LAST_PRICES.neko;
    document.querySelector('#dogy-prev-price').innerHTML = 'was ' + LAST_PRICES.dogy;
    document.querySelector('#fxgl-prev-price').innerHTML = 'was ' + LAST_PRICES.fxgl;

    LAST_PRICES = {
        neko: data.neko,
        dogy: data.dogy,
        fxgl: data.fxgl
    };
}

function ManualPriceUpdate(stock, price) {
    if (stock == 'catgirl') stock = 'neko';
    if (stock == 'doggirl') stock = 'dogy';
    if (stock == 'foxgirl') stock = 'fxgl';

    LAST_PRICES[stock] = parseInt(document.querySelector(`#${stock}-price`).innerHTML);
    document.querySelector(`#${stock}-prev-price`).innerHTML = 'was ' + LAST_PRICES[stock];
    document.querySelector(`#${stock}-price`).innerHTML = price;

    if (price - LAST_PRICES[stock] > 0) {
        if (price - LAST_PRICES[stock] > 10) sfx_SUUL.play(); else sfx_SUUS.play(); 
    } else {
        if (LAST_PRICES[stock] - price > 10) sfx_SUDL.play(); else sfx_SUDS.play(); 
    }
}

const sfx_SUUS = new Audio('/asset/stock-user-up-small.wav');
const sfx_SUUL = new Audio('/asset/stock-user-up-large.wav');
const sfx_SUDS = new Audio('/asset/stock-user-down-small.wav');
const sfx_SUDL = new Audio('/asset/stock-user-down-large.wav');
const sfx_SNU = new Audio('/asset/stock-natural-up.wav');
const sfx_SND = new Audio('/asset/stock-natural-down.wav');