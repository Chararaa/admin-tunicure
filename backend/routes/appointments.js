const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const Order = require("../models/Order");
const Doctor = require("../models/Doctor");
const { sendEmailToClient } = require("../utils/emailService");

// GET all appointments for calendar
router.get("/calendar", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = {};

    if (startDate && endDate) {
      filter.dateTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const appointments = await Appointment.find(filter)
      .populate({
        path: "doctor",
        select: "personalInfo.name",
        options: { allowNull: true },
      })
      .populate({
        path: "order",
        select: "clientInfo.name clientInfo.email clientInfo.phone category",
        options: { allowNull: true },
      })
      .sort({ dateTime: 1 });

    const calendarEvents = appointments.map((apt) => {
      // Vérifications sécurisées
      const doctorName =
        apt.doctor?.personalInfo?.name || "Docteur non assigné";
      const clientName = apt.order?.clientInfo?.name || "Client inconnu";
      const category = apt.order?.category || "Non spécifié";
      let categoryName = "Non spécifié";
      if (apt.order) {
        if (apt.order.generalCategoryName) {
          categoryName = apt.order.generalCategoryName;
        } else if (apt.order.categoryName) {
          categoryName = apt.order.categoryName;
        } else if (
          apt.order.category &&
          typeof apt.order.category === "string"
        ) {
          categoryName = apt.order.category;
        } else if (apt.order.category && apt.order.category.name) {
          categoryName = apt.order.category.name;
        }
      }
      return {
        id: apt._id.toString(),
        title: `📅 RDV: ${clientName}`,
        start: apt.dateTime,
        end: new Date(apt.dateTime.getTime() + apt.duration * 60000),
        extendedProps: {
          doctorName: doctorName,
          clientName: clientName,
          clientEmail: apt.order?.clientInfo?.email || "",
          clientPhone: apt.order?.clientInfo?.phone || "",
          category: category,
          status: apt.status,
          notes: apt.description || "",
          appointmentId: apt._id.toString(),
          type: "appointment",
          category: categoryName,
        },
        backgroundColor: getEventColor(apt.status),
        borderColor: getEventColor(apt.status),
        textColor: "#ffffff",
      };
    });

    res.json(calendarEvents);
  } catch (error) {
    console.error("❌ Erreur route /calendar:", error);
    res.status(500).json({ error: error.message });
  }
});

// Fonction utilitaire pour les couleurs
function getEventColor(status) {
  const colors = {
    scheduled: "#0d6efd",
    confirmed: "#198754",
    completed: "#6c757d",
    cancelled: "#dc3545",
  };
  return colors[status] || "#6c757d";
}

// GET all appointments
router.get("/", async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("doctor")
      .populate("order")
      .sort({ dateTime: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single appointment
router.get("/:id", async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("doctor")
      .populate("order");

    if (!appointment) {
      return res.status(404).json({ error: "Rendez-vous non trouvé" });
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      orderId,
      doctorId, // Peut être null maintenant
      dateTime,
      duration,
      type = "consultation",
      appointmentLocation,
      appointmentNotes,
    } = req.body;

    const order = await Order.findById(orderId);
    // Supprimer la vérification obligatoire du docteur
    let doctor = null;
    if (doctorId) {
      doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ error: "Docteur non trouvé" });
      }
    }

    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    const appointment = new Appointment({
      order: orderId,
      doctor: doctorId, // Peut être null
      client: orderId,
      dateTime,
      duration: duration || 60,
      type: type,
      status: "scheduled",
      title: `RDV - ${order.category}`,
      description: appointmentNotes,
    });
    await appointment.save();

    // Mettre à jour la commande
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        status: "appointment_scheduled",
        "workflow.appointmentScheduledAt": new Date(),
        appointmentDate: dateTime,
        appointmentLocation: appointmentLocation,
        "notes.appointmentDate": dateTime,
        "notes.appointmentLocation": appointmentLocation,
        "notes.appointmentNotes": appointmentNotes,
      },
      { new: true },
    );

    // Envoyer email seulement si docteur assigné
    if (doctor) {
      const emailData = {
        clientEmail: order.clientInfo.email,
        clientName: order.clientInfo.name,
        procedure: order.category,
        pack: order.pack,
        dateTime: appointment.dateTime,
        duration: appointment.duration,
        doctorName: doctor.personalInfo.name,
        appointmentType: type,
      };

      try {
        await sendEmailToClient(emailData);
      } catch (emailError) {
        console.error("❌ Erreur envoi email:", emailError);
      }
    }

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate("doctor")
      .populate("order");

    res.status(201).json({
      success: true,
      message: "Rendez-vous créé avec succès",
      appointment: populatedAppointment,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("❌ Erreur création rendez-vous:", error);
    res.status(400).json({ error: error.message });
  }
});

