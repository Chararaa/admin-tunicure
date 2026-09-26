const express = require("express");
const router = express.Router();
const { sendWhatsAppContactNotification } = require("../utils/whatsappService");
const nodemailer = require("nodemailer");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const transporter = nodemailer.createTransport({
  host: "ssl0.ovh.net",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// POST /api/contact
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: "Name, email and message are required fields.",
      });
    }

    const contactData = { name, email, subject, message };

    // 1. 📱 Envoyer notification WhatsApp à l'administrateur
    sendWhatsAppContactNotification(contactData).catch((err) =>
      console.error("❌ Erreur WhatsApp Contact:", err.message)
    );

    // 2. 📧 Envoyer email de notification à l'administrateur
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `💬 Nouveau message de contact - ${name}: ${subject || "Sans sujet"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #073840; border-bottom: 2px solid #1FDFA9; padding-bottom: 10px;">💬 Nouveau message reçu via le site web</h2>
          <p><strong>De:</strong> ${name} &lt;${email}&gt;</p>
          <p><strong>Sujet:</strong> ${subject || "Non spécifié"}</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px;">
            <h4 style="margin-top: 0; color: #333;">Message :</h4>
            <p style="white-space: pre-line; color: #555;">${message}</p>
          </div>
          <p style="font-size: 12px; color: #888; margin-top: 20px;">TuniCure Web Contact System</p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions).catch((err) =>
      console.error("❌ Erreur Email Contact:", err.message)
    );

    res.json({
      success: true,
      message: "Your message has been received successfully!",
    });
  } catch (error) {
    console.error("❌ Erreur route contact:", error);
    res.status(500).json({
      success: false,
      error: "An error occurred while sending your message.",
    });
  }
});

module.exports = router;
