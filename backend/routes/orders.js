const express = require("express");
const router = express.Router();
const { auth, authorize } = require("../middleware/auth");
const Order = require("../models/Order");
const Doctor = require("../models/Doctor");
const GeneralCategory = require("../models/GeneralCategory");
const Category = require("../models/Category");
const multer = require("multer");
const path = require("path");
const {
  sendEmailToDoctor,
  sendEmailToClient,
  sendDoctorRemarksEmailToClient,
  sendNewOrderNotificationToAdmin,
  sendBookingConfirmationToClient,
} = require("../utils/emailService");
const {
  sendWhatsAppBookingNotification,
} = require("../utils/whatsappService");


// Configuration Multer pour l'upload d'images avec dossiers par client
const MIME_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isValid = MIME_TYPE[file.mimetype];
    let error = new Error("Type de fichier invalide");

    if (isValid) {
      error = null;

      // Récupérer le nom du client depuis le body
      let clientName = "unknown";
      try {
        const clientInfo =
          typeof req.body.clientInfo === "string"
            ? JSON.parse(req.body.clientInfo)
            : req.body.clientInfo;

        if (clientInfo && clientInfo.name) {
          // Nettoyer le nom pour le dossier : supprimer les caractères spéciaux
          clientName = clientInfo.name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-") // Remplacer les caractères non alphanumériques par des tirets
            .replace(/-+/g, "-") // Supprimer les tirets multiples
            .replace(/^-|-$/g, ""); // Supprimer les tirets au début et à la fin
        }
      } catch (e) {
        console.log(
          "❌ Erreur parsing clientInfo, utilisation du nom par défaut",
        );
      }

      // Créer le chemin du dossier client
      const clientFolder = path.join("backend/uploads", clientName);

      // Créer le dossier s'il n'existe pas
      const fs = require("fs");
      if (!fs.existsSync(clientFolder)) {
        fs.mkdirSync(clientFolder, { recursive: true });
        console.log(`📁 Dossier créé: ${clientFolder}`);
      }

      cb(null, clientFolder);
    } else {
      cb(error, false);
    }
  },
  filename: (req, file, cb) => {
    const name = file.originalname.toLowerCase().split(" ").join("-");
    const extension = MIME_TYPE[file.mimetype];

    // Générer un nom de fichier unique avec timestamp
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const imgName = `${
      name.split(".")[0]
    }-${timestamp}-${randomString}.${extension}`;

    cb(null, imgName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (MIME_TYPE[file.mimetype]) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Type de fichier non supporté. Seules les images JPG, PNG sont autorisées.",
        ),
        false,
      );
    }
  },
});

