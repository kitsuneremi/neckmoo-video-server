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
    return playlist;
}

router.get('/:link', async (req, res) => {
    const link = req.params.link

    try {
        // Mảng chứa đường dẫn các file .ts
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
        });
        const tsFiles = [];

        const m3u8File = await fs.readFileSync(`D:/live/${link}/index.m3u8`, 'utf-8');
        const m3u8Content = m3u8File.toString('utf-8');
        const extinfLines = m3u8Content.match(/#EXTINF:[\d.]+,/g);

        const p = fs.readdirSync(`D:/live/${link}`)
        const files = p.filter(file => {
            return file.endsWith(".ts")
        })

        console.log('load live ' + link)

        const sortedFiles = files
            .sort((a, b) => {
                const numberA = Number.parseInt(a.split('.')[0]);
                const numberB = Number.parseInt(b.split('.')[0]);
                return numberA - numberB; // Sắp xếp tệp theo thứ tự số
            });

        sortedFiles.pop();
        sortedFiles.forEach(file => {
            const tsFilePath = `${url}/api/livefile/${link}/${file}`
            tsFiles.push(tsFilePath)
        });


        const playlist = generatePlaylist({ tsFiles, extinfLines });
        console.log(playlist)
        res.end(playlist)


        // setInterval(() => {
        //     try {
        //         if (fs.existsSync(`F:/live/${link}-${current + 1}.ts`)) {
        //             const nextFile = fs.readFileSync(`F:/live/${link}-${current + 1}.ts`);
        //             res.write(`http://118.68.229.104:5001/api/livefile/${nextFile}`)
        //             current++;
        //         }
        //     } catch (error) {
        //         console.log(error)
        //     }
        // }, 1000)
        return;

    } catch (error) {
        return res.status(404)
    }
});

module.exports = router;