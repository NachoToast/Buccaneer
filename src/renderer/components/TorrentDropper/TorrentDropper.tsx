import React, { createRef, useCallback, useState } from 'react';
import { Stack, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import './TorrentDropper.css';

const TorrentDropper = () => {
    const [isDraggedOver, setIsDraggedOver] = useState<boolean>(false);

    const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (!isDraggedOver) setIsDraggedOver(true);
        },
        [isDraggedOver],
    );

    const handleDragLeave = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (isDraggedOver) setIsDraggedOver(false);
        },
        [isDraggedOver],
    );

    const submitFiles = useCallback(
        (files: FileList) => {
            const filePaths: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files.item(i);
                if (file?.path) filePaths.push(file.path);
            }
            const ids = window.api.handleFile(filePaths);
            const newIds: string[] = [...ids, ...trackedIds];
            setTrackedIds(new Set(newIds));
        },
        [trackedIds],
    );

    /** Handles input from drag and drop. */
    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            setIsDraggedOver(false);
            submitFiles(e.dataTransfer.files);
        },
        [submitFiles],
    );

    const fileInput = createRef<HTMLInputElement>();
    /** Handles input from file select element. */
    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (fileInput.current?.files) {
                submitFiles(fileInput.current?.files);
                e.currentTarget.value = '';
            }
        },
        [fileInput, submitFiles],
    );

    const dragEventHandlers = {
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
    };

    return (
        <div className={`torrentDropper${isDraggedOver ? ' hovered' : ''}`} {...dragEventHandlers}>
            <Stack
                sx={{ height: '100%', width: '100%' }}
                alignItems="center"
                justifyContent="center"
                spacing={1}
                onClick={() => document.getElementById('inputTorrent')?.click()}
            >
                <UploadFileIcon sx={{ pointerEvents: 'none', fontSize: '64px' }} color="disabled" />
                <Typography variant="h5" sx={{ pointerEvents: 'none' }} className="noSelect">
                    Add Torrents
                </Typography>
            </Stack>
            <input
                id="inputTorrent"
                type="file"
                accept=".torrent"
                multiple
                style={{ display: 'none' }}
                onChange={handleChange}
                ref={fileInput}
            />
        </div>
    );
};

export default TorrentDropper;
