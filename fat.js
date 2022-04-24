require("dotenv").config();

const assert = require("assert");
const axios = require("axios").default;
const fatfs = require("fatfs");
const fat16 = require("fatfs/structs").boot16;

const SHEET_SIZE = 100 * 1000 * 3;
const SECTOR_SIZE = 512;
const ENDPOINT = process.env.ENDPOINT;

// Creates a 10MB buffer and initializes it as a FAT 16 volume.
function init({ label = 'NO LABEL   ' } = {}) {
    assert.strictEqual(typeof label, 'string')
    assert.strictEqual(label.length, 11)

    const buf = Buffer.alloc(SHEET_SIZE);

    // https://github.com/natevw/fatfs/blob/master/structs.js
    fat16.pack(
        {
            jmpBoot: Buffer.from('eb3c90', 'hex'),
            OEMName: 'mkfs.fat',
            BytsPerSec: SECTOR_SIZE,
            SecPerClus: 4,
            ResvdSecCnt: 1,
            NumFATs: 2,
            RootEntCnt: 512,
            TotSec16: Math.floor(SHEET_SIZE / SECTOR_SIZE),
            Media: 248,
            FATSz16: 20,
            SecPerTrk: 32,
            NumHeads: 64,
            HiddSec: 0,
            TotSec32: 0,
            DrvNum: 128,
            Reserved1: 0,
            BootSig: 41,
            VolID: 895111106,
            VolLab: label,
            FilSysType: 'FAT16   ',
        },
        buf
    )

    // End of sector.
    buf[0x1fe] = 0x55
    buf[0x1ff] = 0xaa

    // Mark sector as reserved.
    buf[0x200] = 0xf8
    buf[0x201] = 0xff
    buf[0x202] = 0xff
    buf[0x203] = 0xff

    // Mark sector as reserved.
    buf[0x2a00] = 0xf8
    buf[0x2a01] = 0xff
    buf[0x2a02] = 0xff
    buf[0x2a03] = 0xff

    return buf;
}

async function get(from, to) {
    const res = await axios.get(`${ENDPOINT}?from=${from}&to=${to}`);
    if (res.status !== 200) throw "Ah shit (get)";
    return (res).data;
}

async function set(from, data) {
    const res = await axios.post(ENDPOINT, JSON.stringify({ from, data }), {});
    if (res.status !== 200) throw "Ah shit (set)";
    return;
}

// require("fs").read()

(async () => {
    console.log(`Creating file system with size ${SHEET_SIZE} and ${Math.floor(SHEET_SIZE / SECTOR_SIZE)} sectors of size ${SECTOR_SIZE}`);

    // console.log([...init("DUMBFS".padEnd(11, " "))]);
    // await set(0, [...init("DUMBFS".padEnd(11, " "))]);

    const fs = fatfs.createFileSystem({
        sectorSize: SECTOR_SIZE,
        numSectors: Math.floor(SHEET_SIZE / SECTOR_SIZE),
        async readSectors(i, dest, cb) {
            console.log("Read!", dest.length);
            if (dest.length % SECTOR_SIZE) throw Error("Unexpected buffer length!");

            const buffer = Buffer.from(await get(i * SECTOR_SIZE, i * SECTOR_SIZE + dest.length));
            dest.set(buffer);
            cb(null, buffer);
            // fs.read(fd, dest, 0, dest.length, i*secSize, function (e,n,d) {
            //     cb(e,d);
            // });
        },
        async writeSectors(i, data, cb) {
            console.log("Write!", i, data);
            if (data.length % SECTOR_SIZE) throw Error("Unexpected buffer length!");
            await set(i * SECTOR_SIZE, [...data]);
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

// (async () => {
//     await set(0, new Array(100).fill(0));
//     // console.log(await get(0, 100));
// })();