// UPDATE appointment doctor assignment
router.patch("/:id/assign-doctor", async (req, res) => {
  try {
    const { doctorId } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ error: "Docteur non trouvé" });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { doctor: doctorId },
      { new: true },
    )
      .populate("order")
      .populate("doctor");

    if (!appointment) {
      return res.status(404).json({ error: "Rendez-vous non trouvé" });
    }

    res.json({
      success: true,
      message: "Docteur assigné au rendez-vous avec succès",
      appointment: appointment,
    });
  } catch (error) {
    console.error("❌ Erreur assignation docteur:", error);
    res.status(400).json({ error: error.message });
  }
});

// ✅ NOUVELLE ROUTE: Confirmer la date d'opération et envoyer email au client
router.patch("/:id/confirm-operation", async (req, res) => {
  try {
    const { confirmedDateTime, operationNotes } = req.body;

    const appointment = await Appointment.findById(req.params.id)
      .populate("doctor")
      .populate("order");

    if (!appointment) {
      return res.status(404).json({ error: "Rendez-vous non trouvé" });
    }

    // Mettre à jour avec la date confirmée
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        confirmedOperationDate: confirmedDateTime || appointment.dateTime,
        operationNotes: operationNotes,
        status: "operation_confirmed",
      },
      { new: true },
    )
      .populate("doctor")
      .populate("order");

    // ✅ ENVOYER EMAIL AU CLIENT AVEC LA DATE D'OPÉRATION CONFIRMÉE
    const emailData = {
      clientEmail: appointment.order.clientInfo.email,
      clientName: appointment.order.clientInfo.name,
      procedure: appointment.order.category,
      pack: appointment.order.pack,
      dateTime: confirmedDateTime || appointment.dateTime,
      duration: appointment.duration,
      doctorName: appointment.doctor?.personalInfo?.name || "À déterminer",
      operationNotes: operationNotes,
      appointmentLocation: appointment.order.appointmentLocation,
      // Vous pouvez ajouter d'autres infos spécifiques à l'opération
    };

    try {
      await sendEmailToClient(emailData);
      console.log("📧 Email de confirmation d'opération envoyé au client");
    } catch (emailError) {
      console.error("❌ Erreur envoi email confirmation:", emailError);
    }

    res.json({
      success: true,
      message: "Date d'opération confirmée avec succès",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("❌ Erreur confirmation opération:", error);
    res.status(400).json({ error: error.message });
  }
});

// UPDATE appointment
router.put("/:id", async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    )
      .populate("doctor")
      .populate("order");

    res.json(appointment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { status, notes } = req.body;
    console.log("📝 Mise à jour statut:", req.params.id, { status, notes });

    const validStatuses = ["scheduled", "confirmed", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      console.log("❌ Statut invalide:", status);
      return res.status(400).json({ error: "Statut invalide" });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate("doctor")
      .populate({
        path: "order",
        populate: {
          path: "category",
          model: "Category",
        },
      });

    if (!appointment) {
      console.log("❌ Rendez-vous non trouvé:", req.params.id);
      return res.status(404).json({ error: "Rendez-vous non trouvé" });
    }

    // Sauvegarder l'ancien statut
    const oldStatus = appointment.status;

    // Mettre à jour le statut du rendez-vous
    appointment.status = status;
    if (notes) {
      appointment.description = appointment.description
        ? appointment.description + "\n\n" + notes
        : notes;
    }

    await appointment.save();

    // CORRECTION: NE PAS ENVOYER D'EMAILS ICI
    // Les emails sont envoyés par une route séparée depuis le frontend
    // pour éviter les doubles envois

    console.log(`✅ Statut changé de ${oldStatus} à ${status}`);

    res.json({
      success: true,
      message: `Rendez-vous ${getStatusText(status)} avec succès`,
      appointment: appointment,
    });
  } catch (error) {
    console.error("❌ Erreur mise à jour statut:", error);
    res.status(400).json({
      error: error.message,
      details: "Vérifiez si le rendez-vous a une commande associée",
    });
  }
});

