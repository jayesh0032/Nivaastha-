'use client';

/**
 * Compresses an image File in the browser using a Canvas element,
 * resizing it so its width is at most `maxWidth` (default 1600px)
 * and encoding as JPEG.
 */
export async function compressImage(
  file: File,
  maxWidth = 1600,
  quality = 0.82
): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);

        let targetWidth = img.naturalWidth || img.width;
        let targetHeight = img.naturalHeight || img.height;

        if (!targetWidth || !targetHeight) {
          resolve(file);
          return;
        }

        if (targetWidth > maxWidth) {
          const ratio = maxWidth / targetWidth;
          targetWidth = maxWidth;
          targetHeight = Math.round(targetHeight * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Keep original if compressed version is unexpectedly larger and width didn't shrink
            if (blob.size >= file.size && targetWidth === (img.naturalWidth || img.width)) {
              resolve(file);
              return;
            }

            const baseName = file.name.replace(/\.[^/.]+$/, '') || 'photo';
            const compressedFile = new File([blob], `${baseName}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        console.warn('Image compression failed, using original file:', err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export async function compressImages(
  files: File[],
  maxWidth = 1600,
  quality = 0.82
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, maxWidth, quality)));
}
