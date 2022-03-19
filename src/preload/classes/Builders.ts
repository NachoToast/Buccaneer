import { Socket } from 'dgram';
import { randomBytes, createHash } from 'crypto';
import { parse as urlParse } from 'url';
import { TorrentFile } from '../../types/DecodedTorrentFile';
import { encode } from 'bencode';
import Torrent from './Torrent';
import TorrentTracker from './TorrentTracker';
import toBuffer from '../helpers/toBuffer';

interface UdpSendResult {
    error: Error | null;
    bytes: number;
}

interface BuildResult {
    payload: Buffer;
    transactionId: number;
}

export default abstract class Builders {
    /** Sends a message through a socket.
     *
     * @throws Throws an error if the URL or port is invalid.
     */
    public static udpSend(socket: Socket, message: string | Uint8Array, rawUrl: string): Promise<UdpSendResult> {
        return new Promise<UdpSendResult>((resolve) => {
            /** We use the deprecated {@link urlParse} function since the WHATWG URL API can't
             * correctly parse torrent URLs.
             *
             * @example new URL('udp://tracker.openbittorrent.com:80')
             */
            const url = urlParse(rawUrl);

            if (!url.hostname) {
                throw new Error(`URL "${rawUrl}" is missing a hostname`);
            }

            socket.send(message, 0, message.length, Number(url.port), url.hostname, (error, bytes) =>
                resolve({ error, bytes }),
            );
        });
    }

    /** Builds a connection request as per 
     * {@link https://www.bittorrent.org/beps/bep_0015.html#connect the spec}.
     * ```ts
    ╔════════╦════════════════╦════════════════╦═════════════════════════════════╗
    ║ Offset ║ Size           ║ Name           ║ Value                           ║
    ╠════════╬════════════════╬════════════════╬═════════════════════════════════╣
    ║ 0      ║ 64-bit integer ║ protocol_id    ║ 0x41727101980 // magic constant ║
    ╠════════╬════════════════╬════════════════╬═════════════════════════════════╣
    ║ 8      ║ 32-bit integer ║ action         ║ 0 // connect                    ║
    ╠════════╬════════════════╬════════════════╬═════════════════════════════════╣
    ║ 12     ║ 32-bit integer ║ transaction_id ║                                 ║
    ╠════════╬════════════════╬════════════════╬═════════════════════════════════╣
    ║ 16     ║                ║                ║                                 ║
    ╚════════╩════════════════╩════════════════╩═════════════════════════════════╝
     * ```
     */
    public static buildConnectionRequest(): BuildResult {
        const buffer = Buffer.alloc(16); // 16 bytes long

        // protocol_id
        // split in 2 since node can't write 64-bit unsigned integer
        buffer.writeUInt32BE(0x417, 0);
        buffer.writeUInt32BE(0x27101980, 4);

        // action
        buffer.writeUInt32BE(0, 8);

        // transaction_id
        const id: Buffer = randomBytes(4);
        id.copy(buffer, 12);

        return { payload: buffer, transactionId: id.readUInt32BE() };
    }

    /** Builds an announce request as per
     * {@link https://www.bittorrent.org/beps/bep_0015.html#connect the spec}.
     * ```ts
    ╔════════╦════════════════╦════════════════╦════════════════════════════════════════════════════╗
    ║ Offset ║ Size           ║ Name           ║ Value                                              ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 0      ║ 64-bit integer ║ connection_id  ║ 0x41727101980 // magic constant                    ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 8      ║ 32-bit integer ║ action         ║ 1 // announce                                      ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 12     ║ 32-bit integer ║ transaction_id ║                                                    ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 16     ║ 20-byte string ║ info_hash      ║                                                    ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 36     ║ 20-byte string ║ peer_id        ║                                                    ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 56     ║ 64-bit integer ║ downloaded     ║                                                    ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 64     ║ 64-bit integer ║ left           ║                                                    ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 72     ║ 64-bit integer ║ uploaded       ║                                                    ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 80     ║ 32-bit integer ║ event          ║ 0 // 0: none; 1: completed; 2: started; 3: stopped ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 84     ║ 32-bit integer ║ IP address     ║ 0 // default                                       ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 88     ║ 32-bit integer ║ key            ║                                                    ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 92     ║ 32-bit integer ║ num_want       ║ -1 // default                                      ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 96     ║ 16-bit integer ║ port           ║                                                    ║
    ╠════════╬════════════════╬════════════════╬════════════════════════════════════════════════════╣
    ║ 98     ║                ║                ║                                                    ║
    ╚════════╩════════════════╩════════════════╩════════════════════════════════════════════════════╝
     * ```
     */
    public static buildAnnounceRequest(connectionId: Buffer, torrent: Torrent, port: number = 6881): BuildResult {
        const buffer = Buffer.allocUnsafe(98);

        // connection_id
        connectionId.copy(buffer, 0);

        // action
        buffer.writeUInt32BE(1, 8);

        // transaction_id
        const id: Buffer = randomBytes(4);
        id.copy(buffer, 12);

        // info_hash
        Builders.makeInfoHash(torrent.torentFile).copy(buffer, 16);

        // peer_id
        TorrentTracker.peerId.copy(buffer, 36);

        // downloaded
        Buffer.alloc(8).copy(buffer, 56);

        // left
        toBuffer(torrent.size, 8).copy(buffer, 64);

        // uploaded
        Buffer.alloc(8).copy(buffer, 72);

        // event
        buffer.writeUInt32BE(0, 80);

        // ip
        buffer.writeUInt32BE(0, 84);

        // key
        randomBytes(4).copy(buffer, 88);

        // num_want (note: not signed)
        buffer.writeInt32BE(-1, 92);

        // port
        buffer.writeUInt16BE(port, 96);

        return { payload: buffer, transactionId: id.readUInt32BE() };
    }

    /** Encodes and hashes information about a {@link TorrentFile} using bencoding and `sha1` hashing respectively. */
    public static makeInfoHash({ info }: TorrentFile): Buffer {
        const specInfo: Omit<TorrentFile['info'], 'multi'> = { ...info };
        delete (specInfo as unknown as { multi?: boolean }).multi;
        const encodedInfo = encode(specInfo);
        return createHash('sha1').update(encodedInfo).digest();
    }
}
