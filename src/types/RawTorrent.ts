export default interface RawTorrent {
    announce: Buffer;
    info: {
        files?: string[];
        length?: number;
    };
}

export type ResponseTypes = 'connect' | 'announce';
