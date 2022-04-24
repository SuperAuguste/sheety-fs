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

const nodePath = require("path");
const webdav = require('webdav-server').v2;

// function pathify(path) {
//     return nodePath.posix.join("/", ...path.paths);
// }

const locks = {};

class Resource
{
    constructor(data)
    {
        if(!data)
        {
            this.props = new webdav.LocalPropertyManager();
            this.locks = new webdav.LocalLockManager();
        }
        else
        {
            const rs = data;
            this.props = rs.props;
            this.locks = rs.locks;
        }
    }
}

class SheetySerializer {
    uid()
    {
        return 'SheetySerializer_1.0.0';
    }

    serialize(fs, callback)
    {
        callback(null, {
            resources: fs.resources,
            config: fs.config
        });
    }

    unserialize(serializedData, callback)
    {
        const fs = new SheetyFS(serializedData.config);
        fs.resources = serializedData.resources;
        callback(null, fs);
    }
}

class SheetyFS extends webdav.FileSystem {
    constructor(config)
    {
        super(new SheetySerializer());

        this.resources = {
            '/': new Resource()
        };
    }

    /**
     * @override
    */
    _type(path, ctx, callback) {
        console.log("_type", path.toString());
        if(path.isRoot())
            return callback(null, webdav.ResourceType.Directory);

        fs.stat(path.toString(), (err, stats) => {
            if (err && err.code === "ISDIR") callback(null, webdav.ResourceType.Directory);
            else if (err) callback(webdav.Errors.ResourceNotFound);
            else callback(null, webdav.ResourceType.File);
        });
    }

    /**
     * @override
    */
    _propertyManager(path, ctx, callback) {
        console.log("_propMan", path.toString());
        
        let resource = this.resources[path.toString()];
        if(!resource)
        {
            resource = new Resource();
            this.resources[path.toString()] = resource;
        }
        callback(null, resource.props);
    }

    /**
     * @override
    */
    _lockManager(path, ctx, callback) {
        console.log("_lockMan", path.toString());

        let resource = this.resources[path.toString()];
        if(!resource)
        {
            resource = new Resource();
            this.resources[path.toString()] = resource;
        }
        callback(null, resource.locks);
    }

    _readDir(path, ctx, callback) {
        console.log("_readDir", path.toString());

        fs.readdir(path.toString(), async (err, files) => {
            callback(err, files);
        });
    }

    _openReadStream(path, ctx, callback) {
        console.log("_readStream", path.toString());

        callback(null, fs.createReadStream(path.toString(), {}));
    }

    _openWriteStream(path, ctx, callback) {
        console.log("_writeStream", path.toString());

        callback(null, fs.createWriteStream(path.toString(), {}));
    }

    _create(path, ctx, callback) {
        console.log("_create", path.toString());

        if (ctx.type.isDirectory)
            fs.mkdir(path.toString(), callback);
        else
            callback(null, fs.createWriteStream(path.toString(), {}));
    }
}

// http://localhost:1900
const server = new webdav.WebDAVServer({
    port: 1900,
    autoLoad: {
        // [...]
        serializers: [
            new SheetySerializer()
        ]
    }
});

server.afterRequest((arg, next) => {
    // Display the method, the URI, the returned status code and the returned message
    console.log('>>', arg.request.method, arg.requested.uri, '>', arg.response.statusCode, arg.response.statusMessage);
    // If available, display the body of the response
    console.log(arg.responseBody);
    next();
});

server.autoLoad((e) => {
    if(!e)
        return;
    
    server.setFileSystem('/', new SheetyFS());
});
 
server.start(() => console.log('READY'));
