const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

// ✅ Charger .env S'IL EXISTE, sinon continuer
try {
  require("dotenv").config();
  console.log("✅ Fichier .env chargé");
} catch (error) {
  console.log(
    "⚠️ Aucun fichier .env trouvé, utilisation des valeurs par défaut",
  );
}

const app = express();

// ✅ IMPORTANT: Webhook Stripe AVANT body-parser (AJOUTER CES 3 LIGNES)
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    // On redirige vers le routeur paymentRoutes
    require("./routes/paymentRoutes")(req, res, next);
  },
);

// ✅ Valeurs par défaut si .env n'existe pas
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/medical-clinic";
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_2025";

// Connexion MongoDB
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
   useFindAndModify: false,
    useCreateIndex: true,
  })
  .then(() => console.log("✅ MongoDB connecté avec succès"))
  .catch((err) => console.log("❌ Erreur MongoDB:", err));

// Middlewares
app.use(helmet());
// ✅ CORS PLUS PERMISSIF
app.use(
  cors({
    origin: true, // Autorise toutes les origines
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  }),
);

// ✅ Rate Limiting (mon code)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// ✅ Body Parser (ton code + mon amélioration)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ✅ Static Files (ton code adapté)
app.use("/images", express.static(path.join(__dirname, "backend/uploads")));

// ✅ IMPORTANT: Importer paymentRoutes ICI
const paymentRoutes = require("./routes/paymentRoutes");

// ✅ Routes API (mes routes)
app.use("/api/auth", require("./routes/auth"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/doctors", require("./routes/doctors"));
app.use("/api/appointments", require("./routes/appointments"));
app.use("/api/employees", require("./routes/employees"));
app.use("/api/generalcategories", require("./routes/generalCategories"));
app.use("/api/categories", require("./routes/category"));
app.use("/api/payment", paymentRoutes);
app.use("/api/verify", paymentRoutes);
app.use("/api/countries", require("./routes/countries"));

// ✅ Welcome Route (mon code)
app.get("/", (req, res) => {
  res.json({
    message: "Medical Clinic API is running!",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      orders: "/api/orders",
      doctors: "/api/doctors",
      appointments: "/api/appointments",
      employees: "/api/employees",
      categories: "/api/categories",
      payment: "/api/payment",
      verify: "/api/verify/:sessionId",
    },
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ✅ Export app (ton code)
module.exports = app;
