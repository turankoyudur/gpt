import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { createServer } from "./index";

const app = createServer();
const port = Number(process.env.PORT ?? 3000);

// ESM-safe __dirname (Node 18+)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dist/spa klasörü: dist/server/node-build.mjs dosyasına göre ../spa = dist/spa
const distPath = path.resolve(__dirname, "../spa");

// Static dosyaları servis et
app.use(express.static(distPath));

// React Router fallback (API rotaları hariç)
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  // Konsolda görünmesi önemli: start.bat loglarında da görürsün
  console.log(`[server] listening on http://localhost:${port}`);
});
