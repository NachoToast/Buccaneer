import Torrent from './Torrent';

export enum ActionTypes {
    Connect = 'connect',
    Announce = 'announce',
    Scrape = 'scrape',
    Error = 'error',
}

export interface ConnectResponse {
    /** Easier to leave as a buffer since can't read 64-bit integers. */
    connectionId: Buffer;
}

export interface AnnounceResponse {
    interval: number;
    leechers: number;
    seeders: number;
    peers: { ip: string; port: number }[];
}

interface ValidMiddlewareResponse {
    valid: true;
    action: ActionTypes;
    transactionId: number;
}

interface InvalidMiddlewareResponse {
    valid: false;
    reason: 'length' | 'transactionId' | 'action';
    fullReason: string;
}

export type MiddlewareResponse = ValidMiddlewareResponse | InvalidMiddlewareResponse;

export default abstract class Parsers {
    private static toActionType(actionIndex: number): ActionTypes {
        if (actionIndex === 0) return ActionTypes.Connect;
        if (actionIndex === 1) return ActionTypes.Announce;
        if (actionIndex === 2) return ActionTypes.Scrape;
        if (actionIndex === 3) return ActionTypes.Error;
        throw new Error(`Unknown action index: ${actionIndex}`);
    }

    public static parseConnectResponse(response: Buffer): ConnectResponse {
        return {
            connectionId: response.slice(8),
        };
    }

    private static groupPeers(peerBuffer: Buffer, groupSize: number): Buffer[] {
        const groups: Buffer[] = [];
        for (let i = 0, len = peerBuffer.length; i < len; i += groupSize) {
            groups.push(peerBuffer.slice(i, i + groupSize));
        }
        return groups;
    }

    public static parseAnnounceResponse(response: Buffer): AnnounceResponse {
        return {
            interval: response.readUInt32BE(8),
            leechers: response.readUint32BE(12),
            seeders: response.readUint32BE(16),
            peers: Parsers.groupPeers(response.slice(20), 6).map((address) => {
                return {
                    ip: address.slice(0, 4).join('.'),
                    port: address.readUInt16BE(4),
                };
            }),
        };
    }

    private static responsePacketLengths: Record<ActionTypes, number> = {
        [ActionTypes.Connect]: 16,
        [ActionTypes.Announce]: 20,
        [ActionTypes.Scrape]: 8,
        [ActionTypes.Error]: 8,
    };

    /** Validates packets to make sure they:
     *
     * - Are right length.
     * - Have valid action type.
     * - Match transaction ID.
     */
    public static responseMiddleware(transactionId: number, response: Buffer): MiddlewareResponse {
        let action: ActionTypes;
        try {
            action = Parsers.toActionType(response.readUInt32BE(0));
        } catch (error) {
            return {
                valid: false,
                reason: 'action',
                fullReason: error instanceof Error ? error.message : 'Unknown error',
            };
        }

        const requiredLength = Parsers.responsePacketLengths[action];
        if (response.length < requiredLength) {
            return {
                valid: false,
                reason: 'length',
                fullReason: `Invalid response length for ${action}, packet must be at least ${requiredLength} bytes (got ${response.length})`,
            };
        }

        const responseId = response.readUint32BE(4);
        if (responseId !== transactionId) {
            return {
                valid: false,
                reason: 'transactionId',
                fullReason: `Invalid transaction id, expected "${transactionId}", got ${response.readUInt32BE(4)}`,
            };
        }

        return {
            valid: true,
            action,
            transactionId: responseId,
        };
    }

    public static buildPiecesArray(torrent: Torrent): false[][] {
        const numPieces = torrent.torentFile.info.pieces.length / 20;
        const piecesArray = new Array(numPieces).fill(null);
        return piecesArray.map((_, i) => new Array(Parsers.blocksPerPiece(torrent, i)).fill(false));
    }

    public static blocksPerPiece(torrent: Torrent, pieceIndex: number): number {
        const pieceLength = Parsers.pieceLength(torrent, pieceIndex);

        return Math.ceil(pieceLength / Parsers.BLOCK_LENGTH);
    }

    /** Length of a given piece at the specified index.
     *
     * Mainly a function since the last piece in a buffer may be shorter than the rest.
     */
    public static pieceLength(torrent: Torrent, pieceIndex: number): number {
        const totalLength = torrent.size;
        const pieceLength = torrent.torentFile.info['piece length'];

        const lastPieceLength = totalLength % pieceLength;
        const lastPieceIndex = Math.floor(totalLength / pieceLength);

        return lastPieceIndex === pieceIndex ? lastPieceLength : pieceLength;
    }

    /** Similar to the {@link Parsers.pieceLength pieceLength} method. */
    public static blockLength(torrent: Torrent, pieceIndex: number, blockIndex: number): number {
        const pieceLength = Parsers.pieceLength(torrent, pieceIndex);

        const lastPieceLength = pieceLength % Parsers.BLOCK_LENGTH;
        const lastPieceIndex = Math.floor(pieceLength / Parsers.BLOCK_LENGTH);

        return blockIndex === lastPieceIndex ? lastPieceLength : Parsers.BLOCK_LENGTH;
    }

    /** 16384 bytes. */
    public static readonly BLOCK_LENGTH: number = Math.pow(2, 14);
}
