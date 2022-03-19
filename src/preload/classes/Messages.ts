import { MessageParseResult, PeerMessages } from '../../types/MessageTypes';
import Builders from './Builders';
import Torrent from './Torrent';
import TorrentTracker from './TorrentTracker';

const peerMessagesMap: Record<number, PeerMessages> = {
    0: PeerMessages.Choke,
    1: PeerMessages.Unchoke,
    2: PeerMessages.Interested,
    3: PeerMessages.NotInterested,
    4: PeerMessages.Have,
    5: PeerMessages.BitField,
    6: PeerMessages.Request,
    7: PeerMessages.Piece,
    8: PeerMessages.Cancel,
};

/** Messages for communication between peers.
 *
 * All messages besides {@link Messages.buildHandshake handshake} follow the following syntax:
 *
 * `<length prefix><message ID><payload>`
 *
 * - `length prefix`: 4-byte BE value.
 * - `message ID`: Single decimal byte.
 * - `payload`: Message dependent.
 *
 * @see {@link https://wiki.theory.org/BitTorrentSpecification#Messages}
 */
export default abstract class Messages {
    /**
     * @see {@link https://wiki.theory.org/BitTorrentSpecification#Handshake}
     *
     * Format: `<pstrlen><pstr><reserved><info_hash><peer_id>`
     * - `pstrlen`: String length of <pstr>, as a single raw byte.
     * - `pstr`: String identifier of the protocol.
     * - `reserved`: Eight reserved bytes. All current implementations use all zeroes.
     * - `info_hash`: 20-byte SHA1 hash of the info key in the metainfo file.
     * - `peer_id`: 20-byte string used as a unique ID for the client.
     *
     * Length of message is `49 + pstr.length` bytes long.
     *
     * In version 1.0 of the BitTorrent protocol, pstrlen = 19, and pstr = "BitTorrent protocol".
     * Giving us a total length of 68.
     */
    public static buildHandshake({ torentFile: file }: Torrent): Buffer {
        const buffer = Buffer.alloc(68);

        // pstrlen
        buffer.writeUInt8(19, 0);

        // pstr
        buffer.write('BitTorrent protocol', 1);

        // reserved
        buffer.writeUInt32BE(0, 20);
        buffer.writeUInt32BE(0, 24);

        // info_hash
        Builders.makeInfoHash(file).copy(buffer, 28);

        // peer_id
        TorrentTracker.peerId.copy(buffer, 48);

        return buffer;
    }

    public static buildKeepAlive(): Buffer {
        return Buffer.alloc(4);
    }

    public static buildChoke(): Buffer {
        const buffer = Buffer.alloc(5);

        // length
        buffer.writeUInt32BE(1, 0);

        // id
        buffer.writeUInt8(0, 4);

        return buffer;
    }

    public static buildUnchoke(): Buffer {
        const buffer = Buffer.alloc(5);

        // length
        buffer.writeUint32BE(1, 0);

        // id
        buffer.writeUInt8(1, 4);

        return buffer;
    }

    public static buildInterested(): Buffer {
        const buffer = Buffer.alloc(5);

        // length
        buffer.writeUInt32BE(1, 0);

        // id
        buffer.writeUInt8(2, 4);

        return buffer;
    }

    public static buildNotInterested(): Buffer {
        const buffer = Buffer.alloc(5);

        // length
        buffer.writeUInt32BE(1, 0);

        // id
        buffer.writeUInt8(3, 4);

        return buffer;
    }

    /**
     * @param {number} payload - The zero-based index of a piece that has just been successfully downloaded
     * and verified via the hash.
     */
    public static buildHave(payload: number): Buffer {
        const buffer = Buffer.alloc(9);

        // length
        buffer.writeUInt32BE(5, 0);

        // id
        buffer.writeUInt8(4, 4);

        // piece index
        buffer.writeUInt32BE(payload, 5);

        return buffer;
    }

    /** (Optional) May only be sent immediately after hanshake is completed, before any other messages are sent.
     *
     * Doesn't need to be sent if the client has no pieces.
     *
     * @param {Buffer} bitField - Bitfield representing the pieces that have been downloaded.
     */
    public static buildBitField(bitField: Buffer): Buffer {
        const buffer = Buffer.alloc(bitField.length + 1 + 4);

        // length
        buffer.writeUInt32BE(bitField.length + 1, 0);

        // id
        buffer.writeUInt8(5, 4);

        // bitfield
        bitField.copy(buffer, 5);

        return buffer;
    }

    /** Used to request a block.
     *
     * @param {number} index - Zero-based piece index.
     * @param {number} begin - Zero-based byte offset within the piece.
     * @param {number} length - Requested length.
     */
    public static buildRequest(index: number, begin: number, length: number): Buffer {
        const buffer = Buffer.alloc(17);

        // length
        buffer.writeUint32BE(13, 0);

        // id
        buffer.writeUInt8(6, 4);

        // piece index
        buffer.writeUInt32BE(index, 5);

        // begin
        buffer.writeUInt32BE(begin, 9);

        // length
        buffer.writeUInt32BE(length, 13);

        return buffer;
    }

    /** Parameter reference similar to {@link Messages.buildRequest buildRequest} method. */
    public static buildPiece(index: number, begin: number, block: Buffer): Buffer {
        const buffer = Buffer.alloc(block.length + 13);

        // length
        buffer.writeUInt32BE(block.length + 9, 0);

        // id
        buffer.writeUInt8(7, 4);

        // piece index
        buffer.writeUInt32BE(index, 5);

        // begin
        buffer.writeUInt32BE(begin, 9);

        // block
        block.copy(buffer, 13);

        return buffer;
    }

    /** Parameter reference similar to {@link Messages.buildRequest buildRequest} method. */
    public static buildCancel(index: number, begin: number, length: number): Buffer {
        const buffer = Buffer.alloc(17);

        // length
        buffer.writeUInt32BE(13, 0);

        // id
        buffer.writeUInt8(8, 4);

        // piece index
        buffer.writeUInt32BE(index, 5);

        // begin
        buffer.writeUInt32BE(begin, 9);

        // length
        buffer.writeUInt32BE(length, 13);

        return buffer;
    }

    public static buildPort(listenPort: number): Buffer {
        const buffer = Buffer.alloc(7);

        // length
        buffer.writeUInt32BE(3, 0);

        // id
        buffer.writeUInt8(9, 4);

        // listen-port
        buffer.writeUInt16BE(listenPort, 5);

        return buffer;
    }

    private static _specialMessageTypes: Set<PeerMessages> = new Set([
        PeerMessages.Request,
        PeerMessages.Piece,
        PeerMessages.Cancel,
    ]);

    public static parseMessage(message: Buffer): MessageParseResult {
        if (message.length <= 4) throw new Error(`Can't parse message shorter than 4 bytes (got ${message.length})`);
        const idNumber = message.readInt8(4);
        const id = peerMessagesMap[idNumber] as PeerMessages | undefined;
        if (!id) throw new Error(`Unexpected message id: ${idNumber}`);
        const size = message.readInt32BE(0);
        const payload = message.slice(5);

        if (id === PeerMessages.Piece) {
            return {
                id,
                size,
                payload: {
                    index: payload.readUint32BE(0),
                    begin: payload.readUint32BE(4),
                    block: payload.slice(8),
                },
            };
        } else if (id === PeerMessages.Request || id === PeerMessages.Cancel) {
            return {
                id,
                size,
                payload: {
                    index: payload.readUint32BE(0),
                    begin: payload.readUint32BE(4),
                    length: payload.slice(8),
                },
            };
        } else
            return {
                size,
                id,
                payload,
            };
    }
}
