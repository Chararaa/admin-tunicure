const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  personalInfo: {
    name: { type: String, required: true },
    title: { type: String },
    email: { type: String, required: true, unique: true },
    phone: String,
    specialties: {
      type: [String],
      required: true,
      default: [],
    },
    licenseNumber: String,

    yearsOfExperience: Number,
    image: { type: String },
    bannerImage: { type: String },
    location: {
      country: String,
      international: { type: Boolean, default: false },
    },
  },

  professionalInfo: {
    bio: String,
    shortDescription: String,
    tagline: String,
    education: [String],
    certifications: [String],
    languages: [String],
    services: [
      {
        name: String,
        description: String,
      },
    ],
    experienceHighlights: [
      {
        title: String,
        value: String,
      },
    ],
    socialLinks: {
      website: String,
      instagram: String,
      linkedin: String,
      facebook: String,
    },
  },

  appointmentInfo: {
    bookingLink: String,
    beforeAfterGallery: [String],
    consultationFee: Number,
    availability: {
      days: [String],
      hours: String,
    },
  },

  statistics: {
    totalOperations: { type: Number, default: 0 },
    completedOperations: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    patientSatisfaction: { type: Number, default: 0 },
  },

  password: { type: String },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

doctorSchema.methods.updateStatistics = async function () {
  const Order = mongoose.model("Order");
  const completedOrders = await Order.countDocuments({
    assignedToDoctor: this._id,
    status: "completed",
  });

  const totalOrders = await Order.countDocuments({
    assignedToDoctor: this._id,
  });

  this.statistics.totalOperations = totalOrders;
  this.statistics.completedOperations = completedOrders;
  this.statistics.successRate =
    totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  await this.save();
};

// CRÉATION DU MODÈLE
const Doctor = mongoose.model("Doctor", doctorSchema);

// EXPORT DU MODÈLE
module.exports = Doctor;
