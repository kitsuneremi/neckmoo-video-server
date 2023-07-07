const Decay = require('./up.js');
const Merge = require('./file.js');
const Segment = require('./segment.js');

function route(app) {
    app.use('/api/decay', Decay);
    app.use('/api/merge', Merge);
    app.use('/api/segment', Segment)
}

module.exports = route;
