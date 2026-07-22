const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: false,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },

  dateTime: { type: Date, required: true },
  duration: { type: Number, default: 120 },
  type: { type: String, enum: ["consultation", "surgery"], default: "surgery" },

  status: {
    type: String,
    enum: ["scheduled", "confirmed", "completed", "cancelled"],
    default: "scheduled",
  },

  title: String,
  description: String,

  createdAt: { type: Date, default: Date.now },
});

appointmentSchema.pre("save", async function (next) {
  const order = await mongoose.model("Order").findById(this.order);
  const doctor = await mongoose.model("Doctor").findById(this.doctor);

  if (order && doctor) {
    this.title = `${order.category} - ${order.clientInfo.name}`;
    this.description = `Doctor: ${doctor.personalInfo.name}, Client: ${order.clientInfo.name}, Pack: ${order.pack}`;
  }

  next();
});

module.exports = mongoose.model("Appointment", appointmentSchema);
