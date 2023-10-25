import { PrismaClient } from "@prisma/client";
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const { ffprobe } = require('fluent-ffmpeg');
const { ref, uploadBytes } = require('firebase/storage');
const storage = require('../config/firebase/firebase')

const client = new PrismaClient();

const createDirectoryIfNotExists = (directoryPath: string) => {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
        console.log(`Created directory: ${directoryPath}`);
    } else {
        console.log(`Directory already exists: ${directoryPath}`);
    }
};


const VideoStorage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        cb(null, "storage")
    },
    filename: (req: any, file: any, cb: any) => {
        cb(null, file.originalname);
    }
})

function getVideoResolution(videoPath: string) {
    return new Promise((resolve, reject) => {
        ffprobe(videoPath, (err: any, info: any) => {
            if (err) {
                reject(err);
            } else {
                resolve({ width: info.streams[0].width, height: info.streams[0].height });
            }
        });
    });
}

const upload = multer({ storage: VideoStorage });
router.post('/video', upload.single("video"), async (req: any, res: any) => {
    try {
        console.log("start processing")
        const videoPath = req.file.path;
        const link = req.body.link
        const des = req.body.des;
        const channelId = req.body.channelId;
        const title = req.body.title;

        await getVideoResolution(videoPath).then((size: any) => {
            processVideo({ path: videoPath, oriname: link, outputDirectory: 'F:/saveFiles', size: size }).then((r) => {
                console.log('process done, now create data')
            })
                .catch((error) => { console.log(error) });
        })
        await client.videos.create({
            data: {
                link: link,
                des: des,
                channelId: Number.parseInt(channelId),
                title: title,
                status: 0
            }
        })

        const test = await client.subcribes.findMany({
            where: {
                channelId: Number.parseInt(channelId)
            }
        })

        test.forEach(async (element: any) => {
            const channel = await client.channels.findUnique({
                where: {
                    id: Number.parseInt(channelId)
                }
            })
            if (channel) {
                client.notifications.create({
                    data: {
                        accountId: element.accountId,
                        channelId: Number.parseInt(channelId),
                        content: `video ${title} đã được tải lên`,
                        title: "Video mới được tải lên thành công",
                    }
                }).then(r => {console.log(`created notification for subcriber ${r.accountId}`)})
            }
        });

        const channel = await client.channels.findUnique({
            where: {
                id: Number.parseInt(channelId)
            }
        })
        if (channel) {
            client.notifications.create({
                data: {
                    accountId: channel?.accountId,
                    channelId: Number.parseInt(channelId),
                    content: `video ${title} đã được tải lên`,
                    title: "Video mới được tải lên thành công",
                }
            }).then(r => {console.log('created notification for owner')})
        }
        res.send(JSON.stringify({ title: 'Video mới được tải lên thành công', content: `video ${title} đã được tải lên`, 'status': 201 }))
        return;
    } catch (error) {
        console.error(error);
        return;
    }
});

async function processVideo({ path, oriname, outputDirectory, size }: { path: string, oriname: string, outputDirectory: string, size: { width: number, height: number } }) {
    const resolutions = [
        { name: `${size.height}p`, scale: { width: size.width, height: size.height } },
        { name: `${size.height * 2 / 3}p`, scale: { width: size.width * 2 / 3, height: size.height * 2 / 3 } },
    ];

    const link = oriname.split('.')[0];
    const playlistPaths: { name: string, path: string }[] = [];

    for (const { name, scale } of resolutions) {
        createDirectoryIfNotExists(`${outputDirectory}/${link}`);
        const outputPath = `${outputDirectory}/${link}/${name}.m3u8`;
        const childPath = `${outputDirectory}/${link}/${name}%03d.ts`;

        const command = `ffmpeg -i ${path} ` +
            `-preset veryslow -g 48 -crf 20 ` +
            `-map 0:0 -map 0:1 -c:v h264 -vf scale=trunc(oh*a/2)*2:${scale.height} ` +
            `-c:a copy -hls_time 3 -hls_list_size 0 ` +
            `-hls_segment_filename "${childPath}" ` +
            `"${outputPath}"`;

        await executeCommand(command);
        playlistPaths.push({ name, path: name + '.m3u8' });
    }

    // Tạo tệp .m3u8 tổng
    const masterPlaylistPath = `${outputDirectory}/${link}/master.m3u8`;
    const playlistEntries = playlistPaths.map((entry, index) => `#EXT-X-STREAM-INF:BANDWIDTH=800000,HEIGHT=${resolutions[index].scale.height.toFixed(0)},WIDTH=${resolutions[index].scale.width.toFixed(0)},NAME=${entry.name},RESOLUTION=${resolutions[index].scale.width.toFixed(0)}x${resolutions[index].scale.height}\n${entry.path}`).join('\n');
    let cc = '#EXTM3U\n#EXT-X-VERSION:3\n' + playlistEntries;
    fs.writeFileSync(masterPlaylistPath, cc);

    return masterPlaylistPath;
}


function executeCommand(command: string) {
    return new Promise((resolve, reject) => {
        exec(command, (error: any, stdout: any, stderr: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(null);
            }
        });
    });
}


module.exports = router;
