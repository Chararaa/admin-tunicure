// routes/webhook.js - NOUVEAU FICHIER
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// Webhook pour recevoir les réponses emails
router.post("/email-reply", async (req, res) => {
  try {
    console.log("📥 Réponse email reçue:", req.body);

    const { from, to, subject, text, html, messageId, inReplyTo } = req.body;

    // Extraire le tracking ID du sujet
    const trackingMatch = subject.match(/TRACKING:([a-f0-9-]+)/);
    const trackingId = trackingMatch ? trackingMatch[1] : null;

    if (!trackingId) {
      console.log("❌ Aucun tracking ID trouvé dans le sujet");
      return res.status(400).json({ error: "Tracking ID manquant" });
    }

    // Trouver la commande correspondante
    const order = await Order.findOne({
      "emailTracking.trackingId": trackingId,
    }).populate("assignedToDoctor");

    if (!order) {
      console.log("❌ Commande non trouvée pour tracking ID:", trackingId);
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    // Mettre à jour la commande avec la réponse du docteur
    order.doctorReponse = {
      reponseText: text || html || "Réponse reçue sans contenu texte",
      reponseDate: new Date(),
      reponseEmail: from,
      sujetOriginal: subject,
    };

    // Mettre à jour le statut
    order.status = "doctor_replied";
    order.workflow.doctorRepliedAt = new Date();

    await order.save();

    console.log(
      "✅ Réponse du docteur enregistrée pour la commande:",
      order._id
    );

    // Envoyer une notification (optionnel)
    await envoyerNotificationReponse(order);

    res.status(200).json({
      success: true,
      message: "Réponse enregistrée",
      orderId: order._id,
    });
  } catch (error) {
    console.error("❌ Erreur traitement réponse email:", error);
    res.status(500).json({ error: error.message });
  }
});

// Fonction pour envoyer une notification (optionnel)
async function envoyerNotificationReponse(order) {
  try {
    // Tu peux envoyer un email de notification à l'admin
    // ou mettre à jour une interface en temps réel
    console.log(`🔔 Le docteur a répondu à la commande ${order._id}`);
  } catch (error) {
    console.error("Erreur notification:", error);
  }
}

module.exports = router;
