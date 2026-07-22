const express = require("express");
const router = express.Router();
// Chargez .env MANUELLEMENT en premier
require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

// DEBUG
console.log(
  "🔄 Dans paymentRoutes.js - STRIPE_SECRET_KEY:",
  process.env.STRIPE_SECRET_KEY ? "PRÉSENTE" : "ABSENTE",
);

// Créez Stripe avec gestion d'erreur
let stripe;
try {
  if (
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_SECRET_KEY.startsWith("sk_")
  ) {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    console.log("✅ Stripe initialisé avec clé réelle");
  } else {
    throw new Error("Clé Stripe invalide ou manquante");
  }
} catch (error) {
  console.log("⚠️ Mode test - Stripe mock activé:", error.message);
  stripe = {
    checkout: {
      sessions: {
        create: async (params) => {
          console.log("📋 [MOCK] Session Stripe créée");
          return {
            id: "cs_test_mock_" + Date.now(),
            url: "https://checkout.stripe.com/test_mode",
            payment_intent: "pi_test_mock_" + Date.now(),
            amount_total:
              params.line_items?.[0]?.price_data?.unit_amount || 1000,
          };
        },
      },
    },
  };
}
const Order = require("../models/Order");
const { sendInvoiceEmail } = require("../utils/emailService");

