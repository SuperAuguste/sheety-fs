require("dotenv").config();

const assert = require("assert");
const fatfs = require("fatfs");
const utils = require("./utils");

const SHEET_SIZE = 100 * 1000 * 3;
const SECTOR_SIZE = 512;

(async () => {
    console.log(`Creating file system with size ${SHEET_SIZE} and ${Math.floor(SHEET_SIZE / SECTOR_SIZE)} sectors of size ${SECTOR_SIZE}`);

    // await set(0, [...utils.initFat16("DUMBFS".padEnd(11, " "))]);
    const fs = fatfs.createFileSystem({
        sectorSize: SECTOR_SIZE,
        numSectors: Math.floor(SHEET_SIZE / SECTOR_SIZE),
        async readSectors(i, dest, cb) {
            console.log("Read!", dest.length);
            if (dest.length % SECTOR_SIZE) throw Error("Unexpected buffer length!");

            const buffer = Buffer.from(await utils.get(i * SECTOR_SIZE, i * SECTOR_SIZE + dest.length));
            dest.set(buffer);
            cb(null, buffer);
            // fs.read(fd, dest, 0, dest.length, i*secSize, function (e,n,d) {
            //     cb(e,d);
            // });
        },
        async writeSectors(i, data, cb) {
            console.log("Write!", i, data);
            if (data.length % SECTOR_SIZE) throw Error("Unexpected buffer length!");
            await utils.set(i * SECTOR_SIZE, [...data]);
            cb(null);
            // fs.write(fd, data, 0, data.length, i*secSize, function (e) {
            //     cb(e);
            // });
        }
    });

    // console.log(fs);
    // fs.mkdir("/abc", {}, () => {});
    // fs.writeFile("/test.txt", "lorem ipsum", {}, err => {
    //     if (err) throw err;
    //     console.log("Wrote!");
    // })
    // fs.readdir("/", (err, files) => {
    //     console.log(files);
    // });
    fs.readFile("/test.txt", {}, (err, data) => {
        if (err) throw err;
        console.log(err, data.toString());
    });
})();