function getProcedureName(order) {
  if (!order) return "Procédure";

  // 1. Priorité : generalCategoryName
  if (order.generalCategoryName) {
    return order.generalCategoryName;
  }

  // 2. Si generalCategory est un objet avec name
  if (order.generalCategory && order.generalCategory.name) {
    return order.generalCategory.name;
  }

  // 3. categoryName
  if (order.categoryName) {
    return order.categoryName;
  }

  // 4. Si category est un objet avec name
  if (order.category && order.category.name) {
    return order.category.name;
  }

  // 5. Si category est une string
  if (typeof order.category === "string") {
    return order.category;
  }

  return "Procédure";
}

// DELETE appointment
router.delete("/:id", async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: "Rendez-vous non trouvé" });
    }

    // Mettre à jour le statut de la commande associée
    await Order.findByIdAndUpdate(appointment.order, {
      status: "pending",
      appointmentDate: null,
      "workflow.appointmentScheduledAt": null,
    });

    await Appointment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Rendez-vous supprimé avec succès",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fonction utilitaire pour obtenir le texte du statut
function getStatusText(status) {
  const statusTexts = {
    scheduled: "programmé",
    confirmed: "confirmé",
    completed: "terminé",
    cancelled: "annulé",
  };
  return statusTexts[status] || status;
}

// Fonction pour envoyer des emails de statut (à implémenter dans emailService)
async function sendStatusEmail(emailData) {
  // Implémentez cette fonction dans votre service d'email
  console.log("📧 Email de statut envoyé:", emailData);
}

// Dans votre route /api/appointments/calendar
exports.getCalendarEvents = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("doctor", "personalInfo.name")
      .populate("order", "clientInfo.name category")
      .lean();

    const events = appointments.map((appointment) => {
      // Vérifier si le docteur existe
      const doctorName =
        appointment.doctor && appointment.doctor.personalInfo
          ? appointment.doctor.personalInfo.name
          : "Docteur non assigné";

      const clientName =
        appointment.order && appointment.order.clientInfo
          ? appointment.order.clientInfo.name
          : "Client inconnu";

      return {
        id: appointment._id.toString(),
        title: `📅 RDV: ${clientName}`,
        start: appointment.dateTime,
        end: new Date(
          appointment.dateTime.getTime() + appointment.duration * 60000,
        ),
        extendedProps: {
          doctorName: doctorName,
          clientName: clientName,
          category: appointment.order?.category || "Non spécifié",
          status: appointment.status,
          notes: appointment.description || "",
          appointmentId: appointment._id.toString(),
          type: "appointment",
        },
      };
    });

    res.json(events);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({ error: error.message });
  }
};

