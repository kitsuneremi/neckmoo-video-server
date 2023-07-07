const express = require('express');
const router = express.Router();
const admin = require('../config/firebase/admin');
const axios = require('axios');
const { ref, getDownloadURL } = require("firebase/storage");
const { storage } = require("../config/firebase/firebase");

const bucket = admin.storage().bucket();


function generatePlaylist(tsFiles) {
    let playlist = "#EXTM3U\n";
    playlist += "#EXT-X-VERSION:3\n";
    playlist += "#EXT-X-TARGETDURATION:11\n";
    playlist += "#EXT-X-MEDIA-SEQUENCE:0\n";

    tsFiles.forEach((tsFile, index) => {
        playlist += `#EXTINF:12.000000,\n`;
        playlist += `${tsFile}\n`;
    });

    playlist += "#EXT-X-ENDLIST";

    return playlist;
}

router.get('/:slug/playlist.m3u8', async (req, res, next) => {
    const link = req.params.slug;
    const filePath = `video/videos/${link}/1080p.m3u8`;

    // try {
    //     const file = bucket.file(filePath);
    //     const fileExists = await file.exists();

    //     if (!fileExists[0]) {
    //         res.status(404).send('File not found');
    //         return;
    //     }

    //     const [metadata] = await file.getMetadata();
    //     const fileSize = metadata.size;
    //     const range = req.headers.range;

    //     if (range) {
    //         const [start, end] = range.replace(/bytes=/, '').split('-');
    //         const chunkSize = end ? parseInt(end) - parseInt(start) + 1 : fileSize;
    //         const options = {
    //             start: parseInt(start),
    //             end: parseInt(end),
    //         };

    //         const fileStream = file.createReadStream(options);
    //         const head = {
    //             'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    //             'Accept-Ranges': 'bytes',
    //             // 'Content-Length': chunkSize,
    //             'Content-Type': 'video/mp2t',
    //         };

    //         res.writeHead(206, head);
    //         fileStream.pipe(res);
    //     } else {
    //         const head = {
    //             // 'Content-Length': fileSize,
    //             'Content-Type': 'video/mp2t',
    //         };
    //         res.writeHead(200, head);
    //         file.createReadStream().pipe(res);
    //     }

    // } catch (error) {
    //     console.error('Error:', error);
    //     res.status(500).send('Internal Server Error');
    // }
    const m3u8File = await admin.storage().bucket().file(`video/videos/${link}/1080p.m3u8`).download();
    const m3u8Content = m3u8File.toString('utf-8');
    if (req.originalUrl.includes("playlist.m3u8")) {
        const tsFiles = []; // Mảng chứa đường dẫn các file .ts
        const files = await bucket.getFiles({
            prefix: `video/videos/${link}/`,
            delimiter: '/'
        });

        files[0].forEach(file => {
            if (file.name.endsWith(".ts")) {
                const fileName = file.name.split(`${link}/`)[1]

                // const tsFilePath = `https://storage.googleapis.com/download/storage/v1/b/${admin.storage().bucket().name}/o/video%2Fvideos%2F${link}%2F${fileName}?alt=media`;
                // const tsFilePath = `https://firebasestorage.googleapis.com/v0/b/carymei.appspot.com/o/video%2Fvideos%2F${link}%2F${fileName}?alt=media`
                const tsFilePath = `http://localhost:5000/api/segment/${link}/${fileName}`
                tsFiles.push(tsFilePath)

            }
        });

        const playlist = generatePlaylist(tsFiles); // Hàm tạo playlist.m3u8 từ danh sách file .ts

        res.writeHead(200, {
            'Content-Type': 'application/vnd.apple.mpegurl',
        });
        res.end(playlist);
        return;
    }

});

module.exports = router;


// try {
//     const link = req.params.slug
//     // Lấy đường dẫn tệp tin .m3u8 từ Firebase Storage
//     const m3u8File = await admin.storage().bucket().file(`video/videos/${link}/1080p.m3u8`).download();
//     const m3u8Content = m3u8File.toString('utf-8');
//     // Trích xuất danh sách các tệp tin .ts từ tệp tin .m3u8
//     const tsFiles = m3u8Content.match(/(\/?(?:[\w-]+\/)*\w+\.ts)/g);

//     // Tải và gom nhóm các tệp tin .ts thành một đoạn URL
//     const tsFilePromises = tsFiles.map(tsFile => {
//         // const fileURL = `https://storage.googleapis.com/${admin.storage().bucket().name}/video/videos/${link}/${tsFile}`;
//         const fileURL = `https://storage.googleapis.com/download/storage/v1/b//b/${admin.storage().bucket().name}/o/video%2Fvideos%2F${link}%2F${tsFile}`
//         return axios.get(fileURL, { responseType: 'arraybuffer' });

//     });
//     const tsFileResponses = await Promise.all(tsFilePromises);
//     const tsSegments = tsFileResponses.map(response => response.data);
//     // Gửi tệp tin .m3u8 và các tệp tin .ts đến client
//     res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
//     res.write(m3u8Content);
//     tsSegments.forEach(segment => res.write(segment));
//     res.end();
// } catch (error) {
//     console.error('Error:', error);
//     res.status(500).send('Internal Server Error');
// }