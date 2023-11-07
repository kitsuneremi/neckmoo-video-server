const express = require('express');
const router = express.Router();
const admin = require('../config/firebase/admin');

const bucket = admin.storage().bucket();
const fs = require('fs')

const url = "https://file.erinasaiyukii.com"
const localUrl = "http://192.168.1.187:5001"

function generatePlaylist({ tsFiles, extinfLines }) {
    let playlist = "#EXTM3U\n";
    playlist += "#EXT-X-VERSION:3\n";
    playlist += "#EXT-X-TARGETDURATION:8\n";
    playlist += "#EXT-X-MEDIA-SEQUENCE:0\n";

    tsFiles.forEach((tsFile, index) => {
        playlist += `${extinfLines[index]}\n`;
        playlist += `${tsFile}\n`;
    });

    playlist += "#EXT-X-ENDLIST";

    return playlist;
}

router.get('/:slug/live', async (req, res) => {
    const link = req.params.slug;

    try {
        const m3u8File = fs.readFileSync(`D:/saveFiles/${link}/master.m3u8`, 'utf-8');
        const m3u8Content = m3u8File.toString('utf-8');
        const extinfLines = m3u8Content.match(/#EXTINF:[\d.]+,/g);

        try {
            const tsFiles = []; // Mảng chứa đường dẫn các file .ts
            const files = fs.readdirSync(`D:/saveFiles/${link}`)
            const sortedFiles = files
                .filter(file => file.endsWith('.ts'))
                .sort((a, b) => {
                    const numberA = Number.parseInt(a.split('.')[0]);
                    const numberB = Number.parseInt(b.split('.')[0]);
                    return numberA - numberB; // Sắp xếp tệp theo thứ tự số
                });

            sortedFiles.forEach(file => {
                const tsFilePath = `${url}/api/segment/${link}/${file}`;
                tsFiles.push(tsFilePath);
            });
            const playlist = generatePlaylist({ tsFiles, extinfLines }); // Hàm tạo playlist.m3u8 từ danh sách file .ts
            res.writeHead(200, {
                'Content-Type': 'application/vnd.apple.mpegurl',
            });
            res.end(playlist);
            return;

        } catch (error) {
            return res.send('error')
        }

    } catch (error) {

    }
})

router.get('/:slug/:name', async (req, res, next) => {
    const link = req.params.slug;
    const name = req.params.name;

    console.log('get ' + link + ' file');

    try {
        const m3u8File = fs.readFileSync(`D:/saveFiles/${link}/${name}`, 'utf-8');
        const m3u8Content = m3u8File.toString('utf-8');
        const extinfLines = m3u8Content.match(/#EXTINF:[\d.]+,/g);

        try {
            const tsFiles = []; // Mảng chứa đường dẫn các file .ts
            const files = fs.readdirSync(`D:/saveFiles/${link}`)
            const sortedFiles = files
                .filter(file => file.endsWith('.ts') && file.includes(name.split('.')[0]))
                .sort((a, b) => {
                    const numberA = Number.parseInt(a.split('.')[0].split('p')[1]);
                    const numberB = Number.parseInt(b.split('.')[0].split('p')[1]);
                    return numberA - numberB; // Sắp xếp tệp theo thứ tự số
                });

            sortedFiles.forEach(file => {
                const tsFilePath = `${url}/api/segment/${link}/${file}`;
                tsFiles.push(tsFilePath);
            });
            const playlist = generatePlaylist({ tsFiles, extinfLines }); // Hàm tạo playlist.m3u8 từ danh sách file .ts
            res.writeHead(200, {
                'Content-Type': 'application/vnd.apple.mpegurl',
            });
            res.end(playlist);
            return;

        } catch (error) {
            return res.send('error')
        }
    } catch (error) {
        return res.send('not found')
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