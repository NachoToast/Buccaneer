import { decode } from 'bencode';
import { readFileSync } from 'fs';
import { v4 as uuid } from 'uuid';
import { TorrentFile } from '../../types/DecodedTorrentFile';
import { createSocket, Socket } from 'dgram';
import { dirname, join } from 'path';
import Builders from './Builders';
import Parsers, { ActionTypes, AnnounceResponse, ConnectResponse } from './Parsers';
import TorrentInfo from '../../types/TorrentInfo';
import Peer, { PeerStates } from './Peer';

export enum TorrentStatuses {
    SearchingForPeers = 'Searching for peers',
    SearchForNewPeers = 'Searching for new peers',
    Ready = 'Ready to download',
    Errored = 'Errored',
}

export default class Torrent {
    public readonly id: string = uuid();
    public readonly torrentFilePath: string;
    public readonly torentFile: TorrentFile;
    public readonly outputFilePath: string;
    public readonly name: string;
    public readonly numFiles: number;
    /** Size in bytes. */
    public readonly size: number;
    public readonly startedAt: number = Date.now();

    private _announceResponse?: AnnounceResponse;
    private _connectionId?: Buffer;
    private _socket: Socket = createSocket('udp4');
    private _url: string;
    private _update: () => void;

    private __status: TorrentStatuses = TorrentStatuses.SearchingForPeers;
    private __lastStatusChange: number = Date.now();

    private _peerPool: { ip: string; port: number }[] = [];
    private _activePeers: Record<string, Peer> = {};
    private _discardedPeers: Record<string, Peer> = {};

    public constructor(filePath: string, onUpdate: (torrent: Torrent) => void) {
        this.torrentFilePath = filePath;
        this.torentFile = decode(readFileSync(filePath));

        this._url = this.torentFile.announce.toString('utf-8');
        this.name = this.torentFile.info.name.toString('utf-8');
        this.outputFilePath = join(dirname(this.torrentFilePath), this.name);
        this._update = () => onUpdate(this);

        if ((this.torentFile.info as { files?: [] })?.files) {
            this.torentFile.info.multi = true;
        } else this.torentFile.info.multi = false;

        if (this.torentFile.info.multi) {
            this.size = this.torentFile.info.files.map(({ length }) => length).reduce((a, b) => a + b);
            this.numFiles = this.torentFile.info.files.length;
        } else {
            this.size = this.torentFile.info.length;
            this.numFiles = 1;
        }

        this.main();
    }

    public get info(): TorrentInfo {
        return {
            id: this.id,
            name: this.name,
            startedAt: Date.now(),
            size: this.size,
            status: this.__status,
            statusSince: this.__lastStatusChange,
            leechers: this._announceResponse?.leechers ?? -1,
            seeders: this._announceResponse?.seeders ?? -1,
            peers: {
                total: this._announceResponse?.peers.length ?? -1,
                available: this._peerPool.length,
                active: Object.keys(this._activePeers).length,
                discarded: Object.keys(this._discardedPeers).length,
            },
            inputFilePath: this.torrentFilePath,
            outputFilePath: this.outputFilePath,
            numFiles: this.numFiles,
        };
    }

    private get _status(): TorrentStatuses {
        return this.__status;
    }

    private set _status(newStatus: TorrentStatuses) {
        this.__status = newStatus;
        this.__lastStatusChange = Date.now();
        this._update();
    }

    private async main(): Promise<void> {
        this._socket.on('error', (error) => {
            console.log(`${this.name} socket error`);
            console.log(error);
            this._status = TorrentStatuses.Errored;
            return;
        });

        try {
            await this.connect();
        } catch (error) {
            console.log(`${this.name} failed to connect`);
            console.log(error);
            this._status = TorrentStatuses.Errored;
            return;
        }

        await this.refreshPeers();
    }

    /**
     * Sends {@link Torrent.announce announce} requests at legal intervals.
     *
     * Used to update peer information (seeders, leechers, etc...).
     */
    private async refreshPeers(): Promise<void> {
        try {
            const res = await this.announce();
            this._peerPool = res.peers.filter(({ ip, port }) => {
                const key = Torrent.makePeerKey(ip, port);
                return !this._activePeers[key] && !this._discardedPeers[key];
            });
            this.activatePeers();

            this._update();
            setTimeout(() => this.refreshPeers(), res.interval * 1000);
        } catch (error) {
            console.log(`${this.name} failed to announce`);
            console.log(error);
            this._status = TorrentStatuses.Errored;
        }
    }

    public static MAX_PEERS = 30;
    private activatePeers() {
        const numActivePeers = Object.values(this._activePeers).length;

        // > 30 peers has diminishing returns and bandwidth considerations
        if (numActivePeers > Torrent.MAX_PEERS) return;

        if (!this._peerPool.length) {
            this._status = TorrentStatuses.SearchForNewPeers;
            this._update();
            return;
        }

        const peersToAdd = this._peerPool.slice(0, Torrent.MAX_PEERS - numActivePeers);
        this._peerPool.splice(0, peersToAdd.length);
        // console.log(`${this.name} adding ${peersToAdd.length} peers (currently active: ${numActivePeers})`);

        peersToAdd.forEach(({ ip, port }) => {
            const key = Torrent.makePeerKey(ip, port);
            const peer = new Peer({
                ip,
                port,
                onStateChange: (oldS, newS) => this.handlePeerStateChange(key, oldS, newS),
                torrent: this,
            });

            this._activePeers[key] = peer;
        });
    }

    private handlePeerStateChange(key: string, oldState: PeerStates, newState: PeerStates): void {
        const peer = this._activePeers[key] as Peer | undefined;
        if (!peer) {
            console.warn(`Got state change from ${key} which has ended: ${oldState} => ${newState}`);
            return;
        }

        if (peer.ended) {
            delete this._activePeers[key];
            this._discardedPeers[key] = peer;
            this._update();
            this.activatePeers();
            return;
        }

        console.log(`${key} changed state: ${oldState} => ${newState}`);
    }

    private async announce(): Promise<AnnounceResponse> {
        if (!this._connectionId) throw new Error('Tried to announce without a connection ID');
        const { payload: request, transactionId } = Builders.buildAnnounceRequest(this._connectionId, this);
        const req = await Builders.udpSend(this._socket, request, this._url);
        if (req.error) throw req.error;

        return new Promise((resolve, reject) => {
            this._socket.once('message', (response) => {
                const info = Parsers.responseMiddleware(transactionId, response);

                if (!info.valid) {
                    reject(info);
                    return;
                }

                if (info.action !== ActionTypes.Announce) {
                    reject(`Expected announce response, got ${info.action} response instead`);
                    return;
                }

                const announceResponse = Parsers.parseAnnounceResponse(response);
                this._announceResponse = announceResponse;
                resolve(announceResponse);
            });
        });
    }

    private async connect(): Promise<ConnectResponse> {
        const { payload: request, transactionId } = Builders.buildConnectionRequest();
        const req = await Builders.udpSend(this._socket, request, this._url);
        if (req.error) throw req.error;

        return new Promise((resolve, reject) => {
            this._socket.once('message', (response) => {
                const info = Parsers.responseMiddleware(transactionId, response);

                if (!info.valid) {
                    reject(info);
                    return;
                }

                if (info.action !== ActionTypes.Connect) {
                    reject(`Expected connect response, got ${info.action} response instead`);
                    return;
                }

                const connectResponse = Parsers.parseConnectResponse(response);
                this._connectionId = connectResponse.connectionId;
                resolve(connectResponse);
            });
        });
    }

    private static makePeerKey(ip: string, port: number) {
        return `${ip}:${port}`;
    }
}
