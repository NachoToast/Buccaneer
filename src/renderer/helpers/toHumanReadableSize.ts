export type FileSizes = 'B' | 'KB' | 'MB' | 'GB' | 'TB';
export const sizes: FileSizes[] = ['B', 'KB', 'MB', 'GB', 'TB'];

const precisionMap: Record<FileSizes, number> = {
    B: 0,
    KB: 0,
    MB: 2,
    GB: 2,
    TB: 2,
};

/** Converts a size in raw bytes to a human-readable format. */
function toHumanReadableSize(size: number): { unit: FileSizes; amount: string } {
    let unitIndex = 0;
    let amount = size;
    while (amount >= 1024 && unitIndex < sizes.length - 1) {
        amount /= 1024;
        unitIndex++;
    }

    const maxDecimalPlaces = precisionMap[sizes[unitIndex]];
    let stringAmount = amount.toFixed(maxDecimalPlaces);

    while (stringAmount.endsWith('0') || stringAmount.endsWith('.')) {
        stringAmount = stringAmount.slice(0, -1);
    }

    return { unit: sizes[unitIndex], amount: stringAmount };
}

export default toHumanReadableSize;
