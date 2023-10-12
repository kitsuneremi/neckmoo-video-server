const http = require('http');
const express = require('express');
const route = require('../../routes/index');
const app = express();
const cors = require('cors');
const { log } = require('console');

app.use(
    express.urlencoded({
        extended: true,
    })
);

app.use(cors());
app.use(express.json());

// Đưa các middleware và route vào một instance của http.Server
const server = http.createServer(app);

server.listen(5001, () => {
    log('server started');
});

// router
route(app);
