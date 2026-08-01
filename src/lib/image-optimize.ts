/**
 * Browser-side image optimisation for admin uploads.
 * Restaurant owners upload straight-from-the-phone photos (3–8 MB JPEGs).
 * We resize, centre-crop to a consistent square and re-encode as WebP so the
 * storefront ships small, uniform images without the owner doing anything.
 */

export type OptimizeOptions = {
  /** Longest edge of the output image. */
  maxSize?: number;
  /** Crop to a square so every product card looks identical. */
  square?: boolean;
  quality?: number;
};

const canUseCanvas = () =>
  typeof document !== "undefined" && typeof HTMLCanvasElement !== "undefined";

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}

function toDataUrl(canvas: HTMLCanvasElement, quality: number) {
  const webp = canvas.toDataURL("image/webp", quality);
  // Safari < 14 and a few Android webviews silently fall back to PNG.
  if (webp.startsWith("data:image/webp")) return { dataUrl: webp, contentType: "image/webp", ext: "webp" };
  return { dataUrl: canvas.toDataURL("image/jpeg", quality), contentType: "image/jpeg", ext: "jpg" };
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Returns an upload-ready payload. Falls back to the original bytes when the
 * browser cannot use canvas (or the file is an SVG, which must not be rasterised).
 */
export async function optimizeImageForUpload(
  file: File,
  options: OptimizeOptions = {},
): Promise<{ fileName: string; contentType: string; base64: string; optimized: boolean; bytes: number }> {
  const { maxSize = 1200, square = true, quality = 0.82 } = options;
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";

  if (!canUseCanvas() || file.type === "image/svg+xml" || file.type === "image/gif") {
    const base64 = await readAsDataUrl(file);
    return {
      fileName: file.name,
      contentType: file.type || "image/jpeg",
      base64,
      optimized: false,
      bytes: file.size,
    };
  }

  try {
    const img = await loadImage(file);
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;

    let sx = 0;
    let sy = 0;
    let cropW = sw;
    let cropH = sh;
    if (square) {
      const side = Math.min(sw, sh);
      sx = Math.round((sw - side) / 2);
      sy = Math.round((sh - side) / 2);
      cropW = side;
      cropH = side;
    }

    const scale = Math.min(1, maxSize / Math.max(cropW, cropH));
    const outW = Math.max(1, Math.round(cropW * scale));
    const outH = Math.max(1, Math.round(cropH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, outW, outH);

    const { dataUrl, contentType, ext } = toDataUrl(canvas, quality);
    const bytes = Math.round(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);

    // If the "optimised" file somehow got bigger, keep the original.
    if (bytes >= file.size && Math.max(sw, sh) <= maxSize) {
      const base64 = await readAsDataUrl(file);
      return { fileName: file.name, contentType: file.type || "image/jpeg", base64, optimized: false, bytes: file.size };
    }

    return { fileName: `${baseName}.${ext}`, contentType, base64: dataUrl, optimized: true, bytes };
  } catch {
    const base64 = await readAsDataUrl(file);
    return {
      fileName: file.name,
      contentType: file.type || "image/jpeg",
      base64,
      optimized: false,
      bytes: file.size,
    };
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
