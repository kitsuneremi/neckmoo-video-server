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
const { filePath } = require('../constant')

const createDirectoryIfNotExists = (directoryPath) => {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
        console.log(`Created directory: ${directoryPath}`);
    } else {
        console.log(`Directory already exists: ${directoryPath}`);
    }
};

const channelAvatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const destinationPath = `${filePath}/channel/${req.path.split('/')[3]}/avatar/raw`;
        createDirectoryIfNotExists(destinationPath);
        cb(null, destinationPath);
        // cb(null, `storage`);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const channelAvatarUploader = multer({ storage: channelAvatarStorage });

router.post('/channel/avatar/:id', channelAvatarUploader.single("image"), async (req, res) => {
    if (req.file.mimetype) {
        const path = req.file.path
        const id = req.params.id

        sharp(fs.readFileSync(path).buffer).toFormat("webp").toBuffer()
            .then(outputBuffer => {
                // Lưu buffer mới vào file hoặc làm gì đó với nó
                fs.writeFile(`${filePath}/channel/${id}/avatar/avatar.webp`, outputBuffer, (err) => {
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
    }
})

router.get('/', async (req, res) => {
    const path = req.query.path;
    if (path) {
        try {
            const file = fs.readFileSync(`${filePath}/${path}/avatar.webp`)
            res.end(file)
        } catch (error) {
            res.status(404).send()
        }
    } else {
        return res.status(400).send()
    }
})

module.exports = router