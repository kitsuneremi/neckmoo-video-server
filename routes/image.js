const sharp = require('sharp');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const { ffprobe } = require('fluent-ffmpeg');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { ref, uploadBytes } = require('firebase/storage');
const storage = require('../config/firebase/firebase')
const { PrismaClient } = require("@prisma/client")
const client = new PrismaClient();


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
        cb(null, "C:/storage/raw");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: VideoStorage });

router.post('/imageprocess', upload.single("image"), async (req, res) => {
    const rawBuffer = req.file.buffer
    const type = req.body.type
    const name = req.body.path
    sharp(rawBuffer).toFormat("webp").toBuffer()
        .then(outputBuffer => {
            // Lưu buffer mới vào file hoặc làm gì đó với nó
            fs.writeFile(`C:/storage/image/${type}/${name}.webp`, outputBuffer, (err) => {
                if (err) {
                    return res.status(500).send('Error saving WebP file.');
                }
                res.send('WebP file saved successfully.');
            });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error converting image to WebP.');
        });
})

router.get('/image', async (req, res) => {
    const path = req.params.path;
    if (path) {
        try {
            const file = fs.readFileSync(path)
            res.end(file)
        } catch (error) {
            res.status(404).send()
        }
    } else {
        return res.status(400).send()
    }
})
module.exports = router