import { Buffer } from 'buffer';
import RawTorrent from '../../types/RawTorrent';
import generateId from './generateId';
import torrentParsing from './torrentParsing';

/*
https://wiki.theory.org/index.php/BitTorrentSpecification#Handshake

handshake: <pstrlen><pstr><reserved><info_hash><peer_id>

pstrlen: string length of <pstr>, as a single raw byte
pstr: string identifier of the protocol
reserved: eight (8) reserved bytes. All current implementations use all zeroes.
peer_id: 20-byte string used as a unique ID for the client.

In version 1.0 of the BitTorrent protocol, pstrlen = 19, and pstr = "BitTorrent protocol".
*/

export interface Block {
    index: number;
    begin: number;
    length: number;
}

export function buildHandshake(torrent: RawTorrent): Buffer {
    const buffer = Buffer.alloc(68);

    // pstrlen
    buffer.writeUInt8(19, 0);

    // pstr
    buffer.write('BitTorrent protocol', 1);

    // reserved
    buffer.writeUInt32BE(0, 20);
    buffer.writeUInt32BE(0, 24);

    // info hash
    torrentParsing.infoHash(torrent).copy(buffer, 28);

    // peer id
    buffer.write(generateId().toString());

    return buffer;
}

export function buildKeepAlive(): Buffer {
    return Buffer.alloc(4);
}

export function buildChoke(): Buffer {
    const buffer = Buffer.alloc(5);

    // length
    buffer.writeUInt32BE(1, 0);

    // id
    buffer.writeUInt8(0, 4);

    return buffer;
}

export function buildUnchoke(): Buffer {
    const buffer = Buffer.alloc(5);

    // length
    buffer.writeUint32BE(1, 0);

    // id
    buffer.writeUInt8(1, 4);

    return buffer;
}

export function buildInterested(): Buffer {
    const buffer = Buffer.alloc(5);

    // length
    buffer.writeUInt32BE(1, 0);

    // id
    buffer.writeUInt8(2, 4);

    return buffer;
}

export function buildUninterested(): Buffer {
    const buffer = Buffer.alloc(5);

    // length
    buffer.writeUInt32BE(1, 0);

    // id
    buffer.writeUInt8(3, 4);

    return buffer;
}

export function buildHave(payload: number): Buffer {
    const buffer = Buffer.alloc(9);

    // length
    buffer.writeUInt32BE(5, 0);

    // id
    buffer.writeUInt8(4, 4);

    // piece index
    buffer.writeUInt32BE(payload, 5);

    return buffer;
}

export function buildBitfield(bitField: Buffer): Buffer {
    const buffer = Buffer.alloc(14);

    // length
    buffer.writeUInt32BE(bitField.length + 1, 0);

    // id
    buffer.writeUInt8(5, 4);

    // bitfield
    bitField.copy(buffer, 5);

    return buffer;
}

export function buildRequest(payload: Block): Buffer {
    const buffer = Buffer.alloc(17);

    // length
    buffer.writeUint32BE(13, 0);

    // id
    buffer.writeUInt8(6, 4);

    // piece index
    buffer.writeUInt32BE(payload.index, 5);

    // begin
    buffer.writeUInt32BE(payload.begin, 9);

    // length
    buffer.writeUInt32BE(payload.length, 13);

    return buffer;
}

export function buildPiece(payload: Block & { block: Buffer }): Buffer {
    const buffer = Buffer.alloc(payload.block.length + 13);

    // length
    buffer.writeUInt32BE(payload.block.length + 9, 0);

    // id
    buffer.writeUInt8(7, 4);

    // piece index
    buffer.writeUInt32BE(payload.index, 5);

    // begin
    buffer.writeUInt32BE(payload.begin, 9);

    // block
    payload.block.copy(buffer, 13);

    return buffer;
}

export function buildCancel(payload: Block): Buffer {
    const buffer = Buffer.alloc(17);

    // length
    buffer.writeUInt32BE(13, 0);

    // id
    buffer.writeUInt8(8, 4);

    // piece index
    buffer.writeUInt32BE(payload.index, 5);

    // begin
    buffer.writeUInt32BE(payload.begin, 9);

    // length
    buffer.writeUInt32BE(payload.length, 13);

    return buffer;
}

export function buildPort(payload: number): Buffer {
    const buffer = Buffer.alloc(7);

    // length
    buffer.writeUInt32BE(3, 0);

    // id
    buffer.writeUInt8(9, 4);

    // listen-port
    buffer.writeUInt16BE(payload, 5);

    return buffer;
}

export interface Piece {
    index?: number;
    begin?: number;
    block?: Buffer;
    length?: Buffer;
}

export function parseMessage(message: Buffer) {
    const id = message.length > 4 ? message.readInt8(4) : null;
    let payload: Piece | null | Buffer = message.length > 5 ? message.slice(5) : null;

    if (id && id >= 6 && id <= 8) {
        const rest = payload?.slice(8);
        payload = {
            index: payload?.readInt32BE(0),
            begin: payload?.readInt32BE(4),
        };
        payload[id === 7 ? 'block' : 'length'] = rest;
    }

    return {
        size: message.readInt32BE(0),
        id,
        payload,
    };
}
