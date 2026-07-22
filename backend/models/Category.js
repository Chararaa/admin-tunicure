const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  generalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GeneralCategory",
    index: true,
  },
  // Nom de la catégorie
  name: {
    type: String,
    required: [true, "Le nom de la catégorie est obligatoire"],
    trim: true,
    unique: true,
    minlength: [3, "Le nom doit avoir au moins 3 caractères"],
    maxlength: [100, "Le nom ne doit pas dépasser 100 caractères"],
  },

  // Image principale
  image: {
    type: String,
    default: "",
    trim: true,
  },

  // Bannière (image large)
  banner: {
    type: String,
    default: "",
    trim: true,
  },

  // Description complète
  description: {
    type: String,
    required: [true, "La description est obligatoire"],
    trim: true,
    minlength: [50, "La description doit avoir au moins 50 caractères"],
    maxlength: [20000, "La description ne doit pas dépasser 20000 caractères"],
  },

  // Mots-clés (tableau)
  keywords: [
    {
      type: String,
      trim: true,
    },
  ],

  // Durée moyenne de la procédure
  averageDuration: {
    type: String,
    required: [true, "La durée moyenne est obligatoire"],
    trim: true,
  },

  // Temps de récupération
  recoveryTime: {
    type: String,
    required: [true, "Le temps de récupération est obligatoire"],
    trim: true,
  },

  priceRange: {
    min: {
      type: Number,
      required: [true, "Le prix minimum est obligatoire"],
      min: [0, "Le prix ne peut pas être négatif"],
    },
    max: {
      type: Number,
      required: [true, "Le prix maximum est obligatoire"],
      min: [0, "Le prix ne peut pas être négatif"],
      validate: {
        validator: function (value) {
          // Vérifie d'abord si priceRange existe
          if (!this.priceRange || !this.priceRange.min) {
            return true; // ou false selon ton besoin
          }
          return value >= this.priceRange.min;
        },
        message: "Le prix maximum doit être supérieur ou égal au prix minimum",
      },
    },
    currency: {
      type: String,
      default: "EUR",
      enum: ["EUR", "USD", "GBP", "MAD", "CAD", "AUD"],
    },
  },

  // Statut
  isActive: {
    type: Boolean,
    default: true,
  },

  // Informations supplémentaires
  benefits: [
    {
      title: String,
      description: String,
    },
  ],

  faqs: [
    {
      question: String,
      answer: String,
    },
  ],

  // Ordre d'affichage
  displayOrder: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Statistiques (optionnelles)
  popularityScore: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Métadonnées
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },

  // SEO
  metaTitle: {
    type: String,
    trim: true,
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: 160,
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
  },
});

// Middleware pour générer un slug automatique
categorySchema.pre("save", function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Supprime les caractères spéciaux
      .replace(/\s+/g, "-") // Remplace les espaces par des tirets
      .replace(/--+/g, "-"); // Supprime les doubles tirets
  }

  this.updatedAt = Date.now();
  next();
});

// Index pour les recherches
categorySchema.index({ name: "text", description: "text", keywords: "text" });
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.model("Category", categorySchema);
