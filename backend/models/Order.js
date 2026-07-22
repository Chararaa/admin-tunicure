const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  // === INFORMATIONS CLIENT (Étape 1) ===
  clientInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "other", "prefer-not-to-say"],
    },
    country: { type: String, required: true },
    address: String,
    zipCode: String,
    state: String,
    dateBirth: Date,
    weight: Number,
    height: Number,
    age: Number,
  },

  arrivalDate: Date,

  // === INFORMATIONS MÉDICALES (Étape 4) ===
  medicalInfo: {
    smokes: { type: String, enum: ["yes", "no"] },
    alcoholConsumption: String,
    contagiousDisease: String,
    previousOperations: { type: String, enum: ["yes", "no"] },
    previousOperationsDetails: String,
    woundHealingAbnormality: String,
    bleedingClottingAbnormality: String,
    chronicMedication: { type: String, enum: ["yes", "no"] },
    allergies: { type: String, enum: ["yes", "no"] },
    allergiesDetails: String,
    expectations: String,
  },

  // === CATÉGORIES DYNAMIQUES (Étapes 2 & 3) ===
  generalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GeneralCategory",
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },

  // Noms pour affichage (facultatif mais utile)
  generalCategoryName: String,
  categoryName: String,

  // === PACK (optionnel maintenant) ===
  pack: {
    type: String,
    enum: ["bronze", "silver", "gold"],
    default: "bronze", // Par défaut bronze si besoin
  },

  // === PHOTOS (Étape 5) ===
  photos: [String],

  // === INFORMATIONS SUPPLÉMENTAIRES (Étape 4) ===
  additionalInfo: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // === WORKFLOW & STATUT ===
  status: {
    type: String,
    enum: [
      "pending",
      "under_review",
      "phone_confirmed",
      "doctor_assigned",
      "doctor_replied",
      "appointment_scheduled",
      "completed",
      "invoice_sent",
    ],
    default: "pending",
  },

  assignedToDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  workflow: {
    submittedAt: { type: Date, default: Date.now },
    phoneCalledAt: Date,
    phoneConfirmedAt: Date,
    sentToDoctorAt: Date,
    doctorRepliedAt: Date,
    appointmentScheduledAt: Date,
    completedAt: Date,
    invoiceSentAt: Date,
    depositPaidAt: Date,
    paymentConfirmedAt: Date,
  },

  notes: {
    phoneCallNotes: String,
    doctorRemarks: String,
    appointmentNotes: String,
    price: Number,
  },

  price: {
    type: Number,
    min: 0,
  },

  // Paiement Stripe
  stripe: {
    sessionId: String,
    paymentId: String,
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    depositAmount: Number,
    totalAmount: Number,
    paidAt: Date,
  },

  // Informations paiement
  isDepositPaid: { type: Boolean, default: false },
  depositPaid: { type: Boolean, default: false },
  amountPaid: { type: Number, default: 0 },
  remainingAmount: Number,

  // Token pour paiement sécurisé
  paymentToken: String,
  paymentTokenExpires: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// === MIDDLEWARE ===
orderSchema.pre("save", function (next) {
  // Calcul automatique de l'âge
  if (this.clientInfo.dateBirth) {
    const birthDate = new Date(this.clientInfo.dateBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    this.clientInfo.age = age;
  }

  // Mise à jour de la date de modification
  this.updatedAt = Date.now();
  next();
});

// === INDEXES POUR PERFORMANCE ===
orderSchema.index({ status: 1 });
orderSchema.index({ "clientInfo.email": 1 });
orderSchema.index({ category: 1 });
orderSchema.index({ generalCategory: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "workflow.submittedAt": -1 });

// === VIRTUALS POUR FACILITER L'AFFICHAGE ===
orderSchema.virtual("fullName").get(function () {
  return this.clientInfo.name;
});

orderSchema.virtual("email").get(function () {
  return this.clientInfo.email;
});

orderSchema.virtual("phone").get(function () {
  return this.clientInfo.phone;
});

// === METHODS UTILES ===
orderSchema.methods.getAge = function () {
  if (!this.clientInfo.dateBirth) return null;

  const birthDate = new Date(this.clientInfo.dateBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

orderSchema.methods.getStatusText = function () {
  const statusMap = {
    pending: "En attente",
    under_review: "En revue",
    phone_confirmed: "Confirmé par téléphone",
    doctor_assigned: "Docteur assigné",
    doctor_replied: "Docteur a répondu",
    appointment_scheduled: "RDV programmé",
    completed: "Terminé",
  };

  return statusMap[this.status] || this.status;
};

// === POPULATION AUTOMATIQUE ===
orderSchema.pre(/^find/, function (next) {
  // Population des références pour faciliter les requêtes
  this.populate("generalCategory", "name banner icon")
    .populate(
      "category",
      "name description averageDuration recoveryTime priceRange image",
    )
    .populate("assignedToDoctor", "personalInfo.name personalInfo.specialty");
  next();
});

module.exports = mongoose.model("Order", orderSchema);
