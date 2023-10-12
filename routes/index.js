const Decay = require('./up.js');
const Merge = require('./file.js');
const Segment = require('./segment.js');
const os = require('os');

function route(app) {
    app.use('/api/decay', Decay);
    app.use('/api/merge', Merge);
    app.use('/api/segment', Segment)
    app.post('/api/event', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        setTimeout(() => {
            res.send('data');
        }, 5000)

        res.on('close', () => {
            console.log('Kết nối đã đóng');
        });
    });

}

module.exports = route;
