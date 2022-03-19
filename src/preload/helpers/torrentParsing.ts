import { decode, encode } from 'bencode';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
// import { toBuffer } from 'bignum';
import RawTorrent from '../../types/RawTorrent';

function open(filePath: string): RawTorrent {
    return decode(readFileSync(filePath));
}

function size(torrent: RawTorrent): Buffer {
    let size: number;
    if (torrent.info.files) {
        size = torrent.info.files.map((file) => file.length).reduce((a, b) => a + b);
    } else if (torrent.info.length) {
        size = torrent.info.length;
    } else throw new Error('Torrent has no size associated');

    // return toBuffer(size, { size: 8, endian: 'big' });
    return Buffer.alloc(0);
}

function infoHash(torrent: RawTorrent): Buffer {
    const info = encode(torrent.info);
    return createHash('sha1').update(info).digest();
}

const torrentParsing = { open, size, infoHash };

export default torrentParsing;