router.post("/", upload.array("photos", 5), async (req, res) => {
  try {
    console.log("📥 Requête reçue pour nouvelle commande");

    let orderData;

    // Parser les données
    if (req.body.orderData) {
      orderData = JSON.parse(req.body.orderData);
    } else {
      orderData = req.body;
    }

    // Parser les sous-objets JSON si nécessaire
    if (typeof orderData.clientInfo === "string") {
      orderData.clientInfo = JSON.parse(orderData.clientInfo);
    }
    if (typeof orderData.medicalInfo === "string") {
      orderData.medicalInfo = JSON.parse(orderData.medicalInfo);
    }
    if (
      orderData.additionalInfo &&
      typeof orderData.additionalInfo === "string"
    ) {
      orderData.additionalInfo = JSON.parse(orderData.additionalInfo);
    }

    // Récupérer les noms des catégories si non fournis
    if (orderData.generalCategory && !orderData.generalCategoryName) {
      try {
        const generalCat = await GeneralCategory.findById(
          orderData.generalCategory,
        );
        if (generalCat) {
          orderData.generalCategoryName = generalCat.name;
          console.log("📋 Catégorie générale trouvée:", generalCat.name);
        }
      } catch (err) {
        console.warn(
          "⚠️ Impossible de trouver la catégorie générale:",
          err.message,
        );
      }
    }

    if (orderData.category && !orderData.categoryName) {
      try {
        const category = await Category.findById(orderData.category);
        if (category) {
          orderData.categoryName = category.name;
          console.log("📋 Catégorie trouvée:", category.name);
        }
      } catch (err) {
        console.warn("⚠️ Impossible de trouver la catégorie:", err.message);
      }
    }

    // Gestion des photos
    let clientName = "unknown";
    if (orderData.clientInfo && orderData.clientInfo.name) {
      clientName = orderData.clientInfo.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    if (req.files && req.files.length > 0) {
      orderData.photos = req.files.map(
        (file) => `/images/${clientName}/${file.filename}`,
      );
      //console.log("🖼️ URLs des photos générées:", orderData.photos);
    }

    // Créer la commande
    const order = new Order(orderData);
    await order.save();

    console.log("✅ Commande créée avec succès, ID:", order._id);

    // Renvoyer la commande avec population
    const populatedOrder = await Order.findById(order._id)
      .populate("generalCategory")
      .populate("category");

    // 🔔 Send notifications non-blocking (emails + WhatsApp)
    sendNewOrderNotificationToAdmin(orderData).catch((err) =>
      console.error("❌ Admin notification email failed:", err.message)
    );
    sendBookingConfirmationToClient(orderData).catch((err) =>
      console.error("❌ Client confirmation email failed:", err.message)
    );
    sendWhatsAppBookingNotification(orderData).catch((err) =>
      console.error("❌ WhatsApp booking notification failed:", err.message)
    );


    res.status(201).json({
      success: true,
      message: "Commande créée avec succès",
      data: populatedOrder,
    });
  } catch (error) {
    console.error("❌ Erreur création commande:", error);
    res.status(400).json({
      success: false,
      error: error.message,
      details: error.errors ? error.errors : null,
    });
  }
});

// GET all orders with filters
router.get("/", async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    let filter = {};
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate("assignedToDoctor")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(filter);

    res.json({
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single order
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "assignedToDoctor",
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE order status to phone_confirmed
router.put("/:id/phone-confirm", async (req, res) => {
  try {
    const { phoneCallNotes, arrivalDate } = req.body;

    const updateData = {
      status: "phone_confirmed",
      "workflow.phoneCalledAt": new Date(),
      "workflow.phoneConfirmedAt": new Date(),
      "notes.phoneCallNotes": phoneCallNotes,
    };

    // Ajouter la date d'arrivée si elle est fournie
    if (arrivalDate) {
      updateData.arrivalDate = new Date(arrivalDate);
    }

    const order = await Order.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ASSIGN order to doctor and send email
router.put("/:id/assign-doctor", async (req, res) => {
  try {
    const { doctorId } = req.body;
    const order = await Order.findById(req.params.id);
    const doctor = await Doctor.findById(doctorId);

    if (!order || !doctor) {
      return res.status(404).json({ error: "Order or Doctor not found" });
    }

    // Vérifier si des photos existent
    if (order.photos && order.photos.length > 0) {
      console.log(
        `📧 Envoi email avec ${order.photos.length} photos au docteur ${doctor.personalInfo.email}`,
      );
    } else {
      console.log(
        `📧 Envoi email sans photos au docteur ${doctor.personalInfo.email}`,
      );
    }

    // Send email to doctor
    await sendEmailToDoctor(doctor.personalInfo.email, order);

    // Update order
    order.status = "doctor_assigned";
    order.assignedToDoctor = doctorId;
    order.workflow.sentToDoctorAt = new Date();
    await order.save();

    res.json({ message: "Doctor assigned and email sent", order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/:id/send-appointment-email", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    // Vérifier qu'un rendez-vous a été programmé
    if (order.status !== "appointment_scheduled") {
      return res.status(400).json({
        error:
          "La commande n'a pas de rendez-vous programmé. Statut actuel: " +
          order.status,
      });
    }

    // Récupérer la date du rendez-vous (vérifier plusieurs champs possibles)
    const appointmentDate =
      order.appointmentDate ||
      order.notes?.appointmentDate ||
      order.workflow?.appointmentScheduledAt;

    if (!appointmentDate) {
      return res.status(400).json({
        error: "Date de rendez-vous non trouvée dans la commande",
      });
    }

    // Préparer les données pour l'email
    const emailData = {
      clientEmail: order.clientInfo.email,
      clientName: order.clientInfo.name,
      procedure: order.categoryName || order.category,
      pack: order.pack,
      dateTime: appointmentDate,
      appointmentLocation:
        order.appointmentLocation ||
        order.notes?.appointmentLocation ||
        "À déterminer",
      appointmentNotes: order.notes?.appointmentNotes || "",
      doctorName: order.assignedToDoctor
        ? typeof order.assignedToDoctor === "object"
          ? order.assignedToDoctor.personalInfo?.name
          : "Docteur à confirmer"
        : "Docteur à déterminer",
    };

    console.log("📧 Données pour l'email:", emailData);

    // Envoyer l'email
    await sendEmailToClient(emailData);

    res.json({
      success: true,
      message: "Email de confirmation envoyé avec succès au client",
    });
  } catch (error) {
    console.error("❌ Erreur envoi email:", error);
    res.status(500).json({ error: error.message });
  }
});
// UPDATE when doctor replies
router.put("/:id/doctor-reply", async (req, res) => {
  try {
    const { doctorRemarks } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: "doctor_replied",
        "workflow.doctorRepliedAt": new Date(),
        "notes.doctorRemarks": doctorRemarks,
      },
      { new: true },
    );
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// COMPLETE order
router.put("/:id/complete", async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: "completed",
        "workflow.completedAt": new Date(),
      },
      { new: true },
    );

    // Update doctor statistics
    if (order.assignedToDoctor) {
      const doctor = await Doctor.findById(order.assignedToDoctor);
      await doctor.updateStatistics();
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE order
router.delete("/:id", async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE - Programmer un rendez-vous
router.put("/:id/schedule-appointment", async (req, res) => {
  try {
    const { appointmentDate, appointmentLocation, appointmentNotes } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: "appointment_scheduled",
        "workflow.appointmentScheduledAt": new Date(),
        appointmentDate: new Date(appointmentDate),
        appointmentLocation,
        "notes.appointmentNotes": appointmentNotes,
      },
      { new: true },
    );

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ✅ NOUVELLE ROUTE: Envoyer les remarques du docteur au client
router.post("/:id/send-doctor-remarks-email", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    // Vérifier que le docteur a répondu
    if (!order.notes?.doctorRemarks) {
      return res.status(400).json({
        error: "Aucune remarque du docteur disponible",
      });
    }

    // Récupérer le nom du docteur assigné
    let doctorName = "Docteur";
    if (order.assignedToDoctor) {
      if (typeof order.assignedToDoctor === "string") {
        const doctor = await Doctor.findById(order.assignedToDoctor);
        if (doctor) {
          doctorName = doctor.personalInfo.name;
        }
      } else if (order.assignedToDoctor.personalInfo?.name) {
        doctorName = order.assignedToDoctor.personalInfo.name;
      }
    }

    // Préparer les données pour l'email
    const emailData = {
      clientEmail: order.clientInfo.email,
      clientName: order.clientInfo.name,
      doctorName: doctorName,
      procedure: order.categoryName || order.category,
      doctorRemarks: order.notes.doctorRemarks,
      date: new Date().toLocaleDateString("fr-FR"),
      // Ajouter d'autres informations pertinentes
      pack: order.pack || "Standard",
      generalCategory: order.generalCategoryName || "Général",
    };

    // Envoyer l'email
    try {
      await sendDoctorRemarksEmailToClient(emailData);
      console.log("📧 Email des remarques du docteur envoyé au client");
    } catch (emailError) {
      console.error("❌ Erreur envoi email:", emailError);
      return res.status(500).json({
        error: "Erreur lors de l'envoi de l'email",
      });
    }

    // Optionnel: Mettre à jour le workflow
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        "workflow.doctorRemarksSentAt": new Date(),
        "workflow.doctorRemarksSentToClient": true,
      },
      { new: true },
    );

    res.json({
      success: true,
      message: "Email envoyé avec succès au client",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("❌ Erreur envoi email remarques docteur:", error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE order price
router.put("/:id/update-price", async (req, res) => {
  try {
    const { price } = req.body;

    if (price === undefined || price === null || price < 0) {
      return res.status(400).json({ error: "Prix invalide" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        price: price,
        "notes.price": price,
        updatedAt: new Date(),
      },
      { new: true },
    );

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// UPDATE order notes
router.put("/:id/update-notes", async (req, res) => {
  try {
    const { notes } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        notes: notes,
        updatedAt: new Date(),
      },
      { new: true },
    );

    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route pour envoyer l'email de modification de date d'arrivée
router.post("/send-arrival-date-update", async (req, res) => {
  try {
    const {
      orderId,
      clientEmail,
      clientName,
      procedure,
      oldArrivalDate,
      newArrivalDate,
      updateReason,
    } = req.body;

    // Récupérer l'email client depuis la base si non fourni
    let finalClientEmail = clientEmail;
    if (!finalClientEmail && orderId) {
      const order = await Order.findById(orderId);
      if (order && order.clientInfo && order.clientInfo.email) {
        finalClientEmail = order.clientInfo.email;
      }
    }

    if (!finalClientEmail) {
      return res.status(400).json({
        error: "Email client non trouvé",
      });
    }

    // Envoyer l'email
    const { sendArrivalDateUpdateEmail } = require("../utils/emailService");
    await sendArrivalDateUpdateEmail({
      clientEmail: finalClientEmail,
      clientName: clientName || "Client",
      procedure: procedure || "Procédure",
      oldArrivalDate: oldArrivalDate,
      newArrivalDate: newArrivalDate,
      updateReason: updateReason || "Modification de date",
    });

    res.json({
      success: true,
      message: "Email de modification de date d'arrivée envoyé",
    });
  } catch (error) {
    console.error("Erreur envoi email arrivée:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
