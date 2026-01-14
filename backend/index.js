const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const vision = require("@google-cloud/vision");
const path = require("path");
require("dotenv").config();

const {
  normalizePrivateKey,
  getMainDomain,
  buildRenderPayload,
  validateDataUrlImage,
  selectFallbackImage,
} = require("./lib/webDetection");

const requiredEnvVars = ["PROJECT_ID", "CLIENT_EMAIL", "PRIVATE_KEY"];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length) {
  throw new Error(
    `Missing Google Vision credentials: ${missingEnvVars.join(", ")}`
  );
}

const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES) || 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = (process.env.ALLOWED_MIME_TYPES || "image/png,image/jpeg,image/jpg")
  .split(",")
  .map((type) => type.trim())
  .filter(Boolean);
const REQUEST_TIMEOUT_MS = Number(process.env.VISION_TIMEOUT_MS) || 8000;
const MAX_RETRIES = Number(process.env.VISION_MAX_RETRIES) || 1;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const client = new vision.ImageAnnotatorClient({
  projectId: process.env.PROJECT_ID,
  credentials: {
    client_email: process.env.CLIENT_EMAIL,
    private_key: normalizePrivateKey(process.env.PRIVATE_KEY),
  },
});

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  cors(
    allowedOrigins.length
      ? { origin: allowedOrigins }
      : undefined
  )
);
app.use(bodyParser.json({ limit: "50kb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

const upload = multer({ limits: { fieldSize: MAX_IMAGE_BYTES + 1024 } });

const apiKey = process.env.API_KEY;
const requireApiKey = (req, res, next) => {
  if (!apiKey) return next();
  const providedKey = req.header("x-api-key");
  if (providedKey && providedKey === apiKey) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

const withTimeout = (promise, ms) => {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error("Vision request timed out"));
      }, ms);
    }),
  ]);
};

const runWithRetry = async (fn, maxRetries) => {
  let attempt = 0;
  let lastError;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt > maxRetries) {
        throw lastError;
      }
    }
  }
  throw lastError;
};

const detectWeb = async (imagePayload) => {
  const request = imagePayload.content
    ? { image: { content: imagePayload.content } }
    : { image: { source: { imageUri: imagePayload.imageUri } } };

  return runWithRetry(
    () =>
      withTimeout(
        client.webDetection(request).then(([result]) => result.webDetection || {}),
        REQUEST_TIMEOUT_MS
      ),
    MAX_RETRIES
  );
};

app.get("/", (req, res) => {
  res.json({ message: "Server is working..." });
});

app.post("/search", requireApiKey, upload.none(), async (req, res) => {
  const imagePayload = req?.body?.image;

  if (!imagePayload) {
    return res.status(400).json({ message: "Image data is required" });
  }

  const validation = validateDataUrlImage(imagePayload, {
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    maxSizeBytes: MAX_IMAGE_BYTES,
  });

  if (!validation.ok) {
    return res.status(400).json({ message: validation.error });
  }

  try {
    let webDetection = await detectWeb({ content: validation.buffer });
    let payload = buildRenderPayload(webDetection);

    if (!payload.pages.length) {
      const fallbackUrl = selectFallbackImage(webDetection);
      if (fallbackUrl) {
        webDetection = await detectWeb({ imageUri: fallbackUrl });
        payload = buildRenderPayload(webDetection);
      }
    }

    if (!payload.pages.length) {
      return res.status(200).render("index", {
        pages: [],
        images: [],
        message: "No visually similar products were found.",
        getMainDomain,
      });
    }

    return res.status(200).render("index", {
      ...payload,
      message: null,
      getMainDomain,
    });
  } catch (error) {
    console.error("Failed to process the image", error);
    return res.status(500).json({ message: "Unable to process the image" });
  }
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});

module.exports = { app, detectWeb };
