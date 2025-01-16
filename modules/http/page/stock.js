const socket = new WebSocket(`${window.location.toString().startsWith('https')?'wss://bot.lilycatgirl.dev':'ws://localhost:9256'}`);

let LAST_PRICES = {
    neko: 0,
    dogy: 0,
    fxgl: 0
}

socket.onmessage = function(message) {
    console.log(message);

    const data = JSON.parse(message.data);

    switch (data._type) {
        case 'stocks':
            UpdatePriceDisplay(data);
            break;
    }
};

socket.onopen = function(ws) {
    socket.send('stocks latest');
}


function UpdatePriceDisplay(data) {
    sfx_SUUS.play();

    document.querySelector('#neko-price').innerHTML = data.neko;
    document.querySelector('#dogy-price').innerHTML = data.dogy;
    document.querySelector('#fxgl-price').innerHTML = data.fxgl;

    document.title = `${data.neko} | ${data.dogy} | ${data.fxgl} | okabot live stock view`

    document.querySelector('#neko-prev-price').innerHTML = LAST_PRICES.neko;
    document.querySelector('#dogy-prev-price').innerHTML = LAST_PRICES.dogy;
    document.querySelector('#fxgl-prev-price').innerHTML = LAST_PRICES.fxgl;

    LAST_PRICES = {
        neko: data.neko,
        dogy: data.dogy,
        fxgl: data.fxgl
    };
}

const sfx_SUUS = new Audio('/asset/stock-user-up-small.wav');