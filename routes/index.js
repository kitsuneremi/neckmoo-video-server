const Decay = require('./decay.js');
const Merge = require('./file.js');
const VideoFile = require('./videoFile.js');
const LiveFile = require('./livefile.js');
const Live = require('./live.js');
const Master = require('./master.js');
const ImageProcess = require('./image.js')
const os = require('os');
const { PrismaClient } = require('@prisma/client');
const { readdirSync, rmdirSync } = require('fs');
const fs = require('fs')
const path = require('path')

const client = new PrismaClient();

const createDirectoryIfNotExists = (directoryPath) => {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
        console.log(`Created directory: ${directoryPath}`);
    } else {
        console.log(`Directory already exists: ${directoryPath}`);
    }
}; 

function route(app) {
    app.use('/api/decay', Decay);
    app.use('/api/merge', Merge);
    app.use('/api/segment', VideoFile)
    app.use('/api/livefile', LiveFile)
    app.use('/api/live', Live)
    app.use('/api/video', Master)
    app.use('/api/image', ImageProcess)
    app.use('/api/auth', async (req, res) => {
        const streamKey = req.body.key;
        if (streamKey) {
            console.log(streamKey)
            const validate = await client.channels.findUnique({
                where: {
                    streamKey: streamKey
                }
            })
            if (validate && !validate.live) {
                const updatedChannel = await client.channels.update({
                    where: {
                        id: validate.id
                    },
                    data: {
                        live: true
                    }
                })
                console.log(`${updatedChannel.name} now on stream`)
                res.status(200).send();
                return;

            } else {
                res.status(403).send();
                return;
            }
        } else {
            console.log('no streamkey')
            res.status(403).send();
            return;
        }
    })

    app.post('/api/endstream', async (req, res) => {
        const streamKey = req.body.key;
        console.log(streamKey)

        function makeid() {
            let length = 8;
            let result = "";
            const characters =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            const charactersLength = characters.length;
            let counter = 0;
            while (counter < length) {
                result += characters.charAt(
                    Math.floor(Math.random() * charactersLength)
                );
                counter += 1;
            }
            return result;
        }

        const updatedChannel = await client.channels.update({
            where: {
                streamKey: streamKey
            },
            data: {
                live: false
            }
        })
        console.log(`${updatedChannel.name} ended the stream`)
        const neededUpdate = await client.media.findFirst({
            where: {
                channelId: updatedChannel.id,
                AND: {
                    mediaType: 1
                }
            }
        })
        if (neededUpdate) {
            const updatedLive = await client.media.update({
                where: {
                    id: neededUpdate.id
                },
                data: {
                    mediaType: 2,
                    endTime: new Date(),
                    link: makeid(),
                    isLive: false
                }
            })

            // tiến hành di chuyển file hls sang bên thư mục video
            try {
                const livePath = `C:/live/${updatedChannel.tagName}`
                const destinationPath = `C:/saveFiles/${updatedLive.link}`
                // Đọc danh sách tệp trong thư mục nguồn
                const files = fs.readdirSync(livePath);
                createDirectoryIfNotExists(`C:/saveFiles/${updatedLive.link}`)
                // Di chuyển tất cả các tệp từ thư mục nguồn sang thư mục đích
                files.forEach((file) => {
                    const sourceFilePath = path.join(livePath, file);
                    const destinationFilePath = path.join(destinationPath, file);

                    // Sử dụng fs.renameSync để di chuyển tệp
                    fs.renameSync(sourceFilePath, destinationFilePath);
                    if (file === 'index.m3u8') {
                        const newFileName = 'master.m3u8';
                        fs.renameSync(destinationFilePath, path.join(destinationPath, newFileName));
                    }
                });

                console.log(`Tất cả tệp đã được di chuyển thành công.`);
                try {
                    // Đọc danh sách tệp trong thư mục
                    const files = fs.readdirSync(livePath);

                    // Xóa tất cả các tệp trong thư mục
                    files.forEach((file) => {
                        const filePath = path.join(livePath, file);
                        fs.unlinkSync(filePath);
                    });

                    // Xóa thư mục chính sau khi xóa tất cả tệp
                    fs.rmdirSync(livePath);
                    console.log(`Thư mục đã được xóa thành công.`);
                } catch (err) {
                    console.error(`Đã xảy ra lỗi: ${err}`);
                }
            } catch (err) {
                console.error(`Đã xảy ra lỗi: ${err}`);
            }
            return;
        }

    })
    app.get('/api/test', async (req, res) => {
        res.status(200).send('acc')
    })
}

module.exports = route;
