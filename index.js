require("dotenv").config();

const assert = require("assert");
const axios = require("axios").default;

const SHEET_SIZE = 100 * 1000 * 3;
const SECTOR_SIZE = 512;
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

(async () => {
    // await randReadWrite(10);
})();

