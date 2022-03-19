import { contextBridge } from 'electron';
import TorrentTracker, { TorrentTrackerEvents } from './classes/TorrentTracker';
import handleFile from './handleFile';

function getVersion(): string {
    try {
        const easyVersion = process.env.npm_package_version;
        if (easyVersion) return easyVersion;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const packageJson: object = require('../../package.json');
        const packageVersion = (packageJson as { version?: string })?.version;
        if (packageVersion) return packageVersion;
        throw new Error('Unable to find version from process environment or package.json');
    } catch (error) {
        console.warn(error);
        return 'Unknown';
    }
}

const api = {
    version: getVersion(),
    handleFile: handleFile,
    // getTorrentById: (id: string) => TorrentTracker.getTorrentById(id),
    // getAllTorrents: () => TorrentTracker.getAllTorrents(),
    bind: <K extends keyof TorrentTrackerEvents>(event: K, callback: TorrentTrackerEvents[K]) => {
        TorrentTracker.on(event, callback);
    },
    unbind: (event: keyof TorrentTrackerEvents) => {
        TorrentTracker.removeAllListeners(event);
    },
    getAllTorrents: () => TorrentTracker.getAllTorrents(),
    num: () => TorrentTracker.listenerCount('torrentUpdate'),
};

contextBridge.exposeInMainWorld('api', api);

export default api;
