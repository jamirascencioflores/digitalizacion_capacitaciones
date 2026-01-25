// backend/src/config/cloudinary.js

const cloudinary = require("cloudinary").v2;

// Agrega esto solo para probar:
console.log("🔍 Intentando configurar Cloudinary...");
console.log("☁️ CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log(
  "🔑 API_KEY:",
  process.env.CLOUDINARY_API_KEY ? "Cargada ****" : "UNDEFINED ❌",
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