// Route pour créer une session de paiement Stripe
router.post("/create-payment-session/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { returnUrl } = req.body;

    // Récupérer la commande
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    // Calculer 10% du prix
    const depositAmount = Math.round(order.price * 10); // En centimes (10% du prix total)
    const totalAmount = Math.round(order.price * 100); // Prix total en centimes

    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Dépôt de garantie - ${order.categoryName || "Procédure"}`,
              description: `Dépôt de 10% pour la procédure: ${order.categoryName}. Reste à payer: ${(order.price * 0.9).toFixed(2)}€`,
            },
            unit_amount: depositAmount, // 10% en centimes
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_PAYMENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
      cancel_url: `${process.env.CLIENT_PAYMENT_URL}/payment/cancel?orderId=${orderId}`,
      client_reference_id: orderId,
      metadata: {
        orderId: orderId.toString(),
        customerEmail: order.clientInfo.email,
        customerName: order.clientInfo.name,
        totalAmount: totalAmount,
        depositAmount: depositAmount,
      },
    });

    // Mettre à jour la commande avec l'ID de session Stripe
    order.stripe = {
      sessionId: session.id,
      paymentStatus: "pending",
      depositAmount: depositAmount / 100, // Convertir en euros
      totalAmount: totalAmount / 100, // Convertir en euros
    };
    await order.save();

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      amount: depositAmount / 100,
    });
  } catch (error) {
    console.error("Erreur création session Stripe:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour envoyer l'email de facture
router.post("/send-invoice/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    // Calculer 10% du prix
    const depositAmount = order.price * 0.1;
    const remainingAmount = order.price * 0.9;

    // Générer un token unique pour le paiement sécurisé
    const paymentToken = require("crypto").randomBytes(32).toString("hex");

    // Sauvegarder le token dans la commande
    order.paymentToken = paymentToken;
    order.paymentTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours
    await order.save();

    // Générer l'URL de paiement
    const paymentUrl = `${process.env.CLIENT_PAYMENT_URL}/pay/${orderId}?token=${paymentToken}`;

    // Envoyer l'email avec la facture
    await sendInvoiceEmail({
      clientEmail: order.clientInfo.email,
      clientName: order.clientInfo.name,
      orderId: order._id,
      procedure: order.categoryName || "Procédure",
      totalAmount: order.price,
      depositAmount: depositAmount,
      remainingAmount: remainingAmount,
      paymentUrl: paymentUrl,
      paymentDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    });

    // Mettre à jour le statut
    order.status = "invoice_sent";
    order.workflow.invoiceSentAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: "Email de facture envoyé avec succès",
    });
  } catch (error) {
    console.error("Erreur envoi facture:", error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook Stripe pour les paiements réussis
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    console.log("📥 Webhook reçu, signature:", sig ? "PRÉSENTE" : "ABSENTE");
    console.log("🔑 Webhook secret configuré:", webhookSecret ? "OUI" : "NON");

    // SI tu as un vrai secret webhook, traite-le
    if (webhookSecret && webhookSecret.startsWith("whsec_")) {
      try {
        console.log("🔐 Traitement webhook réel...");
        const event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          webhookSecret,
        );

        console.log(`🎯 Événement Stripe: ${event.type}`);

        if (event.type === "checkout.session.completed") {
          const session = event.data.object;

          console.log(`💰 Session complétée: ${session.id}`);
          console.log(`💵 Montant: ${session.amount_total / 100}€`);
          console.log(`📧 Client: ${session.customer_details?.email}`);

          // Récupérer la commande
          const order = await Order.findOne({
            "stripe.sessionId": session.id,
          });

          if (order) {
            console.log(`✅ Commande trouvée: ${order._id}`);

            // Mettre à jour le statut de paiement
            order.stripe.paymentStatus = "completed";
            order.stripe.paymentId = session.payment_intent;
            order.stripe.paidAt = new Date();
            order.isDepositPaid = true;
            order.workflow.depositPaidAt = new Date();

            // Si c'est le dépôt de 10%, marquer comme tel
            if (session.amount_total === Math.round(order.price * 10)) {
              order.depositPaid = true;
              order.amountPaid = order.price * 0.1;
              order.remainingAmount = order.price * 0.9;
            }

            await order.save();
            console.log(`✅ Commande ${order._id} mise à jour`);

            // Envoyer l'email de confirmation
            const {
              sendPaymentConfirmationEmail,
            } = require("../utils/emailService");
            await sendPaymentConfirmationEmail({
              clientEmail: order.clientInfo.email,
              clientName: order.clientInfo.name,
              orderId: order._id,
              amount: session.amount_total / 100,
              paymentDate: new Date(),
              transactionId: session.payment_intent,
            });

            console.log(`📧 Email envoyé à: ${order.clientInfo.email}`);
          } else {
            console.log(`⚠️ Commande non trouvée pour session: ${session.id}`);
          }
        }

        res.json({ received: true, processed: true });
      } catch (error) {
        console.error("❌ Erreur webhook Stripe:", error.message);
        res.status(400).json({ error: error.message });
      }
    } else {
      // Mode test (pour développement sans CLI)
      console.log("⚠️ Mode test - Webhook ignoré");
      res.json({
        received: true,
        test_mode: true,
        message: "Webhook ignoré (mode test)",
      });
    }
  },
);

// AJOUTEZ CETTE ROUTE POUR TESTER MANUELLEMENT :
router.post("/simulate-payment/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    if (!order.price) {
      return res
        .status(400)
        .json({ error: "Prix non défini pour cette commande" });
    }

    // Simuler un paiement réussi
    const depositAmount = order.price * 0.1;

    order.isDepositPaid = true;
    order.depositPaid = true;
    order.amountPaid = depositAmount;
    order.remainingAmount = order.price * 0.9;

    order.stripe = {
      sessionId: "cs_test_" + Date.now(),
      paymentId: "pi_test_" + Date.now(),
      paymentStatus: "completed",
      paidAt: new Date(),
      depositAmount: depositAmount,
      totalAmount: order.price,
    };

    order.workflow.depositPaidAt = new Date();
    await order.save();

    // Envoyer l'email de confirmation
    const { sendPaymentConfirmationEmail } = require("../utils/emailService");
    await sendPaymentConfirmationEmail({
      clientEmail: order.clientInfo.email,
      clientName: order.clientInfo.name,
      orderId: order._id,
      amount: depositAmount,
      paymentDate: new Date(),
      transactionId: "pi_test_" + Date.now(),
    });

    res.json({
      success: true,
      message: "Paiement simulé avec succès ! Email envoyé.",
      order: {
        _id: order._id,
        isDepositPaid: order.isDepositPaid,
        amountPaid: order.amountPaid,
        clientEmail: order.clientInfo.email,
      },
    });
  } catch (error) {
    console.error("Erreur simulation paiement:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour vérifier le statut du paiement
router.get("/payment-status/:orderId", async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    res.json({
      depositPaid: order.depositPaid || false,
      amountPaid: order.amountPaid || 0,
      remainingAmount: order.remainingAmount || order.price,
      paymentStatus: order.stripe?.paymentStatus || "pending",
      paymentDate: order.stripe?.paidAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer les détails d'une commande (pour le frontend)
router.get("/order-details/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { token } = req.query;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Commande non trouvée" });
    }

    // Vérifier le token
    if (order.paymentToken !== token) {
      return res.status(401).json({ error: "Token invalide" });
    }

    // Vérifier l'expiration
    if (order.paymentTokenExpires && order.paymentTokenExpires < new Date()) {
      return res.status(401).json({ error: "Lien de paiement expiré" });
    }

    // Retourner les données nécessaires pour le frontend
    res.json({
      success: true,
      order: {
        _id: order._id,
        clientInfo: order.clientInfo,
        categoryName: order.categoryName,
        price: order.price,
        createdAt: order.createdAt,
        isDepositPaid: order.isDepositPaid,
        amountPaid: order.amountPaid,
        remainingAmount: order.remainingAmount,
        stripe: order.stripe,
      },
    });
  } catch (error) {
    console.error("Erreur récupération détails commande:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/verify/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log(`🔍 Vérification session: ${sessionId}`);

    // Option 1: Utiliser Stripe API
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    // Option 2: Chercher dans ta BDD
    const order = await Order.findOne({ "stripe.sessionId": sessionId });

    const response = {
      success: true,
      verified: true,
      sessionId: sessionId,
      paymentStatus: session.payment_status,
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency,
      date: new Date(session.created * 1000).toISOString(),
      orderFound: !!order,
      orderId: order?._id,
      clientEmail: order?.clientInfo.email,
    };

    console.log(
      `✅ Session vérifiée: ${sessionId}, statut: ${session.payment_status}`,
    );
    res.json(response);
  } catch (error) {
    console.error(
      `❌ Erreur vérification session ${req.params.sessionId}:`,
      error.message,
    );

    // Si session invalide, retourner quand même une réponse
    if (error.type === "StripeInvalidRequestError") {
      return res.json({
        success: true,
        verified: false,
        sessionId: req.params.sessionId,
        error: "Session Stripe invalide ou expirée",
        message:
          "Le paiement a été traité mais la session n'est plus disponible",
      });
    }

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
