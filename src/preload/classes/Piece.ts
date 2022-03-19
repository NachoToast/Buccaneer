import Parsers from './Parsers';
import Torrent from './Torrent';

/** Tracks which blocks and pieces of the requested torent file are downloaded. */
export default class Piece {
    private _requested: boolean[][];
    private _received: boolean[][];

    public constructor(torrent: Torrent) {
        this._requested = Parsers.buildPiecesArray(torrent);
        this._received = Parsers.buildPiecesArray(torrent);
    }

    public addRequestedPiece(index: number, begin: number): void {
        const blockIndex = begin / Parsers.BLOCK_LENGTH;
        this._requested[index][blockIndex] = true;
    }

    public addReceivedPiece(index: number, begin: number): void {
        const blockIndex = begin / Parsers.BLOCK_LENGTH;
        this._received[index][blockIndex] = true;
    }

    public needsPiece(index: number, begin: number): boolean {
        if (this._requested.every((blocks) => blocks.every((i) => i))) {
            this._requested = this._received.map((blocks) => [...blocks]); // deep copy
        }
        const blockIndex = begin / Parsers.BLOCK_LENGTH;

        return !this._requested[index][blockIndex];
    }

    public get done(): boolean {
        return this._received.every((blocks) => blocks.every((i) => i));
    }

    public getStats(): { total: number; downloaded: number } {
        const downloaded = this._received.reduce((total, blocks) => {
            return total + blocks.filter((i) => i).length;
        }, 0);

        const total = this._received.reduce((total, blocks) => {
            return total + blocks.length;
        }, 0);

        return { total, downloaded };
    }
}
