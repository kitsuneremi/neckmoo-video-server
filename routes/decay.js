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
        cb(null, "storage");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

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
const maxConcurrentFFMpegJobs = 2; // Số lượng tác vụ ffmpeg được thực hiện đồng thời
const ffmpegQueue = []; // Hàng đợi chứa video cần xử lý

function processNextVideoInQueue() {
    if (ffmpegQueue.length > 0) {
        const videoInfo = ffmpegQueue.shift();
        const worker = new Worker(__filename, { workerData: videoInfo });

        worker.on('message', async (result) => {
            console.log('process done, now create data');
            await client.videos.create({
                data: {
                    link: videoInfo.link,
                    des: videoInfo.des,
                    channelId: Number.parseInt(videoInfo.channelId),
                    title: videoInfo.title,
                    status: 0
                }
            });

            const test = await client.subcribes.findMany({
                where: {
                    channelId: Number.parseInt(videoInfo.channelId)
                }
            });

            for (const element of test) {
                const channel = await client.channels.findUnique({
                    where: {
                        id: Number.parseInt(videoInfo.channelId)
                    }
                });

                if (channel) {
                    client.notifications.create({
                        data: {
                            accountId: element.accountId,
                            channelId: Number.parseInt(videoInfo.channelId),
                            content: `video ${videoInfo.title} đã được tải lên`,
                            title: "Video mới được tải lên thành công",
                        }
                    }).then(r => { console.log(`created notification for subscriber ${r.accountId}`) });
                }
            }

            // Tiến hành xử lý video tiếp theo trong hàng đợi
            processNextVideoInQueue();
        });
    }
}

router.post('/video', upload.single("video"), async (req, res) => {
    try {
        console.log("start processing");
        const videoPath = req.file.path;
        const link = req.body.link;
        const des = req.body.des;
        const channelId = req.body.channelId;
        const title = req.body.title;

        const size = await getVideoResolution(videoPath);

        ffmpegQueue.push({ path: videoPath, oriname: link, outputDirectory: 'C:/saveFiles', size, link, des, channelId, title });

        // Kiểm tra xem số lượng công việc ffmpeg đang chạy có vượt quá giới hạn không
        if (ffmpegQueue.length <= maxConcurrentFFMpegJobs) {
            // Nếu không, tiến hành xử lý video
            processNextVideoInQueue();
        }

        // Trả về kết quả cho người dùng
        res.status(102).send(JSON.stringify({ title: 'Video mới đã được tải lên server thành công, hãy kiên nhẫn', content: `video ${title} đã hoàn tất`, 'status': 201 }));
    } catch (error) {
        console.error(error);
        return;
    }
});

async function processVideo({ path, oriname, outputDirectory, size }) {
    // Các bước xử lý video giữ nguyên
    let resolutions = [];
    if (size.height >= 1080) {
        resolutions = [
            { name: `${size.height.toFixed(0)}p`, scale: { width: size.width, height: size.height } },
            { name: `${(size.height * 2 / 3).toFixed(0)}p`, scale: { width: Number.parseInt((size.width * 2 / 3).toFixed(0)), height: Number.parseInt((size.height * 2 / 3).toFixed(0)) } },
            { name: `${(size.height * 4 / 9).toFixed(0)}p`, scale: { width: Number.parseInt((size.width * 4 / 9).toFixed(0)), height: Number.parseInt((size.height * 4 / 9).toFixed(0)) } },
        ];
    } else if (size.height >= 720) {
        resolutions = [
            { name: `${size.height.toFixed(0)}p`, scale: { width: size.width, height: size.height } },
            { name: `${(size.height * 2 / 3).toFixed(0)}p`, scale: { width: Number.parseInt((size.width * 2 / 3).toFixed(0)), height: Number.parseInt((size.height * 2 / 3).toFixed(0)) } },
        ];
    }


    const link = oriname.split('.')[0];
    const playlistPaths = [];
    createDirectoryIfNotExists(`${outputDirectory}/${link}`);

    for (const { name, scale } of resolutions) {
        const outputPath = `${outputDirectory}/${link}/${name}.m3u8`;
        const childPath = `${outputDirectory}/${link}/${name}%03d.ts`;

        let fixedHeight = Math.floor(scale.height / 2) * 2;

        const command = `ffmpeg -i ${path} ` +
            `-preset veryslow -g 48 -crf 20 -b:v 10M ` +
            `-map 0:0 -map 0:1 -c:v h264 -vf scale=trunc(oh*a/2)*2:${fixedHeight} ` +
            `-c:a copy -hls_time 3 -hls_list_size 0 ` +
            `-hls_segment_filename "${childPath}" ` +
            `"${outputPath}"`;

        await executeCommand(command);
        
        playlistPaths.push({ name, path: name + '.m3u8' });
    }

    const masterPlaylistPath = `${outputDirectory}/${link}/master.m3u8`;
    const playlistEntries = playlistPaths.map((entry, index) => `#EXT-X-STREAM-INF:BANDWIDTH=10000,HEIGHT=${resolutions[index].scale.height},WIDTH=${resolutions[index].scale.width},NAME=${entry.name},RESOLUTION=${resolutions[index].scale.width}x${resolutions[index].scale.height}\n${entry.path}`).join('\n');
    let cc = '#EXTM3U\n#EXT-X-VERSION:3\n' + playlistEntries;
    fs.writeFileSync(masterPlaylistPath, cc);
    return masterPlaylistPath;
}

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(null);
            }
        });
    });
}

if (!isMainThread) {
    const { path, oriname, outputDirectory, size } = workerData;
    processVideo({ path, oriname, outputDirectory, size }).then((result) => {
        parentPort.postMessage(result);
    });
}

module.exports = router;
