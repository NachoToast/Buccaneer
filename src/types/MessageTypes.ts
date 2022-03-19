export enum PeerMessages {
    Choke = 'choke',
    Unchoke = 'unchoke',
    Interested = 'interested',
    NotInterested = 'not interested',
    Have = 'have',
    BitField = 'bitfield',
    Request = 'request',
    Piece = 'piece',
    Cancel = 'cancel',
}

export type SpecialMessages = PeerMessages.Request | PeerMessages.Piece | PeerMessages.Cancel;

interface BaseParseResult {
    size: number;
    id: PeerMessages;
    payload: unknown;
}

interface NonSpecialMessageParseResult extends BaseParseResult {
    id: Exclude<PeerMessages, SpecialMessages>;
    payload: Buffer;
}

interface BaseSpecialMessageParseResult extends BaseParseResult {
    id: SpecialMessages;
    payload: {
        index: number;
        begin: number;
    };
}

interface PieceMessageParseResult extends BaseSpecialMessageParseResult {
    id: PeerMessages.Piece;
    payload: {
        index: number;
        begin: number;
        block: Buffer;
    };
}

interface NonPieceMessageParseResult extends BaseSpecialMessageParseResult {
    id: Exclude<SpecialMessages, PeerMessages.Piece>;
    payload: {
        index: number;
        begin: number;
        length: Buffer;
    };
}

type SpecialParseResult = PieceMessageParseResult | NonPieceMessageParseResult;

export type MessageParseResult = SpecialParseResult | NonSpecialMessageParseResult;
