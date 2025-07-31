
import type { AspectRatio } from './types';

export const parseRatio = (ratio: string): number => {
    if (typeof ratio !== 'string') return 1;
    const parts = ratio.split(':').map(Number);
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1]) || parts[1] === 0) {
        return 1; // Default to 1:1 if invalid format
    }
    return parts[0] / parts[1];
};

export const findClosestSupportedRatio = (targetRatio: string, supportedRatios: ReadonlyArray<AspectRatio>): string => {
    if (!targetRatio || typeof targetRatio !== 'string') {
        return supportedRatios[0];
    }
    // If the entered ratio is exactly one of the supported ones, use it.
    if (supportedRatios.includes(targetRatio)) {
        return targetRatio;
    }

    const targetNumeric = parseRatio(targetRatio);
    let closestRatio = supportedRatios[0];
    let minDiff = Infinity;

    for (const supported of supportedRatios) {
        const supportedNumeric = parseRatio(supported);
        const diff = Math.abs(targetNumeric - supportedNumeric);
        if (diff < minDiff) {
            minDiff = diff;
            closestRatio = supported;
        }
    }
    return closestRatio;
};

export const cropImage = (imageDataUrl: string, targetRatioString: AspectRatio): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            const sourceWidth = img.width;
            const sourceHeight = img.height;
            const sourceRatio = sourceWidth / sourceHeight;
            
            const targetRatio = parseRatio(targetRatioString);

            let cropWidth: number, cropHeight: number, cropX: number, cropY: number;

            if (sourceRatio > targetRatio) {
                // Source is wider than target, crop sides
                cropHeight = sourceHeight;
                cropWidth = sourceHeight * targetRatio;
                cropX = (sourceWidth - cropWidth) / 2;
                cropY = 0;
            } else {
                // Source is taller than target, crop top/bottom
                cropWidth = sourceWidth;
                cropHeight = sourceWidth / targetRatio;
                cropX = 0;
                cropY = (sourceHeight - cropHeight) / 2;
            }

            canvas.width = cropWidth;
            canvas.height = cropHeight;

            ctx.drawImage(
                img,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                cropWidth,
                cropHeight
            );

            const fullDataUrl = canvas.toDataURL('image/jpeg', 0.95);
            resolve(fullDataUrl.split(',')[1]);
        };
        img.onerror = (err) => reject(err);
        img.src = imageDataUrl;
    });
};
