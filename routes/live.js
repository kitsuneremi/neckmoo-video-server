const express = require('express');
const router = express.Router();
const admin = require('../config/firebase/admin');

const bucket = admin.storage().bucket();
const fs = require('fs')

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

router.get('/:link', async (req, res, next) => {
    const link = req.params.link

    try {
        // Mảng chứa đường dẫn các file .ts
        res.writeHead(200, {
            'Content-Type': 'application/octet-stream',
        });
        const tsFiles = [];

        const m3u8File = await fs.readFileSync(`F:/live/${link}.m3u8`, 'utf-8');
        const m3u8Content = m3u8File.toString('utf-8');
        const extinfLines = m3u8Content.match(/#EXTINF:[\d.]+,/g);

        const p = fs.readdirSync(`F:/live`)
        const files = p.filter(file => {
            return file.includes(link) && file.endsWith(".ts")
        })

        console.log('load live ' + link)

        files.sort((a, b) => {
            return a.split('.')[0].split('-')[1] > b.split('.')[0].split('-')[1]
        })
        files.forEach(file => {
            const tsFilePath = `https://live.erinasaiyukii.com/api/livefile/${file}`
            tsFiles.push(tsFilePath)
        });

        
        const playlist = generatePlaylist({ tsFiles, extinfLines });
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