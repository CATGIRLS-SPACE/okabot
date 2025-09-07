import { server } from "./server";


server.get('/ai', (req, res) => {
    res.render('gemini');
});