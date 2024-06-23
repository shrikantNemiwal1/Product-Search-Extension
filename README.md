# Product Search Extension using AI and Google Cloud Vision API

## Overview

This project is an extension of a product search application that leverages AI and Google Cloud Vision API to enhance the search functionality. By integrating advanced image recognition capabilities, this extension allows users to search for products using images, thereby improving the user experience and search accuracy.

## Features

- **Image-based Product Search**: Users can upload an image to search for similar products.
- **AI-powered Recognition**: Utilizes Google Cloud Vision API for image analysis and feature extraction.
- **Enhanced Search Accuracy**: Provides more relevant search results by analyzing visual features of the product images.
- **Seamless Integration**: Easily integrates with existing product search systems.

## Prerequisites

- Node.js (v14.x or later)
- Google Cloud Account with Vision API enabled
- API key for Google Cloud Vision API
- Environment variables setup

## Installation And Run Locally

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/product-search-extension.git
   cd product-search-extension
2. **Install dependencies**:
   ```bash
   npm i
3. **Setup the Enviroment Variable**:
   ```bash
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
   ### Genrate your .env file from goole colud vision api
4. **Run Server**:
   ```bash
    npm run dev
5. **Load Unpacked Extension**:
   - Click the `Load unpacked` button.
   - In the file dialog, navigate to and select your extension's folder.
6. **How To Use**:
   - Click on the icon of the extension in browser.
   - Take snap of the product of your desired product and get results.

    
