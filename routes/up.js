const express = require('express');
const router = express.Router();
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');

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

const upload = multer({ storage: VideoStorage });
router.post('/video', upload.single("video"), async (req, res, next) => {
    try {
        console.log("start processing")
        const videoPath = req.file.path;
        const namex = req.body.link
        await processVideo({ path: videoPath, oriname: namex, outputDirectory: 'F:/saveFiles' });
        res.send('Upload and processing complete');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred');
    }
});

async function processVideo({ path, oriname, outputDirectory }) {
    const lowResolutionPaths = [];

    const resolutions = [
        { name: '1080p', scale: 1080 },
        { name: '720p', scale: 720 }
    ];
    const link = oriname.split('.')[0];

    for (const { name, scale } of resolutions) {
        createDirectoryIfNotExists(`${outputDirectory}/${link}`);
        const outputPath = `${outputDirectory}/${link}/${name}.m3u8`;
        const childPath = `${outputDirectory}/${link}/${name}%03d.ts`;
        const portPath = `${outputDirectory}/${link}`;

        const command = `ffmpeg -i ${path} ` +
            `-preset veryslow -g 48 -crf 17 -sc_threshold 0 ` +
            `-map 0:0 -map 0:1 -c:v h264 -vf scale=-1:${scale} ` +
            `-c:a copy -master_pl_name ${name}.m3u8 ` +
            `-hls_time 3 -hls_list_size 0 ` +
            `-hls_segment_filename "${childPath}" ` +
            `"${outputPath}"`;

        await executeCommand(command);

        // Tạo danh sách các tệp .ts trong thư mục đích và thêm chúng vào mảng lowResolutionPaths
        const ListFile = fs.readdirSync(`${outputDirectory}/${link}`);
        const tsPaths = ListFile.map(file => `${portPath}/${file}`);
        lowResolutionPaths.push(...tsPaths);
    }

    return lowResolutionPaths;
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