router.post("/:id/send-reschedule-emails", async (req, res) => {
  try {
    const {
      oldDateTime,
      newDateTime,
      clientName,
      clientEmail,
      doctorEmail,
      doctorName,
      procedure,
      duration,
      notes,
    } = req.body;

    const {
      sendRescheduleEmailToDoctor,
      sendRescheduleEmailToClient,
    } = require("../utils/emailService");

    // Envoyer email au docteur (SI email fourni)
    if (doctorEmail) {
      await sendRescheduleEmailToDoctor({
        doctorEmail: doctorEmail,
        doctorName: doctorName || "Docteur",
        clientName: clientName,
        procedure: procedure || "Procédure", // FIX: valeur par défaut
        oldDateTime: oldDateTime,
        newDateTime: newDateTime,
        rescheduleReason: notes || "Reprogrammation",
        rescheduledBy: "Administrateur",
      });
    }

    // Envoyer email au client (TOUJOURS)
    await sendRescheduleEmailToClient({
      clientEmail: clientEmail,
      clientName: clientName,
      procedure: procedure || "Procédure", // FIX: valeur par défaut
      oldDateTime: oldDateTime,
      newDateTime: newDateTime,
      doctorName: doctorName || "le docteur",
      rescheduleReason: notes || "Reprogrammation nécessaire",
      duration: duration || 60,
    });

    res.json({
      success: true,
      message: "Emails de reprogrammation envoyés avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur envoi emails reprogrammation:", error);
    res.status(500).json({ error: error.message });
  }
});

// Dans appointments.js
router.post("/send-arrival-date-update", async (req, res) => {
  try {
    console.log("📧 Requête email modification arrivée reçue:", req.body);

    const {
      orderId,
      clientEmail,
      clientName,
      procedure,
      oldArrivalDate,
      newArrivalDate,
      updateReason,
    } = req.body;

    const { sendArrivalDateUpdateEmail } = require("../utils/emailService");

    // Si clientEmail n'est pas fourni, le récupérer depuis la base
    let finalClientEmail = clientEmail;
    if (!finalClientEmail && orderId) {
      try {
        const order = await Order.findById(orderId);
        if (order && order.clientInfo && order.clientInfo.email) {
          finalClientEmail = order.clientInfo.email;
          console.log("📧 Email récupéré depuis la base:", finalClientEmail);
        }
      } catch (dbError) {
        console.error("❌ Erreur récupération email depuis base:", dbError);
      }
    }

    if (!finalClientEmail) {
      console.error("❌ Email client non trouvé");
      return res.status(400).json({
        error: "Email client non trouvé. Impossible d'envoyer l'email.",
      });
    }

    // Appeler la fonction d'envoi d'email
    console.log("📤 Appel fonction sendArrivalDateUpdateEmail");
    await sendArrivalDateUpdateEmail({
      clientEmail: finalClientEmail,
      clientName: clientName || "Client",
      procedure: procedure || "Procédure",
      oldArrivalDate: oldArrivalDate,
      newArrivalDate: newArrivalDate,
      updateReason: updateReason || "Modification de date",
    });

    console.log("✅ Email d'arrivée envoyé avec succès");
    res.json({
      success: true,
      message: "Email de modification de date d'arrivée envoyé avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur envoi email modification arrivée:", error);
    res.status(500).json({
      error: error.message,
      details: "Vérifiez les logs pour plus d'informations",
    });
  }
});

// Route pour envoyer les emails d'annulation
router.post("/:id/send-cancellation-emails", async (req, res) => {
  try {
    const {
      clientEmail,
      clientName,
      doctorEmail,
      doctorName,
      procedure,
      appointmentDateTime,
      cancellationReason,
      cancelledBy,
    } = req.body;

    const {
      sendCancellationEmailToDoctor,
      sendCancellationEmailToClient,
    } = require("../utils/emailService");

    // Envoyer email au docteur
    if (doctorEmail) {
      await sendCancellationEmailToDoctor({
        doctorEmail: doctorEmail,
        doctorName: doctorName,
        clientName: clientName,
        procedure: procedure,
        appointmentDateTime: appointmentDateTime,
        cancellationReason: cancellationReason || "Non spécifiée",
        cancelledBy: cancelledBy || "Administrateur",
      });
    }

    // Envoyer email au client
    await sendCancellationEmailToClient({
      clientEmail: clientEmail,
      clientName: clientName,
      procedure: procedure,
      appointmentDateTime: appointmentDateTime,
      doctorName: doctorName,
      cancellationReason:
        cancellationReason || "Pour des raisons d'organisation",
      rescheduleInstructions:
        "Pour reprogrammer votre rendez-vous, contactez-nous par téléphone au +33 1 23 45 67 89.",
    });

    res.json({
      success: true,
      message: "Emails d'annulation envoyés avec succès",
    });
  } catch (error) {
    console.error("❌ Erreur envoi emails d'annulation:", error);
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;
