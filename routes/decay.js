const express = require('express');
const router = express.Router();
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const { ffprobe } = require('fluent-ffmpeg');

const createDirectoryIfNotExists = (directoryPath) => {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
        console.log(`Created directory: ${directoryPath}`);
    } else {
        console.log(`Directory already exists: ${directoryPath}`);
    }
};


const VideoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "storage")
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
})

function getVideoResolution(videoPath) {
    return new Promise((resolve, reject) => {
        ffprobe(videoPath, (err, info) => {
            if (err) {
                reject(err);
            } else {
                resolve({ width: info.streams[0].width, height: info.streams[0].height });
            }
        });
    });
}

const upload = multer({ storage: VideoStorage });
router.post('/video', upload.single("video"), async (req, res, next) => {
    try {
        console.log("start processing")
        const videoPath = req.file.path;
        const namex = req.body.link
        getVideoResolution(videoPath).then((size) => {
            console.log(size)
            processVideo({ path: videoPath, oriname: namex, outputDirectory: 'F:/saveFiles', size: size }).then(() => {
                res.send('Upload and processing complete');
            }).catch((error) => { res.send(error) });
        })

        return new Response(JSON.stringify({ 'message': 'upload complete' }))

    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred');
    }
});

async function processVideo({ path, oriname, outputDirectory, size }) {
    const resolutions = [
        { name: `${size.height}p`, scale: { width: size.width, height: size.height } },
        { name: `${size.height * (2 / 3)}p`, scale: { width: size.width * (2 / 3), height: size.height * (2 / 3) } },
    ];

    const link = oriname.split('.')[0];
    const playlistPaths = [];

    for (const { name, scale } of resolutions) {
        createDirectoryIfNotExists(`${outputDirectory}/${link}`);
        const outputPath = `${outputDirectory}/${link}/${name}.m3u8`;
        const childPath = `${outputDirectory}/${link}/${name}%03d.ts`;
        const portPath = `${outputDirectory}/${link}`;

        const command = `ffmpeg -i ${path} ` +
            `-preset veryslow -g 48 -crf 20 ` +
            `-map 0:0 -map 0:1 -c:v h264 -vf scale=${scale.width}:${scale.height} ` +
            `-c:a copy -hls_time 3 -hls_list_size 0 ` +
            `-hls_segment_filename "${childPath}" ` +
            `"${outputPath}"`;

        await executeCommand(command);
        playlistPaths.push({ name, path: name + '.m3u8' });
    }

    // Tạo tệp .m3u8 tổng
    const masterPlaylistPath = `${outputDirectory}/${link}/master.m3u8`;
    const playlistEntries = playlistPaths.map(entry => `#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=${entry.name}\n${entry.path}`).join('\n');
    fs.writeFileSync(masterPlaylistPath, playlistEntries);

    return masterPlaylistPath;
}


function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}


module.exports = router;
