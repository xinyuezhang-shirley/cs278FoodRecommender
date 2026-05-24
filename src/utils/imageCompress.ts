/** Resize and JPEG-compress browser images for URLs / small DB fields (avatars, chat). */

export function compressImageFile(
  file: File,
  maxDimension = 400,
  jpegQuality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Pick an image file'));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width <= 0 || height <= 0) {
        reject(new Error('Invalid image'));
        return;
      }
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process image'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL('image/jpeg', jpegQuality));
      } catch {
        reject(new Error('Could not encode image'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image'));
    };
    img.src = objectUrl;
  });
}

// ─── Post payloads (embedded data URLs — must stay under PostgREST / mobile limits) ───

/** Align with compose guard — oversized strings risk failed saves. */
export const MAX_POST_IMAGE_DATA_URL_CHARS = 1_800_000;

/** Stay well under max so JSON margins never clip. */
const TARGET_POST_DATA_URL_CHARS = 920_000;

const POST_INITIAL_MAX_EDGE_PX = 1920;
const POST_MIN_MAX_EDGE_PX = 720;
const POST_INITIAL_JPEG_QUALITY = 0.9;
const POST_MIN_JPEG_QUALITY = 0.45;
const POST_QUALITY_STEP = 0.07;

function loadFileAsImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file).catch(async () => {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Could not decode image'));
        el.src = url;
      });
      return createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  });
}

function scaleBitmapToMaxEdge(width: number, height: number, maxEdge: number): { w: number; h: number } {
  const long = Math.max(width, height);
  if (long <= maxEdge) return { w: width, h: height };
  const scale = maxEdge / long;
  return {
    w: Math.max(1, Math.round(width * scale)),
    h: Math.max(1, Math.round(height * scale)),
  };
}

async function resizeImageBitmap(src: ImageBitmap, w: number, h: number): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(src, {
      resizeWidth: w,
      resizeHeight: h,
      resizeQuality: 'high',
    });
  } catch {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image compression not supported in this browser');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(src, 0, 0, w, h);
    return createImageBitmap(canvas);
  }
}

function imageBitmapToJpegDataUrl(bitmap: ImageBitmap, quality: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image compression not supported in this browser');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  try {
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return canvas.toDataURL('image/jpeg');
  }
}

/**
 * Aggressive resize + iterative JPEG quality for embedding in post `image_url`.
 * Targets a safe data-URL byte size; transparent PNG/GIF flatten onto white.
 */
export async function compressImageFileToPostDataUrl(file: File): Promise<string> {
  const looksImage =
    file.type.startsWith('image/')
    || /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(file.name);
  if (!looksImage) {
    throw new Error('Choose an image file.');
  }

  const src = await loadFileAsImageBitmap(file);

  try {
    let maxEdge = POST_INITIAL_MAX_EDGE_PX;
    while (maxEdge >= POST_MIN_MAX_EDGE_PX) {
      const { w, h } = scaleBitmapToMaxEdge(src.width, src.height, maxEdge);
      const working =
        w === src.width && h === src.height ? src : await resizeImageBitmap(src, w, h);
      try {
        let q = POST_INITIAL_JPEG_QUALITY;
        while (q >= POST_MIN_JPEG_QUALITY - 1e-6) {
          const dataUrl = imageBitmapToJpegDataUrl(working, q);
          if (dataUrl.length <= TARGET_POST_DATA_URL_CHARS) return dataUrl;
          q -= POST_QUALITY_STEP;
        }
      } finally {
        if (working !== src) working.close();
      }

      maxEdge = Math.floor(maxEdge * 0.82);
    }

    const { w, h } = scaleBitmapToMaxEdge(src.width, src.height, POST_MIN_MAX_EDGE_PX);
    const working =
      w === src.width && h === src.height ? src : await resizeImageBitmap(src, w, h);
    try {
      const dataUrl = imageBitmapToJpegDataUrl(working, POST_MIN_JPEG_QUALITY);
      if (dataUrl.length > MAX_POST_IMAGE_DATA_URL_CHARS) {
        throw new Error('Image is still too large after compression. Try another photo.');
      }
      return dataUrl;
    } finally {
      if (working !== src) working.close();
    }
  } finally {
    src.close();
  }
}
