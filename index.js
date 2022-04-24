require("dotenv").config();

const assert = require("assert");
const fatfs = require("fatfs");
const utils = require("./utils");

const SHEET_SIZE = 100 * 1000 * 3;
const SECTOR_SIZE = 512;

// (async () => {
//     console.log(`Creating file system with size ${SHEET_SIZE} and ${Math.floor(SHEET_SIZE / SECTOR_SIZE)} sectors of size ${SECTOR_SIZE}`);

//     // await set(0, [...utils.initFat16("DUMBFS".padEnd(11, " "))]);
//     const fs = fatfs.createFileSystem({
//         sectorSize: SECTOR_SIZE,
//         numSectors: Math.floor(SHEET_SIZE / SECTOR_SIZE),
//         async readSectors(i, dest, cb) {
//             console.log("Read!", dest.length);
//             if (dest.length % SECTOR_SIZE) throw Error("Unexpected buffer length!");

//             const buffer = Buffer.from(await utils.get(i * SECTOR_SIZE, i * SECTOR_SIZE + dest.length));
//             dest.set(buffer);
//             cb(null, buffer);
//         },
//         async writeSectors(i, data, cb) {
//             console.log("Write!", i, data);
//             if (data.length % SECTOR_SIZE) throw Error("Unexpected buffer length!");
//             await utils.set(i * SECTOR_SIZE, [...data]);
//             cb(null);
//         }
//     });

//     // console.log(fs);
//     // fs.mkdir("/abc", {}, () => {});
//     // fs.writeFile("/test.txt", "lorem ipsum", {}, err => {
//     //     if (err) throw err;
//     //     console.log("Wrote!");
//     // })
//     // fs.readdir("/", (err, files) => {
//     //     console.log(files);
//     // });
//     // fs.readFile("/test.txt", {}, (err, data) => {
//     //     if (err) throw err;
//     //     console.log(err, data.toString());
//     // });
// })();
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
    },
    async writeSectors(i, data, cb) {
        console.log("Write!", i, data);
        if (data.length % SECTOR_SIZE) throw Error("Unexpected buffer length!");
        await utils.set(i * SECTOR_SIZE, [...data]);
        cb(null);
    }
});

// fs.lstat("/", (err, stat) => {
//     console.log(err);
// });

const path = require("path");
const FtpSrv = require('ftp-srv');

const port = 21;
const ftpServer = new FtpSrv({
    url: "ftp://localhost:" + port,
    anonymous: true
});

const WIN_SEP_REGEX = /\\/g;
class SheetyFS extends FtpSrv.FileSystem {
    resPath(p) {
        return path.posix.join("/", p);
    }

    get(fileName) {
        console.log("AAAA",  this._resolvePath(fileName));
        const p = this.resPath(fileName);
        console.log("!! Getting", p);
        return new Promise(resolve => {
            fs.stat(p, (err, stats) => {
                if (err && err.code === "ISDIR") resolve({name: fileName, isDirectory() {return true;}});
                resolve({name: path.basename(fileName), ...stats});
            });
        });
    }

    list(ftpPath = '.') {
        const z = this;
        const p = this.resPath(ftpPath);
        console.log("!! Listing", p);
        return new Promise(resolve => {
            fs.readdir(p, async (err, files) => {
                resolve(Promise.all(files.map(_ => z.get(path.posix.join(p, _)))));
            });
        });
    }

    chdir(path = '.') {
        
    }

    write(fileName, { append = false, start = undefined } = {}) {
        
    }

    read(fileName, { start = 0 } = {}) {
        const p = this.resPath(fileName);
        console.log("!! Listing", p);
        // return new Promise(resolve => {
            // fs.createReadStream(p, async (err, files) => {
            //     resolve(Promise.all(files.map(_ => z.get(path.posix.join(p, _)))));
            // });
        // });
        return fs.createReadStream(p, {start});
    }

    delete(path) {
        
    }

    mkdir(path) {
        
    }

    rename(from, to) {
        
    }

    chmod(path, mode) {

    }
}

ftpServer.on('login', (data, resolve, reject) => {
    if (data.username === 'anonymous' && data.password === '@anonymous') {
        return resolve({ root: "/", fs: new SheetyFS() });
    }
    return reject('Invalid username or password');
});

ftpServer.listen().then(() => {
    console.log('Ftp server is starting...')
});

