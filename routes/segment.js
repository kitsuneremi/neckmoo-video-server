const express = require('express');
const router = express.Router();
const admin = require('../config/firebase/admin');

router.get('/:link/:name', async (req, res) => {
    const name = req.params.name
    const link = req.params.link;
    const [file] = await admin.storage().bucket().file(`video/videos/${link}/${name}`).download();
    res.end(file)
})


module.exports = router