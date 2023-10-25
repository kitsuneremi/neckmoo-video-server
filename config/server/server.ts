import { PrismaClient } from "@prisma/client";
const http = require('http');
const expresss = require('express');
const route = require('../../routes/index');
const app = expresss();
const cors = require('cors');

app.use(
    expresss.urlencoded({
        extended: true,
    })
);

app.use(cors());
app.use(expresss.json());

// Đưa các middleware và route vào một instance của http.Server
const server = http.createServer(app);

server.listen(5001, () => {
    console.log('server started');
}); 

// router
route(app);
