import { Socket } from 'net';
import { openSync, closeSync, write } from 'fs';
import Torrent from './Torrent';
import Messages from './Messages';
import Queue from './Queue';
import { PeerMessages } from '../../types/MessageTypes';
import Piece from './Piece';

export enum OnlyPeerStates {
    // life cycle
    Connecting = 'connecting',
    AwaitingHandshake = 'awaiting handshake',
    Interested = 'interested',
    Done = 'done',

    // errors
    SocketError = 'socket error',
    WriteError = 'write error',
}

export type PeerStates = OnlyPeerStates | PeerMessages;

type StateChangeHandler = (oldState: PeerStates, newState: PeerStates) => void;

export interface PeerConstructorProps {
    ip: string;
    port: number;
    onStateChange: StateChangeHandler;
    torrent: Torrent;
}

export default class Peer {
    public readonly ip: string;
    public readonly port: number;

    private readonly _onStateChange: StateChangeHandler;
    private readonly _torrent: Torrent;
    private readonly _socket: Socket = new Socket();
    private readonly _file: number;
    private readonly _pieces: Piece;
    private readonly _queue: Queue;

    private __state: PeerStates = OnlyPeerStates.Connecting;
    public get state(): PeerStates {
        return this.__state;
    }

    public set state(newState: PeerStates) {
        if (newState === this.__state) return;
        this._onStateChange(this.__state, newState);
        this.__state = newState;
    }

    public constructor(props: PeerConstructorProps) {
        const { ip, port, onStateChange, torrent } = props;
        this.ip = ip;
        this.port = port;
        this._onStateChange = onStateChange;
        this._torrent = torrent;
        this._file = openSync(torrent.outputFilePath, 'w');
        this._pieces = new Piece(torrent);
        this._queue = new Queue(torrent);

        this._socket.on('error', () => {
            this.cleanup(OnlyPeerStates.SocketError);
        });

        this._socket.connect(port, ip, () => {
            this.state = OnlyPeerStates.AwaitingHandshake;
            const message = Messages.buildHandshake(this._torrent);
            this._socket.write(message);
        });

        this.listenToWholeMessages();
    }

    private listenToWholeMessages() {
        let savedBuffer = Buffer.alloc(0);
        let isHandshake = true;

        this._socket.on('data', (receivedBuffer) => {
            const msgLen = () => (isHandshake ? savedBuffer.readUint8(0) + 49 : savedBuffer.readInt32BE(0) + 4);
            savedBuffer = Buffer.concat([savedBuffer, receivedBuffer]);
            while (savedBuffer.length >= 4 && savedBuffer.length >= msgLen()) {
                this.handleMessage(savedBuffer.slice(0, msgLen()));
                savedBuffer = savedBuffer.slice(msgLen());
                isHandshake = false;
            }
        });
    }

    private handleMessage(message: Buffer): void {
        if (Peer.isHandshake(message)) {
            this._socket.write(Messages.buildInterested());
            this.state = OnlyPeerStates.Interested;
        } else {
            const res = Messages.parseMessage(message);

            console.log(`peer ${this.ip} received message: ${res.id}`);

            switch (res.id) {
                case PeerMessages.Choke:
                    return this.cleanup(PeerMessages.Choke);
                case PeerMessages.Unchoke:
                    console.warn('unchoked');
                    this._queue.choked = false;
                    this.state = PeerMessages.Unchoke;
                    this.requestPiece();
                    break;
                case PeerMessages.Have:
                    this.handleHave(res.payload);
                    break;
                case PeerMessages.BitField:
                    this.handleBitField(res.payload);
                    break;
                case PeerMessages.Piece:
                    this.handlePiece(res.payload);
                    break;
                default:
                    this.state = res.id;
                    break;
            }
        }
    }

    private handlePiece(piece: { index: number; begin: number; block: Buffer }): void {
        this.state = PeerMessages.Piece;
        const doneStats = this._pieces.getStats();
        console.log(doneStats);

        this._pieces.addReceivedPiece(piece.index, piece.begin);

        const offset = piece.index * this._torrent.torentFile.info['piece length'] + piece.begin;
        write(this._file, piece.block, 0, piece.block.length, offset, (err, written) => {
            if (err) {
                console.log(`peer ${this.ip} has write error`);
                console.log(err);
                this.cleanup(OnlyPeerStates.WriteError);
            } else {
                console.log(`${this.ip}: wrote ${written} bytes`);
            }
        });

        if (this._pieces.done) {
            console.log(`${this.ip}: done!`);
            this.cleanup(OnlyPeerStates.Done);
        } else this.requestPiece();
    }

    private handleBitField(bitField: Buffer): void {
        this.state = PeerMessages.BitField;
        const queueWasEmpty = !this._queue.length;
        bitField.forEach((byte, index) => {
            for (let i = 0; i < 8; i++) {
                if (byte % 2) this._queue.queue(index * 8 + 7 - i);
                byte = Math.floor(byte / 2);
            }
        });
        if (queueWasEmpty) this.requestPiece();
    }

    private handleHave(piece: Buffer): void {
        this.state = PeerMessages.Have;
        const pieceIndex = piece.readUint32BE(0);
        const queueWasEmpty = !this._queue.length;
        this._queue.queue(pieceIndex);
        if (queueWasEmpty) this.requestPiece();
    }

    private requestPiece(): void {
        try {
            if (this._queue.choked) return void console.log('choked');

            let nextBlock = this._queue.deque();
            while (nextBlock) {
                if (this._pieces.needsPiece(nextBlock.index, nextBlock.begin)) {
                    console.log('requesting');
                    this._socket.write(Messages.buildRequest(nextBlock.index, nextBlock.begin, nextBlock.length));
                    this._pieces.addRequestedPiece(nextBlock.index, nextBlock.begin);
                    break;
                } else console.log("don't need");
                nextBlock = this._queue.deque();
            }
        } catch (error) {
            console.error(error);
        }
    }

    public ended = false;
    public cleanup(newState: PeerStates) {
        try {
            this._socket.end();
        } catch (error) {
            console.log(`peer ${this.ip} failed to end socket`);
            console.log(error);
        }
        try {
            closeSync(this._file);
        } catch (error) {
            console.log(`peer ${this.ip} failed to close file`);
            console.log(error);
        }
        this.ended = true;
        this.state = newState;
    }

    private static isHandshake(message: Buffer): boolean {
        return (
            message.length === message.readUint8(0) + 49 && message.toString('utf-8', 1, 20) === 'BitTorrent protocol'
        );
    }
}
