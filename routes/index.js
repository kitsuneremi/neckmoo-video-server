const Decay = require('./decay.js');
const Merge = require('./file.js');
const VideoFile = require('./videoFile.js');
const LiveFile = require('./livefile.js');
const Live = require('./live.js');
const Master = require('./master.js');
const os = require('os');

function route(app) {
    app.use('/api/decay', Decay);
    app.use('/api/merge', Merge);
    app.use('/api/segment', VideoFile)
    app.use('/api/livefile', LiveFile)
    app.use('/api/live', Live)
    app.use('/api/video', Master)
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
