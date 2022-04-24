function randomColor() {
    return [Math.floor(Math.random() * 255), Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)];
}

function colNumberToLetters(n) {
    let letters = "";
    while (n != 0) {
        letters += String.fromCharCode(65 + (n - 1) % 26);
        n = Math.floor((n - 1) / 26);
    }
    return letters.split("").reverse().join("");
}

function colorToHex(r, g, b) {
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function upload() {
    const spreadsheet = SpreadsheetApp.openById("1l6UreIGDHvIWWhpu9suxv4KDxRqxyQ0Bqjn7nR0cb0Q");
    // const width = 50;
    // const height = 1000;
    let data = new Array(height).fill(0).map(_ => new Array(width).fill(0).map(_ => [0, 0, 0]));
    // console.log(data);

    const sheet = spreadsheet.getSheets()[0];
    sheet.setRowHeights(1, height, 10);
    sheet.setColumnWidths(1, width, 10);

    const image = DriveApp.getFileById("1wyC45YM5-nOZvhyrLQwEdVsvYFDzxpj6");
    // const image = DriveApp.getFileById("18RLpEeLljDShAb_O2bOuisigHUCuYpX2");
    const bytes = image.getBlob().getBytes().map(_ => _ < 0 ? 256 + _ : _);
    for (let i = 0; i < Math.ceil(bytes.length / 3); i++) {
        const x = i % width;
        const y = Math.floor(i / width);

        // console.log(x, y);

        data[y][x] = [bytes[i * 3] || 0, bytes[i * 3 + 1] || 0, bytes[i * 3 + 2] || 0];
    }

    // console.log(data.map(_ => _.map(__ => colorToHex(...__))));
    const range = sheet.getRange(`A1:${colNumberToLetters(width)}${height}`);

    // console.log(data);
    range.setBackgrounds(data.map(_ => _.map(__ => colorToHex(...__))));


    // const image = 0;
}

const width = 100;
const height = 1000;

function openSheet() {
    const spreadsheet = SpreadsheetApp.openById("1l6UreIGDHvIWWhpu9suxv4KDxRqxyQ0Bqjn7nR0cb0Q");
    const sheet = spreadsheet.getSheets()[0];
    sheet.setRowHeights(1, height, 10);
    sheet.setColumnWidths(1, width, 10);
    return sheet;
}

function getLetters(byte) {
    return `${colNumberToLetters(Math.floor(byte / 3) % width + 1)}${Math.floor(Math.floor(byte / 3) / width) + 1}`;
}

function getLettersStart(byte) {
    return `${colNumberToLetters(1)}${Math.floor(Math.floor(byte / 3) / width) + 1}`;
}

function getLettersEnd(byte) {
    return `${colNumberToLetters(width)}${Math.floor(Math.floor(byte / 3) / width) + 1}`;
}

function testGetLetters() {
    console.log(getLetters(10352));
    console.log(getLettersStart(10352));
    console.log(getLettersEnd(10352));

    // console.log(Math.floor(3 / 3) % width);
}

// from=0&to=10352
function doGet({ parameter }) {
    let { from, to } = parameter;

    if (!from || !to) return;

    from = parseInt(from);
    to = parseInt(to);

    console.log(`${from} -> ${to}; ${getLetters(from)}:${getLetters(to)}, scan from ${getLettersStart(from)}:${getLettersEnd(to)}`);

    const sheet = openSheet();

    let out = ContentService.createTextOutput();
    out.setMimeType(ContentService.MimeType.JSON);
    let fbytes = [];

    const bgs = sheet.getRange(`${getLettersStart(from)}:${getLettersEnd(to)}`).getBackgrounds();
    for (let i = 0; i < Math.ceil(to - from);) {
        const z = i + (Math.floor(from) % (3 * width));
        const x = Math.floor(z / 3) % width;
        const y = Math.floor(Math.floor(z / 3) / width);

        console.log(x, y);

        const bg = bgs[y][x];
        let bytes = [bg.slice(1, 3), bg.slice(3, 5), bg.slice(5, 7)];

        if (i >= to - from) break;
        if (i > 2 || (i <= 2 && (from + i) % 3 == 0)) {
            fbytes.push(parseInt(bytes[0], 16));
            i += 1;
        }

        if (i >= to - from) break;
        if (i > 2 || (i <= 2 && (from + i) % 3 == 1)) {
            fbytes.push(parseInt(bytes[1], 16));
            i += 1;
        }

        if (i >= to - from) break;
        if (i > 2 || (i <= 2 && (from + i) % 3 == 2)) {
            fbytes.push(parseInt(bytes[2], 16));
            i += 1;
        }
    }

    out.setContent(JSON.stringify(fbytes));

    return out;
}

function doPost(e) {
    const body = JSON.parse(e.postData.contents);

    const data = body.data;
    const from = body.from;
    const to = body.from + body.data.length;

    console.log(`${from} -> ${to}; ${getLetters(from)}:${getLetters(to)}, scan from ${getLettersStart(from)}:${getLettersEnd(to)}`);

    const sheet = openSheet();

    let out = ContentService.createTextOutput();
    out.setMimeType(ContentService.MimeType.JSON);

    const r = sheet.getRange(`${getLettersStart(from)}:${getLettersEnd(to)}`);
    const bgs = r.getBackgrounds();
    for (let i = 0; i < Math.ceil(to - from);) {
        const z = i + (Math.floor(from) % (3 * width));
        const x = Math.floor(z / 3) % width;
        const y = Math.floor(Math.floor(z / 3) / width);

        console.log(x, y);

        const bg = bgs[y][x];
        let bytes = [bg.slice(1, 3), bg.slice(3, 5), bg.slice(5, 7)];

        if (i >= to - from) { bgs[y][x] = colorToHex(bytes[0], bytes[1], bytes[2]); break; }
        if (i > 2 || (i <= 2 && (from + i) % 3 == 0)) {
            bytes[0] = data[i];
            i += 1;
        }

        if (i >= to - from) { bgs[y][x] = colorToHex(bytes[0], bytes[1], bytes[2]); break; }
        if (i > 2 || (i <= 2 && (from + i) % 3 == 1)) {
            bytes[1] = data[i];
            i += 1;
        }

        if (i >= to - from) { bgs[y][x] = colorToHex(bytes[0], bytes[1], bytes[2]); break; }
        if (i > 2 || (i <= 2 && (from + i) % 3 == 2)) {
            bytes[2] = data[i];
            i += 1;
        }

        bgs[y][x] = colorToHex(bytes[0], bytes[1], bytes[2]);
    }
    r.setBackgrounds(bgs);
}
