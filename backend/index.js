const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const vision = require("@google-cloud/vision");
require("dotenv").config();
const CREDENTIALS = JSON.parse(
  JSON.stringify({
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY,
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_CERT,
    client_x509_cert_url: process.env.CLIENT_CERT,
    universe_domain: process.env.UNIVERSE_DOMAIN,
  })
);
const fs = require("fs");
const path = require("path");

const CONFIG = {
  credentials: {
    private_key: CREDENTIALS.private_key,
    client_email: CREDENTIALS.client_email,
  },
};
const client = new vision.ImageAnnotatorClient(CONFIG);

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.json({ message: "Server is working..." });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname + "/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const Data = multer({ storage: storage });

function getMainDomain(url) {
  const hostname = new URL(url).hostname;
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    const tld = parts.slice(-2).join(".");
    const domain = parts.slice(-3).join(".");
    if (tld.length === 2) {
      return parts.slice(-3).join(".");
    } else {
      return parts.slice(-2).join(".");
    }
  }
  return hostname;
}

app.post("/search", Data.any("files"), async (req, res) => {
  const img = req?.body?.image;

  if (res.status(200)) {
    try {
      const output_path = "image.png";
      const base64Data = img.replace(/^data:image\/png;base64,/, "");
      const binaryData = Buffer.from(base64Data, "base64");
      const filePath = path.join(__dirname, output_path);
      fs.writeFile(filePath, binaryData, async (err) => {
        if (err) {
          console.error("Failed to save the image:", err);
        } else {
          console.log("Image saved successfully at:", filePath);
          const [result] = await client.webDetection(filePath);
          const webDetection = result.webDetection;
          console.log(webDetection);

          if (webDetection.pagesWithMatchingImages.length > 0) {
            res.render("index.ejs", {
              pages: webDetection.pagesWithMatchingImages,
              images: webDetection.fullMatchingImages,
              getMainDomain,
            });
          } else {
            const [newResult] = await client.webDetection(
              webDetection.visuallySimilarImages?.[0]?.url
            );
            const newWebDetection = newResult.webDetection;
            res.render("index.ejs", {
              pages: newWebDetection.pagesWithMatchingImages,
              images: newWebDetection.fullMatchingImages,
              getMainDomain,
            });
          }
        }
      });
    } catch (error) {
      console.log(error);
      res.json({ message: "Some err" });
    }
  }
});

app.listen(3000, () => {
  console.log(`App listening on port 3000`);
});
