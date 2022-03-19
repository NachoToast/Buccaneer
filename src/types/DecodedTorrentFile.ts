/** Shape of a decoded Torrent file.
 *
 * @see {@link https://wiki.theory.org/BitTorrentSpecification#Metainfo_File_Structure}
 */
export interface TorrentFile {
    /** The URL of the tracker. */
    announce: Buffer;
    info: SingleFileTorrentInfo | MultiFileTorrentInfo;

    /** Normally a client peer ID.
     * @see {@link http://www.bittorrent.org/beps/bep_0020.html}
     * @see {@link https://wiki.theory.org/BitTorrentSpecification#peer_id}
     *
     * @example 'uTorrent/1870'
     * @exanoke '-AZ2060-'
     */
    'created by'?: Buffer;
    'creation date'?: number;
    encoding?: Buffer;
    comment?: Buffer;
}

/** @see {@link https://en.wikipedia.org/wiki/Torrent_file#File_structure} */
interface BaseTorrentInfo {
    /** Suggested file/directory name. */
    name: Buffer;
    /** Number of bytes per piece. */
    'piece length': number;

    /** Hash list. AKA concatenation of each piece's SHA-1 hash. Length will be a multiple of 20 bytes. */
    pieces: Buffer;
}

export interface MultiFileTorrentInfo extends BaseTorrentInfo {
    files: {
        /** Size of the file in bytes. */
        length: number;

        /** Strings corresponding to subdirectory names, the last one is the actual file name. */
        path: string[];
    }[];

    /** Not in the official spec, added for Typescript convenience. */
    multi: true;
}

export interface SingleFileTorrentInfo extends BaseTorrentInfo {
    /** Size of the file in bytes. */
    length: number;

    /** Not in the official spec, added for Typescript convenience. */
    multi: false;
}
