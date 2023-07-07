const express = require('express');
const router = express.Router();
const multer = require('multer');
const { exec } = require('child_process');
const admin = require('../config/firebase/admin')
const fs = require('fs');


const deleteFile = (filePath) => {
    fs.unlink(filePath, (error) => {
        if (error) {
            console.error(`Error deleting file: ${filePath}`);
        } else {
            console.log(`Deleted file: ${filePath}`);
        }
    });
};


const createDirectoryIfNotExists = (directoryPath) => {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
        console.log(`Created directory: ${directoryPath}`);
    } else {
        console.log(`Directory already exists: ${directoryPath}`);
    }
};

const deleteDirectoryRecursive = (directoryPath) => {
    if (fs.existsSync(directoryPath)) {
        fs.readdirSync(directoryPath).forEach((file) => {
            const filePath = `${directoryPath}/${file}`;

            if (fs.lstatSync(filePath).isDirectory()) {
                deleteDirectoryRecursive(filePath); // Gọi đệ quy nếu tìm thấy thư mục
            } else {
                deleteFile(filePath); // Xóa tệp nếu tìm thấy
            }
        });

        fs.rmdirSync(directoryPath); // Xóa thư mục sau khi xóa toàn bộ các tệp
        console.log(`Deleted directory: ${directoryPath}`);
    }
};

const VideoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "Storage")
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
})

const upload = multer({ storage: VideoStorage });
router.post('/video', upload.single("video"), async (req, res, next) => {
    try {
        const videoPath = req.file.path;
        const namex = req.file.originalname.split('.')[0]
        const lowResolutionPaths = await processVideo({ path: videoPath, oriname: namex });
        await uploadToFirebase({ paths: lowResolutionPaths, link: namex });
        res.send('Upload and processing complete');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred');
    }
});

async function processVideo({ path, oriname }) {
    const lowResolutionPaths = [];

    const resolutions = [
        { name: '1080p', scale: 1080 },
        { name: '720p', scale: 720 }
    ];
    const link = oriname.split('.')[0];

    for (const { name, scale } of resolutions) {
        createDirectoryIfNotExists(`output/${link}`);
        const outputPath = `output/${link}/${name}.m3u8`;
        const childPath = `output/${link}/${name}%03d.ts`;
        const portPath = `output/${link}`;

        const command = `ffmpeg -i ${path} \\
        -preset veryslow -g 48 -crf 17 -sc_threshold 0 \\
        -map 0:0 -map 0:1 -c:v h264 -vf scale=-1:${scale} \\
        -c:a copy -master_pl_name ${name}.m3u8 \\
        -hls_time 10 -hls_list_size 0 \\
        -hls_segment_filename "${childPath}" \\
        "${outputPath}"`;

        await executeCommand(command);

        // Tạo danh sách các tệp .ts trong thư mục đích và thêm chúng vào mảng lowResolutionPaths
        const ListFile = fs.readdirSync(`output/${link}`);
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

async function uploadToFirebase({ paths, link }) {
    const bucket = admin.storage().bucket();
    for (const path of paths) {

        const destination = `video/videos/${link}/${path.split('/').slice(-1)[0]}`;
        await bucket.upload(path, {
            destination,
            gzip: true,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });
    }
    deleteDirectoryRecursive(`output/${link}`);
    deleteDirectoryRecursive('Storage/');
}

module.exports = router;
