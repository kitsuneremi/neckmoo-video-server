const express = require('express');
const router = express.Router();
const fs = require('fs');
const { filePath } = require('../constant');

router.get('/:link/:name', async (req, res) => {
    const name = req.params.name
    const link = req.params.link;
    const buffer = fs.createReadStream(`${filePath}/live/${link}/${name}`);
    buffer.pipe(res)
})


module.exports = router