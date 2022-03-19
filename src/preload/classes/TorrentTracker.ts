import Torrent from './Torrent';
import { randomBytes } from 'crypto';
import TorrentInfo from '../../types/TorrentInfo';
import { TypedEmitter } from 'tiny-typed-emitter';

export interface TorrentTrackerEvents {
    torrentUpdate: (info: TorrentInfo) => void;
}

class TorrentTracker extends TypedEmitter<TorrentTrackerEvents> {
    public get peerId(): Buffer {
        return TorrentTracker.makePeerId();
    }

    private readonly _torrents: Record<string, Torrent> = {};

    public newTorrent(filePath: string): string {
        const torrent = new Torrent(filePath, (t) => this.emit('torrentUpdate', t.info));
        this._torrents[torrent.id] = torrent;

        this.emit('torrentUpdate', torrent.info);

        return torrent.id;
    }

    /** Generates a peer id for the client.
     *
     * @see {@link http://www.bittorrent.org/beps/bep_0020.html}
     */
    private static makePeerId(payload: string = '-NT0000-') {
        const id = randomBytes(20);
        Buffer.from(payload).copy(id, 0);
        return id;
    }

    // public getTorrentById(id: string): TorrentInfo | undefined {
    //     return this._torrents[id]?.info;
    // }

    public getAllTorrents(): Record<string, TorrentInfo> {
        const output: Record<string, TorrentInfo> = {};
        for (const id in this._torrents) {
            output[id] = this._torrents[id].info;
        }
        return output;
    }
}

export default new TorrentTracker();
