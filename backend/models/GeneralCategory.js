const mongoose = require("mongoose");

const generalCategorySchema = new mongoose.Schema({
  // Nom de la catégorie générale
  name: {
    type: String,
    required: [true, "Le nom de la catégorie générale est obligatoire"],
    trim: true,
    unique: true,
    minlength: [3, "Le nom doit avoir au moins 3 caractères"],
    maxlength: [100, "Le nom ne doit pas dépasser 100 caractères"],
  },

  // Description de la catégorie générale
  description: {
    type: String,
    required: [true, "La description est obligatoire"],
    trim: true,
    minlength: [50, "La description doit avoir au moins 50 caractères"],
    maxlength: [20000, "La description ne doit pas dépasser 20000 caractères"],
  },

  // Banner (image large) - obligatoire
  banner: {
    type: String,
    required: [true, "La bannière est obligatoire"],
    trim: true,
  },

  // Vidéo (optionnelle)
  video: {
    type: String,
    default: "",
    trim: true,
    validate: {
      validator: function (v) {
        // Si vide, c'est OK
        if (!v) return true;

        // Validation des URLs de vidéo
        const youtubeRegex =
          /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
        const facebookRegex =
          /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch)\/.+$/;
        const instagramRegex =
          /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/.+$/;
        const vimeoRegex = /^(https?:\/\/)?(www\.)?vimeo\.com\/.+$/;

        return (
          youtubeRegex.test(v) ||
          facebookRegex.test(v) ||
          instagramRegex.test(v) ||
          vimeoRegex.test(v)
        );
      },
      message:
        "Veuillez fournir un lien valide vers YouTube, Facebook, Instagram ou Vimeo",
    },
  },

  // Type de vidéo (pour savoir comment l'afficher)
  videoType: {
    type: String,
    enum: ["", "youtube", "facebook", "instagram", "vimeo"],
    default: "",
  },

  // Image d'icône ou logo
  icon: {
    type: String,
    default: "",
    trim: true,
  },

  // Sous-catégories (références vers Category)
  subCategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
  ],

  // Ordre d'affichage
  displayOrder: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Statut
  isActive: {
    type: Boolean,
    default: true,
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
  slug: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
  },
  metaTitle: {
    type: String,
    trim: true,
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: 160,
  },
});

// Middleware pour générer un slug automatique
generalCategorySchema.pre("save", function (next) {
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-");
  }

  this.updatedAt = Date.now();
  next();
});

// Middleware pour supprimer les références dans les catégories lors de la suppression
generalCategorySchema.pre("remove", async function (next) {
  try {
    // Retirer cette catégorie générale des catégories qui y sont liées
    await mongoose
      .model("Category")
      .updateMany(
        { generalCategory: this._id },
        { $unset: { generalCategory: "" } }
      );
    next();
  } catch (error) {
    next(error);
  }
});

generalCategorySchema.pre("save", function (next) {
  if (this.video) {
    if (this.video.includes("youtube.com") || this.video.includes("youtu.be")) {
      this.videoType = "youtube";
    } else if (
      this.video.includes("facebook.com") ||
      this.video.includes("fb.watch")
    ) {
      this.videoType = "facebook";
    } else if (this.video.includes("instagram.com")) {
      this.videoType = "instagram";
    } else if (this.video.includes("vimeo.com")) {
      this.videoType = "vimeo";
    }

    // Nettoyer l'URL si c'est YouTube pour avoir l'ID
    if (this.videoType === "youtube") {
      this.video = this.cleanYoutubeUrl(this.video);
    }
  } else {
    this.videoType = "";
  }

  this.updatedAt = Date.now();
  next();
});

// Méthode pour nettoyer l'URL YouTube
generalCategorySchema.methods.cleanYoutubeUrl = function (url) {
  // Extraire l'ID de la vidéo YouTube
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  const videoId = match && match[7].length === 11 ? match[7] : null;

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return url;
};

// Méthode pour obtenir l'URL d'embed
generalCategorySchema.methods.getEmbedUrl = function () {
  if (!this.video || !this.videoType) return "";

  switch (this.videoType) {
    case "youtube":
      // Assure que c'est une URL d'embed
      if (!this.video.includes("embed")) {
        const videoId = this.extractYoutubeId(this.video);
        return videoId
          ? `https://www.youtube.com/embed/${videoId}`
          : this.video;
      }
      return this.video;

    case "facebook":
      // Convertir l'URL Facebook en URL d'embed
      return this.convertFacebookToEmbed(this.video);

    case "instagram":
      // URL d'embed Instagram
      return this.video.includes("embed") ? this.video : `${this.video}embed/`;

    case "vimeo":
      // Convertir en URL d'embed Vimeo
      const vimeoId = this.extractVimeoId(this.video);
      return vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : this.video;

    default:
      return this.video;
  }
};

// Méthodes utilitaires
generalCategorySchema.methods.extractYoutubeId = function (url) {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
};

generalCategorySchema.methods.extractVimeoId = function (url) {
  const regExp = /vimeo\.com\/(\d+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

generalCategorySchema.methods.convertFacebookToEmbed = function (url) {
  // Logique de conversion Facebook (peut nécessiter l'API Facebook)
  return url;
};

module.exports = mongoose.model("GeneralCategory", generalCategorySchema);
