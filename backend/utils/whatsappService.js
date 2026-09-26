const https = require("https");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

function sendWhatsAppMessage(text) {
  return new Promise((resolve) => {
    const phone = process.env.WHATSAPP_ADMIN_PHONE || "+447403904850";
    const apikey = process.env.WHATSAPP_CALLMEBOT_APIKEY || "4416581";

    if (!apikey || !phone) {
      console.warn("⚠️ WhatsApp CallMeBot credentials missing in .env");
      return resolve(null);
    }

    const encodedText = encodeURIComponent(text);
    const cleanPhone = phone.startsWith("+") ? phone : `+${phone}`;
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
      cleanPhone
    )}&text=${encodedText}&apikey=${encodeURIComponent(apikey)}`;

    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log("✅ WhatsApp admin notification sent successfully!");
            resolve(data);
          } else {
            console.error(
              `❌ WhatsApp API response error (${res.statusCode}):`,
              data
            );
            resolve(null);
          }
        });
      })
      .on("error", (err) => {
        console.error("❌ WhatsApp request error:", err.message);
        resolve(null);
      });
  });
}

async function sendWhatsAppBookingNotification(order) {
  try {
    const clientName = order.clientInfo?.name || "Client";
    const clientPhone = order.clientInfo?.phone || "Non renseigné";
    const clientEmail = order.clientInfo?.email || "Non renseigné";
    const clientCountry = order.clientInfo?.country || "Non renseigné";
    const procedure =
      order.categoryName ||
      order.generalCategoryName ||
      order.procedure ||
      "Non spécifiée";
    const pack = order.pack || "Standard";
    const age = order.clientInfo?.age ? `${order.clientInfo.age} ans` : "N/A";
    const weight = order.clientInfo?.weight ? `${order.clientInfo.weight} kg` : "N/A";
    const height = order.clientInfo?.height ? `${order.clientInfo.height} cm` : "N/A";
    const smokes = order.medicalInfo?.smokes || "N/A";
    const allergies = order.medicalInfo?.allergies || "None";
    const expectations = order.medicalInfo?.expectations || "";

    let message = `🔔 *NOUVELLE RÉSERVATION TUNICURE*\n\n`;
    message += `👤 *Patient:* ${clientName}\n`;
    message += `📞 *Téléphone:* ${clientPhone}\n`;
    message += `📧 *Email:* ${clientEmail}\n`;
    message += `🌍 *Pays:* ${clientCountry}\n\n`;
    message += `🏥 *Procédure:* ${procedure}\n`;
    message += `📦 *Pack:* ${pack}\n\n`;
    message += `🩺 *Détails Médicaux:*\n`;
    message += `• Âge: ${age} | Poids: ${weight} | Taille: ${height}\n`;
    message += `• Fumeur: ${smokes}\n`;
    message += `• Allergies: ${allergies}\n`;
    if (expectations) {
      message += `• Attentes: ${expectations}\n`;
    }
    if (order.photos && order.photos.length > 0) {
      message += `\n📸 *Photos:* ${order.photos.length} photo(s) jointe(s)\n`;
    }
    message += `\n🔗 *Dashboard:* https://admin.tunicure.com`;

    return await sendWhatsAppMessage(message);
  } catch (error) {
    console.error("❌ Erreur envoi WhatsApp Booking:", error.message);
  }
}

async function sendWhatsAppContactNotification(contactData) {
  try {
    const { name, email, subject, message: userMessage } = contactData;
    let message = `💬 *NOUVEAU MESSAGE DE CONTACT TUNICURE*\n\n`;
    message += `👤 *De:* ${name || "Visiteur"}\n`;
    message += `📧 *Email:* ${email || "Non renseigné"}\n`;
    message += `📌 *Sujet:* ${subject || "Contact Site Web"}\n\n`;
    message += `📝 *Message:*\n${userMessage || ""}`;

    return await sendWhatsAppMessage(message);
  } catch (error) {
    console.error("❌ Erreur envoi WhatsApp Contact:", error.message);
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppBookingNotification,
  sendWhatsAppContactNotification,
};
