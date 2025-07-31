export const parseRatio = (ratio: string): number => {
  const [width, height] = ratio.split(":").map(Number);
  return width / height;
};

export const cropImage = async (
  base64Image: string,
  targetRatio: string
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const sourceWidth = img.width;
      const sourceHeight = img.height;
      const sourceRatio = sourceWidth / sourceHeight;
      const targetRatioValue = parseRatio(targetRatio);

      let drawWidth = sourceWidth;
      let drawHeight = sourceHeight;
      let x = 0;
      let y = 0;

      if (sourceRatio > targetRatioValue) {
        // Source image is wider than target, crop width
        drawWidth = sourceHeight * targetRatioValue;
        x = (sourceWidth - drawWidth) / 2;
      } else {
        // Source image is taller than target, crop height
        drawHeight = sourceWidth / targetRatioValue;
        y = (sourceHeight - drawHeight) / 2;
      }

      canvas.width = drawWidth;
      canvas.height = drawHeight;
      ctx.drawImage(img, x, y, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight);
      resolve(canvas.toDataURL("image/jpeg"));
    };
    img.src = base64Image;
  });
};


/**
 * Fetches the Google Fonts CSS and all referenced font files,
 * returning a single CSS string with the fonts embedded as base64 data URLs.
 * This is crucial for ensuring fonts are available to html-to-image.
 * @param fontFamily The name of the Google Font family.
 * @returns A promise that resolves to a string of CSS with embedded fonts.
 */
export const getEmbeddedFontCss = async (fontFamily: string): Promise<string> => {
    if (!fontFamily) return '';

    // 1. Fetch the CSS from Google Fonts
    const fontCssUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
    const cssResponse = await fetch(fontCssUrl);
    let cssText = await cssResponse.text();

    // 2. Find all font URLs in the CSS text
    const fontUrls = cssText.match(/url\(https?:\/\/[^)]+\)/g) || [];

    // 3. Fetch each font file and convert it to a base64 data URL
    const fontPromises = fontUrls.map(async (url) => {
        const fontUrl = url.replace(/url\(|\)/g, '');
        try {
            const fontFileResponse = await fetch(fontUrl);
            const blob = await fontFileResponse.blob();

            return new Promise<[string, string]>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve([url, `url(${reader.result as string})`]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error(`Failed to fetch font: ${fontUrl}`, error);
            return [url, url]; // Return original url on failure
        }
    });

    const fontDataPairs = await Promise.all(fontPromises);

    // 4. Replace original URLs with base64 data URLs in the CSS text
    for (const [originalUrl, dataUrl] of fontDataPairs) {
        cssText = cssText.replace(originalUrl, dataUrl);
    }

    return cssText;
};
