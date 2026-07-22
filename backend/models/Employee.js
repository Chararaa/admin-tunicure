// models/Employee.js
const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  personalInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    image: { type: String, default: "" },
  },
  professionalInfo: {
    poste: {
      type: String,
      required: true,
      enum: ["marketing", "dev", "designer", "commercial"],
    },
    skills: { type: [String], default: [] },
    bio: { type: String, default: "" },
    hireDate: { type: Date, default: Date.now },
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

employeeSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Employee", employeeSchema);
