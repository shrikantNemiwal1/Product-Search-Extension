const normalizePrivateKey = (key = "") => key.replace(/\\n/g, "\n");

const getMainDomain = (url) => {
  const hostname = new URL(url).hostname;
  const parts = hostname.split(".");

  if (parts.length >= 3) {
    const last = parts[parts.length - 1];
    const secondLast = parts[parts.length - 2];

    // Heuristic: if both last labels are short (e.g., co.uk, com.au), keep three parts
    if (last.length === 2 && secondLast.length <= 3) {
      return parts.slice(-3).join(".");
    }

    return parts.slice(-2).join(".");
  }

  return hostname;
};

const buildRenderPayload = (webDetection = {}) => {
  const pages = webDetection.pagesWithMatchingImages || [];
  const images = webDetection.fullMatchingImages?.length
    ? webDetection.fullMatchingImages
    : webDetection.partialMatchingImages || [];
  return { pages, images };
};

const selectFallbackImage = (webDetection = {}) => {
  const similar = webDetection.visuallySimilarImages || [];
  return similar.length ? similar[0].url : null;
};

const validateDataUrlImage = (
  imagePayload,
  { allowedMimeTypes = [], maxSizeBytes = 5 * 1024 * 1024 } = {}
) => {
  if (typeof imagePayload !== "string" || !imagePayload.startsWith("data:")) {
    return { ok: false, error: "Invalid image payload" };
  }

  const matches = /^data:([^;]+);base64,(.*)$/i.exec(imagePayload);
  if (!matches) {
    return { ok: false, error: "Unsupported image format" };
  }

  const mimeType = matches[1];
  const base64Data = matches[2];

  if (allowedMimeTypes.length && !allowedMimeTypes.includes(mimeType)) {
    return { ok: false, error: "Unsupported image type" };
  }

  const sizeEstimate = Math.ceil((base64Data.length * 3) / 4); // base64 -> bytes
  if (sizeEstimate > maxSizeBytes) {
    return { ok: false, error: "Image is too large" };
  }

  try {
    const buffer = Buffer.from(base64Data, "base64");
    return { ok: true, buffer, mimeType, size: buffer.length };
  } catch (err) {
    return { ok: false, error: "Invalid image encoding" };
  }
};

module.exports = {
  normalizePrivateKey,
  getMainDomain,
  buildRenderPayload,
  selectFallbackImage,
  validateDataUrlImage,
};
