import Parsers from './Parsers';
import Torrent from './Torrent';

export default class Queue {
    private readonly _torrent: Torrent;

    private _queue: { index: number; begin: number; length: number }[] = [];
    public choked = true;

    public constructor(torrent: Torrent) {
        this._torrent = torrent;
    }

    public queue(pieceIndex: number): void {
        const numBlocks = Parsers.blocksPerPiece(this._torrent, pieceIndex);
        for (let i = 0; i < numBlocks; i++) {
            const pieceBlock = {
                index: pieceIndex,
                begin: i * Parsers.BLOCK_LENGTH,
                length: Parsers.blockLength(this._torrent, pieceIndex, i),
            };
            this._queue.push(pieceBlock);
        }
    }

    public deque() {
        return this._queue.shift();
    }

    public peek() {
        return this._queue.at(0);
    }

    public get length(): number {
        return this._queue.length;
    }
}
