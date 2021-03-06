const axios = require("axios").default;
const fat16 = require("fatfs/structs").boot16;

const ENDPOINT = process.env.ENDPOINT;

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

async function randReadWrite(rounds) {
    console.log(`Running random read-write test ${rounds}x`);

    for (let i = 0; i < rounds; i++) {
        console.time(`Round ${i + 1}`);
        const from = Math.floor(Math.random() * SHEET_SIZE);
        const size = Math.floor(Math.random() * 512);
        const data = new Array(size).fill(0).map(_ => Math.floor(Math.random() * 255));

        console.time(`Round ${i + 1} (set/${size})`);
        await set(from, data);
        console.timeEnd(`Round ${i + 1} (set/${size})`);

        console.time(`Round ${i + 1} (get/${size})`);
        const g = await get(from, from + size);
        console.timeEnd(`Round ${i + 1} (get/${size})`);
        
        for (let i = 0; i < data.length; i++) {
            if (g[i] !== data[i]) {
                console.error(`Unexpected difference at ${i} (size ${size}): expected ${data[i]}, found ${g[i]}!`);
            }
        }
        console.timeEnd(`Round ${i + 1}`);
    }
}

// Creates a buffer and initializes it as a FAT 16 volume.
function initFat16({ label = 'NO LABEL   ' } = {}) {
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

module.exports = {
    get,
    set,
    randReadWrite,
    initFat16,
}
