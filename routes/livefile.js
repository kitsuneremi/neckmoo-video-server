const express = require('express');
const router = express.Router();
const fs = require('fs');

router.get('/:name', async (req, res) => {
    const name = req.params.name
    const link = req.params.link;
    const buffer = fs.createReadStream(`D:/live/${name}`);
    buffer.pipe(res)
})


module.exports = router