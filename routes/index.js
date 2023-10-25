const Decay = require('./decay.ts');
const Merge = require('./file.js');
const VideoFile = require('./videoFile.js');
const LiveFile = require('./livefile.js');
const Live = require('./live.js');
const Master = require('./master.js');
const os = require('os');
const semaphore = require('semaphore')(200);
function route(app) {
    app.use('/api/decay', Decay);
    app.use('/api/merge', Merge);
    app.use('/api/segment', VideoFile)
    app.use('/api/livefile', LiveFile)
    app.use('/api/live', Live)
    app.use('/api/video', Master)
    app.post('/api/test', (req, res) => {
        console.log('req rcv')
        setTimeout(() => {
            res.send('ok')
        }, 10000)

    })
}

module.exports = route;
