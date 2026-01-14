const test = require("node:test");
const assert = require("node:assert");

const {
  getMainDomain,
  buildRenderPayload,
  validateDataUrlImage,
  selectFallbackImage,
} = require("../lib/webDetection");

test("getMainDomain handles subdomains", () => {
  assert.strictEqual(getMainDomain("https://shop.example.co.uk"), "example.co.uk");
  assert.strictEqual(getMainDomain("https://images.example.com"), "example.com");
});

test("buildRenderPayload prefers full matching images", () => {
  const payload = buildRenderPayload({
    pagesWithMatchingImages: [{ url: "https://example.com" }],
    fullMatchingImages: [{ url: "a" }],
    partialMatchingImages: [{ url: "b" }],
  });
  assert.deepStrictEqual(payload.images, [{ url: "a" }]);
});

test("validateDataUrlImage rejects oversized payload", () => {
  const tinyPng = "data:image/png;base64," + Buffer.alloc(6 * 1024 * 1024).toString("base64");
  const result = validateDataUrlImage(tinyPng, { maxSizeBytes: 1024, allowedMimeTypes: ["image/png"] });
  assert.strictEqual(result.ok, false);
  assert.match(result.error, /too large/i);
});

test("validateDataUrlImage accepts supported mime", () => {
  const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgVSm6DcAAAAASUVORK5CYII=";
  const result = validateDataUrlImage(pixel, { maxSizeBytes: 1024, allowedMimeTypes: ["image/png"] });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.mimeType, "image/png");
});

test("selectFallbackImage returns first similar", () => {
  const url = selectFallbackImage({ visuallySimilarImages: [{ url: "https://a" }, { url: "https://b" }] });
  assert.strictEqual(url, "https://a");
});
