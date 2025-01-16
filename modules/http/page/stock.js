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
            UpdatePriceDisplay(data, false, data._type);
            break;

        case 'user_positive': case 'user_negative':
            ManualPriceUpdate(data.stock, data.value);
            break;

        case 'event_positive': case 'event_negative':
            UpdatePriceDisplay(data, true, data._type);
            break;
    }
};

socket.onopen = function(ws) {
    socket.send('nya~');
    socket.send('stocks latest');
}


function UpdatePriceDisplay(data, is_event, _type) {
    document.querySelector('#neko-price').innerHTML = data.neko;
    document.querySelector('#dogy-price').innerHTML = data.dogy;
    document.querySelector('#fxgl-price').innerHTML = data.fxgl;

    document.title = `${data.neko} | ${data.dogy} | ${data.fxgl} | okabot live stock view`

    // check for spikes
    if (
        Math.abs(LAST_PRICES.neko - data.neko) >= 21 ||
        Math.abs(LAST_PRICES.dogy - data.dogy) >= 11 ||
        Math.abs(LAST_PRICES.fxgl - data.fxgl) >= 2 &&
        !is_event
    ) {
        // it is a spike in some way, which way?
        // any spike should play the noise
        const positive =
            LAST_PRICES.neko - data.neko >= 0 ||
            LAST_PRICES.dogy - data.dogy >= 0 ||
            LAST_PRICES.fxgl - data.fxgl >= 0;
            
        if (!is_event) {
            console.log(`spike is ${positive?'posi':'nega'}tive`);
            if (positive) sfx_SSU.play(); else sfx_SSD.play();
        }
    } else {
        // calculate whether its a negative or positive change
        const positive_neko = LAST_PRICES.neko - data.neko >= 0;
        const positive_dogy = LAST_PRICES.dogy - data.dogy >= 0;
        const positive_fxgl = LAST_PRICES.fxgl - data.fxgl >= 0;

        const positive = positive_neko + positive_dogy + positive_fxgl >= 2;
        if (!is_event) {
            console.log(`change is ${positive?'posi':'nega'}tive`);
            if (positive) sfx_SNU.play(); else sfx_SND.play();
        }
    }

    if (is_event) {
        const positive = _type == 'event_positive';
        console.log(`event is ${positive?'posi':'nega'}tive`);
        if (positive) sfx_SEP.play(); else sfx_SEN.play();

        new Notification(`${positive?'📈':'📉'} STOCK MARKET NEWS`, {body:data.event,icon:''});
    }

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
        if (price - LAST_PRICES[stock] > 25) sfx_SUUL.play(); else sfx_SUUS.play(); 
    } else {
        if (LAST_PRICES[stock] - price > 25) sfx_SUDL.play(); else sfx_SUDS.play(); 
    }
}

const sfx_SUUS = new Audio('/asset/stock-user-up-small.wav');
const sfx_SUUL = new Audio('/asset/stock-user-up-large.wav');
const sfx_SUDS = new Audio('/asset/stock-user-down-small.wav');
const sfx_SUDL = new Audio('/asset/stock-user-down-large.wav');
const sfx_SNU = new Audio('/asset/stock-natural-up.wav');
const sfx_SND = new Audio('/asset/stock-natural-down.wav');
const sfx_SSU = new Audio('/asset/stock-spike-up.wav');
const sfx_SSD = new Audio('/asset/stock-spike-down.wav');
const sfx_SEP = new Audio('/asset/stock-event-positive.wav');
const sfx_SEN = new Audio('/asset/stock-event-negative.wav');

if (Notification.permission == 'default') {
    Notification.requestPermission();
}