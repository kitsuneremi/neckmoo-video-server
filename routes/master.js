const express = require('express');
const router = express.Router();
const admin = require('../config/firebase/admin');
const bucket = admin.storage().bucket();
const fs = require('fs');

const url = "https://file.erinasaiyukii.com"
const localUrl = "http://192.168.1.187:5001"

router.get('/:slug', async (req, res, next) => {
    const link = req.params.slug;
    console.log('get ' + link + ' master file');
    // Đọc nội dung tệp master.m3u8
    const m3u8FilePath = `C:/saveFiles/${link}/master.m3u8`;
    const m3u8Content = fs.readFileSync(m3u8FilePath, 'utf-8');
    const lines = m3u8Content.split('\n');

    // Chỉnh sửa nội dung các dòng có chứa ".m3u8"
    const modifiedLines = lines.map(line => {
        if (line.endsWith('.m3u8')) {
            // Chuyển đổi tên file .m3u8 thành đường dẫn tương ứng
            const fileName = line.trim();
            const m3u8Path = `${url}/api/merge/${link}/${fileName}`;
            // const m3u8Path = `http://localhost:5001/api/merge/${link}/${fileName}`;
            return m3u8Path;
        } else {
            return line;
        }
    });

    // Ghi lại nội dung đã chỉnh sửa vào tệp master.m3u8
    const modifiedM3u8Content = modifiedLines.join('\n');
    // Trả về nội dung đã chỉnh sửa
    res.writeHead(200, {
        'Content-Type': 'application/vnd.apple.mpegurl',
    });
    res.end(modifiedM3u8Content);
});

module.exports = router;
