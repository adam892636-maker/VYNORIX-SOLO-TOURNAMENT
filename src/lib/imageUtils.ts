import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Compresses an image file via canvas to ensure reliable upload under 380KB,
 * uploads to Firebase Storage when available, and falls back to the compressed
 * data URL if Storage CORS/rules are unavailable in the sandbox.
 */
export async function compressAndUploadImage(
  file: File,
  storagePath: string,
  maxDimension = 960
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (PNG, JPG, or WebP).');
  }

  const dataUrl = await compressImageToDataUrl(file, maxDimension, 0.72);
  if (dataUrl.length > 430000) {
    const smallerUrl = await compressImageToDataUrl(file, 720, 0.55);
    if (smallerUrl.length > 430000) {
      throw new Error('Image is too large even after compression. Please choose a smaller screenshot.');
    }
    return tryStorageUpload(smallerUrl, storagePath);
  }

  return tryStorageUpload(dataUrl, storagePath);
}

async function tryStorageUpload(dataUrl: string, storagePath: string): Promise<string> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const storageRef = ref(storage, storagePath);
    const uploadPromise = uploadBytes(storageRef, blob, { contentType: 'image/jpeg' }).then(() =>
      getDownloadURL(storageRef)
    );
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timeout')), 3500)
    );
    const url = await Promise.race([uploadPromise, timeoutPromise]);
    return url;
  } catch {
    // Fallback to compressed inline data URL so proof upload never fails if Storage rules are unconfigured
    return dataUrl;
  }
}

function compressImageToDataUrl(file: File, maxDimension: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas compression unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
