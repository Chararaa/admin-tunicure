const nodemailer = require("nodemailer");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");

// ✅ Charge le .env directement depuis ce fichier
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const transporter = nodemailer.createTransport({
  host: "ssl0.ovh.net", // Serveur SMTP OVH
  port: 465, // Port 465 pour SSL
  secure: true, // true car port 465 = SSL/TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.log("❌ Erreur configuration email:", error);
  } else {
    console.log("✅ Serveur email prêt à envoyer des messages");
  }
});

async function sendEmailToDoctor(doctorEmail, order) {
  try {
    console.log(`📧 Attempt to send email to doctor: ${doctorEmail}`);
    console.log(`📸 Available images:`, order.photos ? order.photos.length : 0);

    if (!order || !order.clientInfo) {
      throw new Error("Order data is missing");
    }

    const clientName = order.clientInfo.name || "Patient";
    const age = order.clientInfo.age || "Not specified";
    const weight = order.clientInfo.weight || "Not specified";
    const height = order.clientInfo.height || "Not specified";

    // Préparer les attachments pour les images
    const attachments = [];

    if (order.photos && order.photos.length > 0) {
      console.log("🖼️ Preparing images for the email...");

      for (let i = 0; i < order.photos.length; i++) {
        const photoPath = order.photos[i];

        // Convertir le chemin URL en chemin local
        const localPath = photoPath.replace("/images/", "backend/uploads/");
        const fullPath = path.join(__dirname, "..", "..", localPath);

        console.log(`📁 Image check ${i + 1}:`, fullPath);

        // Vérifier si le fichier existe
        if (fs.existsSync(fullPath)) {
          const filename = path.basename(fullPath);
          const extension = path.extname(filename).toLowerCase();

          // Déterminer le content type
          let contentType = "image/jpeg";
          if (extension === ".png") contentType = "image/png";
          if (extension === ".gif") contentType = "image/gif";

          attachments.push({
            filename: `patient_photo_${i + 1}${extension}`,
            path: fullPath,
            cid: `patient_photo_${i + 1}`, // Content ID pour l'intégration dans le HTML
            contentType: contentType,
          });

          console.log(`✅ Image ${i + 1} ajoutée: ${filename}`);
        } else {
          console.log(`❌ Image not found: ${fullPath}`);
        }
      }
    }

    // Générer le HTML avec les images intégrées
    let photosHTML = "";
    if (attachments.length > 0) {
      photosHTML = `
        <h3>Patient Photos (${attachments.length}):</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 15px 0;">
          ${attachments
            .map(
              (att, index) => `
            <div style="text-align: center; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
              <img src="cid:${att.cid}" alt="Patient Photo ${
                index + 1
              }" style="max-width: 100%; height: 150px; object-fit: cover; border-radius: 3px;">
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">Photo ${
                index + 1
              }</p>
            </div>
          `,
            )
            .join("")}
        </div>
      `;
    } else {
      photosHTML = `
        <h3>Patient Photos:</h3>
        <p style="color: #666; font-style: italic;">Aucune photo fournie par le patient</p>
      `;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: doctorEmail,
      subject: `New Patient Consultation - ${clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
                .section { margin-bottom: 20px; padding: 15px; background: white; border-radius: 5px; border-left: 4px solid #007bff; }
                .photo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 15px 0; }
                .photo-item { text-align: center; border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
                .photo-item img { max-width: 100%; height: 150px; object-fit: cover; border-radius: 3px; }
                .badge { background: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🩺 New Patient Consultation</h1>
                    <p>TuniCure System - Automated Notification</p>
                </div>
                
                <div class="content">
                    <div class="section">
                        <h2>Patient Information</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${clientName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Age:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${age} years</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Weight:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${weight} kg</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Height:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${height} cm</td>
                            </tr>                    
                        </table>
                    </div>

                    <div class="section">
                        <h2>Medical Information</h2>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Smokes:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                                  order.medicalInfo?.smokes || "Not specified"
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Previous Operations:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                                  order.medicalInfo?.previousOperations ||
                                  "Not specified"
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Chronic Medication:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                                  order.medicalInfo?.chronicMedication ||
                                  "Not specified"
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Allergies:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                                  order.medicalInfo?.allergies ||
                                  "Not specified"
                                }</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Alcohol Consumption:</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${
                                  order.medicalInfo?.alcoholConsumption ||
                                  "Not specified"
                                }</td>
                            </tr>
                        </table>
                        
                        ${
                          order.medicalInfo?.expectations
                            ? `
                        <div style="margin-top: 15px;">
                            <strong>Patient Expectations:</strong>
                            <p style="background: #f8f9fa; padding: 10px; border-radius: 5px; border-left: 3px solid #007bff;">
                                ${order.medicalInfo.expectations}
                            </p>
                        </div>
                        `
                            : ""
                        }
                    </div>

                    <div class="section">
                        ${photosHTML}
                    </div>

                    <div class="section" style="background: #e7f3ff; border-left-color: #007bff;">
                        <h2>Next Steps</h2>
                        <p>Please review this case and provide your medical assessment at your earliest convenience.</p>
                        <p>You can access the full patient file through the TuniCure Dashboard.</p>
                    </div>

                    <div style="text-align: center; margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                        <p style="margin: 0; color: #666; font-size: 12px;">
                            <em>This is an automated message from TuniCure System</em><br>
                            <em>Please do not reply to this email</em>
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
      attachments: attachments,
    };

    console.log(`📤 Sending email with ${attachments.length} images...`);
    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email successfully sent to doctor:", result.messageId);
    return result;
  } catch (error) {
    console.log("❌ Error sending email to doctor:", error.message);
    throw error;
  }
}

async function sendEmailToClient(emailData) {
  try {
    console.log(
      `📧 Tentative d'envoi email au client: ${emailData.clientEmail}`,
    );

    // ✅ DONNÉES GARANTIES - plus d'erreur possible
    const {
      clientEmail,
      clientName = "Client",
      procedure = "Procedure",
      pack = "Standard",
      dateTime,
      duration = 120,
      doctorName = "le Doctor",
    } = emailData;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: clientEmail,
      subject: `Confirmation de Rendez-vous - ${procedure}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
                .appointment-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Rendez-vous Confirmé</h1>
                </div>
                
                <div class="content">
                    <p>Cher(e) <strong>${clientName}</strong>,</p>
                    
                    <p>Votre rendez-vous a été confirmé avec succès. Voici les détails :</p>
                    
                    <div class="appointment-details">
                        <h3>Détails du Rendez-vous :</h3>
                        <p><strong>Procedure :</strong> ${procedure}</p>
                        <p><strong>Date & Heure :</strong> ${new Date(
                          dateTime,
                        ).toLocaleString("fr-FR")}</p>
                        <p><strong>Doctor :</strong> ${doctorName}</p>
                        <p><strong>Duration estimée :</strong> ${duration} minutes</p>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
                        <h4>📋 Important instructions :</h4>
                        <ul>
                            <li>Please arrive 15 minutes before the scheduled time</li>
                            <li>Bring your identification documents</li>
                            <li>Si vous devez reporter, contactez-nous au moins 48 heures à l'avance</li>
                        </ul>
                    </div>
                    
                    <p style="margin-top: 20px;">Nous avons hâte de vous accueillir !</p>
                    
                    <p>Kind regards,<br><strong>Équipe TuniCure</strong></p>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email client envoyé avec succès:", result.messageId);
    return result;
  } catch (error) {
    console.log("❌ Erreur envoi email client:", error.message);
    throw error;
  }
}

async function sendDoctorRemarksEmailToClient(emailData) {
  try {
    console.log(`📧 Sending doctor's remarks to: ${emailData.clientEmail}`);

    const {
      clientEmail,
      clientName = "Client",
      doctorName = "le Doctor",
      procedure = "Procedure",
      doctorRemarks = "Aucune remarque disponible",
      date = new Date().toLocaleDateString("fr-FR"),
      pack = "Standard",
      generalCategory = "Général",
    } = emailData;
    // ✅ VERIFICATION - S'assurer que doctorName n'est pas un objet
    const finalDoctorName =
      typeof doctorName === "object"
        ? doctorName.personalInfo?.name || doctorName.name || "le Doctor"
        : doctorName;

    // ✅ VERIFICATION - S'assurer que procedure n'est pas un objet
    const finalProcedure =
      typeof procedure === "object"
        ? procedure.name || procedure.generalCategoryName || "Procedure"
        : procedure;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: clientEmail,
      subject: `Doctor's Response - Consultation ${procedure}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .doctor-section { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #007bff; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .remarks-box { background: #e7f3ff; padding: 20px; border-radius: 6px; margin: 15px 0; border: 1px solid #b3d7ff; }
                .info-box { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #ffc107; }
                .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">🩺 Response from Your Doctor</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">TuniCure - Suivi de Consultation</p>
                </div>
                
                <div class="content">
                    <p>Cher(e) <strong>${clientName}</strong>,</p>
                    
                    <p>Following your consultation for <strong>${finalProcedure}</strong>, 
                    the doctor has reviewed your file and is sending you his medical remarks.</p>
                    
                    <div class="doctor-section">
                        <h3 style="color: #007bff; margin-top: 0;">
                            <i class="bi bi-person-badge" style="margin-right: 8px;"></i>
                            Medical Opinion of Dr. ${finalDoctorName}
                        </h3>
                        
                        <div class="remarks-box">
                            <h4 style="margin-top: 0; color: #0056b3;">📋 Remarks and Recommendations :</h4>
                            <div style="white-space: pre-line; line-height: 1.8; padding: 10px;">
                                ${doctorRemarks}
                            </div>
                        </div>                                            </div>
                    
                    <div class="info-box">
                        <h4 style="margin-top: 0; color: #856404;">
                            <i class="bi bi-info-circle" style="margin-right: 8px;"></i>
                            Next Steps
                        </h4>
                        <ul style="margin-bottom: 0;">
                            <li>Our team will contact you shortly to confirm the arrival date</li>
                            <li>Prepare the necessary documents for your stay</li>
                            <li>For any questions, contact us by phone or email</li>
                        </ul>
                    </div>
                    
                    <div class="signature">
                        <p>We remain at your disposal for any further information.</p>
                        <p>
                            Kind regards,<br>
                            <strong style="color: #007bff;">TuniCure Team</strong><br>
                            <small style="color: #666;">
                                <i class="bi bi-telephone"></i> Contact: (+44) 7403904850<br>
                                <i class="bi bi-envelope"></i> contact@tunicure.com
                            </small>
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 6px; font-size: 12px; color: #666;">
                        <em>Cet email est généré automatiquement. Merci de ne pas y répondre directement.</em><br>
                        <em>For any questions, contact our customer service.</em>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(
      "✅ Email des remarques du Doctor envoyé avec succès:",
      result.messageId,
    );
    return result;
  } catch (error) {
    console.log("❌ Erreur envoi email remarques Doctor:", error.message);
    throw error;
  }
}

async function sendCancellationEmailToDoctor(emailData) {
  try {
    console.log(
      `📧 Sending cancellation email to doctor: ${emailData.doctorEmail}`,
    );

    const {
      doctorEmail,
      doctorName = "Doctor",
      clientName = "Patient",
      procedure = "Procedure",
      appointmentDateTime,
      cancellationReason = "Not specified",
      cancelledBy = "Administrateur",
    } = emailData;
    console.log("📋 Données email Doctor:", {
      doctorEmail,
      doctorName,
      clientName,
      procedure,
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: doctorEmail,
      subject: `❌ Appointment Cancellation - ${clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .cancellation-section { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #dc3545; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .info-box { background: #f8d7da; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #dc3545; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">❌ Appointment Cancellation</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Cancellation notification</p>
                </div>
                
                <div class="content">
                    <p>Cher Doctor <strong>${doctorName}</strong>,</p>
                    
                    <p>We inform you that an appointment has been cancelled.</p>
                    
                    <div class="cancellation-section">
                        <h3 style="color: #dc3545; margin-top: 0;">Cancellation details :</h3>
                        
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Patient :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${clientName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Procedure :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${procedure}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Scheduled date :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(appointmentDateTime).toLocaleString("fr-FR")}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Reason :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${cancellationReason}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px;"><strong>Cancelled by :</strong></td>
                                <td style="padding: 8px;">${cancelledBy}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="info-box">
                        <h4 style="margin-top: 0; color: #721c24;">
                            <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                            Information
                        </h4>
                        <p style="margin-bottom: 0;">This event has been removed from your calendar. You will be informed of any new appointment scheduled for this patient.</p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p>Kind regards,<br>
                        <strong style="color: #dc3545;">TuniCure Team</strong></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email d'annulation envoyé au Doctor:", result.messageId);
    return result;
  } catch (error) {
    console.log("❌ Erreur envoi email annulation Doctor:", error.message);
    throw error;
  }
}

async function sendCancellationEmailToClient(emailData) {
  try {
    console.log(
      `📧 Sending cancellation email to client: ${emailData.clientEmail}`,
    );

    const {
      clientEmail,
      clientName = "Client",
      procedure = "Procedure",
      appointmentDateTime,
      doctorName = "le Doctor",
      cancellationReason = "Not specifiede",
      rescheduleInstructions = "To reschedule, contact us by phone.",
    } = emailData;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: clientEmail,
      subject: `❌ Cancellation of Your Appointment - ${procedure}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .cancellation-section { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #dc3545; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .contact-box { background: #e7f3ff; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #007bff; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">❌ Appointment Cancellation</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">TuniCure</p>
                </div>
                
                <div class="content">
                    <p>Cher(e) <strong>${clientName}</strong>,</p>
                    
                    <p>We regret to inform you that your appointment has been cancelled.</p>
                    
                    <div class="cancellation-section">
                        <h3 style="color: #dc3545; margin-top: 0;">Details of the cancelled appointment :</h3>
                        
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Procedure :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${procedure}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Doctor :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">Dr. ${doctorName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Scheduled date :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(appointmentDateTime).toLocaleString("fr-FR")}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px;"><strong>Reason :</strong></td>
                                <td style="padding: 8px;">${cancellationReason}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="contact-box">
                        <h4 style="margin-top: 0; color: #0056b3;">
                            <i class="fas fa-calendar-plus" style="margin-right: 8px;"></i>
                            Reschedule your appointment
                        </h4>
                        <p>${rescheduleInstructions}</p>
                        <p><strong>Contact :</strong> (+44) 7403904850<br>
                        <strong>Email :</strong> contact@tunicure.com</p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p>We apologise for this inconvenience and hope to see you again soon.</p>
                        <p>Kind regards,<br>
                        <strong style="color: #dc3545;">TuniCure Team</strong></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email d'annulation envoyé au client:", result.messageId);
    return result;
  } catch (error) {
    console.log("❌ Erreur envoi email annulation client:", error.message);
    throw error;
  }
}

async function sendRescheduleEmailToDoctor(emailData) {
  try {
    console.log(
      `📧 Envoi email reprogrammation au Doctor: ${emailData.doctorEmail}`,
    );

    const {
      doctorEmail,
      doctorName = "Doctor",
      clientName = "Patient",
      procedure = "Procedure",
      oldDateTime,
      newDateTime,
      rescheduleReason = "Reprogrammation",
      rescheduledBy = "Administrateur",
    } = emailData;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: doctorEmail,
      subject: `📅 Date Modification - ${clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ffc107, #e0a800); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .reschedule-section { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #ffc107; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .change-box { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #ffeaa7; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">📅 Appointment Modification</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">New date scheduled</p>
                </div>
                
                <div class="content">
                    <p>Cher Doctor <strong>${doctorName}</strong>,</p>
                    
                    <p>An appointment has been rescheduled. Here is the new information:</p>
                    
                    <div class="reschedule-section">
                        <h3 style="color: #856404; margin-top: 0;">Rescheduling details :</h3>
                        
                        <div class="change-box">
                            <h4 style="margin-top: 0; color: #856404;">
                                <i class="fas fa-exchange-alt" style="margin-right: 8px;"></i>
                                Date change
                            </h4>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px;"><strong>Previous date :</strong></td>
                                    <td style="padding: 8px; color: #dc3545;">${new Date(oldDateTime).toLocaleString("fr-FR")}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px;"><strong>New date :</strong></td>
                                    <td style="padding: 8px; color: #28a745; font-weight: bold;">${new Date(newDateTime).toLocaleString("fr-FR")}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Patient :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${clientName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Procedure :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${procedure}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Reason :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${rescheduleReason}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px;"><strong>Modified by :</strong></td>
                                <td style="padding: 8px;">${rescheduledBy}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p>Votre calendrier a été mis à jour avec cette New date.</p>
                        <p>Kind regards,<br>
                        <strong style="color: #ffc107;">TuniCure Team</strong></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(
      "✅ Email de reprogrammation envoyé au Doctor:",
      result.messageId,
    );
    return result;
  } catch (error) {
    console.log("❌ Erreur envoi email reprogrammation Doctor:", error.message);
    throw error;
  }
}

async function sendRescheduleEmailToClient(emailData) {
  try {
    console.log(
      `📧 Sending rescheduling email to client: ${emailData.clientEmail}`,
    );

    const {
      clientEmail,
      clientName = "Client",
      procedure = "Procedure",
      oldDateTime,
      newDateTime,
      doctorName = "le Doctor",
      rescheduleReason = "Reprogrammation nécessaire",
      duration = 60,
    } = emailData;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: clientEmail,
      subject: `📅 New date de Rendez-vous - ${procedure}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #17a2b8, #138496); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .new-appointment-section { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #17a2b8; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .change-notice { background: #d1ecf1; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #17a2b8; }
                .important-info { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #ffc107; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">📅 New date Confirmée</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Your appointment has been rescheduled</p>
                </div>
                
                <div class="content">
                    <p>Cher(e) <strong>${clientName}</strong>,</p>
                    
                    <p>Your appointment has been rescheduled. Voici les nouvelles informations :</p>
                    
                    <div class="change-notice">
                        <p><strong>⚠️ Important note :</strong> Your initial appointment on <strong>${new Date(oldDateTime).toLocaleString("fr-FR")}</strong> a été modifié.</p>
                        <p><strong>Reason :</strong> ${rescheduleReason}</p>
                    </div>
                    
                    <div class="new-appointment-section">
                        <h3 style="color: #138496; margin-top: 0;">📋 Détails du nouveau rendez-vous :</h3>
                        
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Procedure :</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${procedure}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Doctor :</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">Dr. ${doctorName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>New date et heure :</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #28a745; font-weight: bold;">
                                    ${new Date(newDateTime).toLocaleString("fr-FR")}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Duration :</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${duration} minutes</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="important-info">
                        <h4 style="margin-top: 0; color: #856404;">
                            <i class="fas fa-exclamation-circle" style="margin-right: 8px;"></i>
                            Important instructions
                        </h4>
                        <ul style="margin-bottom: 0;">
                            <li>Please arrive 15 minutes before the scheduled time</li>
                            <li>Bring your identification documents</li>
                            <li>If you need to reschedule again, contact us at least 48 hours in advance</li>
                        </ul>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p>We apologise for this change and thank you for your understanding.</p>
                        <p>Kind regards,<br>
                        <strong style="color: #17a2b8;">TuniCure Team</strong><br>
                        <small style="color: #666;">
                            📞 (+44) 7403904850 | ✉️ contact@tunicure.com
                        </small></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(
      "✅ Email de reprogrammation envoyé au client:",
      result.messageId,
    );
    return result;
  } catch (error) {
    console.log("❌ Erreur envoi email reprogrammation client:", error.message);
    throw error;
  }
}

async function sendArrivalDateUpdateEmail(emailData) {
  try {
    console.log(
      `📧 Envoi email modification date d'arrivée à: ${emailData.clientEmail}`,
    );

    const {
      clientEmail,
      clientName = "Client",
      procedure = "Procedure",
      oldArrivalDate,
      newArrivalDate,
      updateReason = "Ajustement d'horaire",
      contactInfo = "Notre équipe restera en contact avec vous pour les préparatifs.",
    } = emailData;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: clientEmail,
      subject: `🛬 Modification of Your Arrival Date - ${procedure}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #28a745, #1e7e34); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .arrival-section { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #28a745; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
                .change-box { background: #d4edda; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #c3e6cb; }
                .preparation-box { background: #e7f3ff; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #007bff; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">🛬 Date Modification d'Arrivée</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">TuniCure - Préparation de séjour</p>
                </div>
                
                <div class="content">
                    <p>Cher(e) <strong>${clientName}</strong>,</p>
                    
                    <p>Nous vous informons d'un changement concernant votre date d'arrivée pour votre Procedure médicale.</p>
                    
                    <div class="arrival-section">
                        <h3 style="color: #155724; margin-top: 0;">Modification details :</h3>
                        
                        <div class="change-box">
                            <h4 style="margin-top: 0; color: #155724;">
                                <i class="fas fa-plane-arrival" style="margin-right: 8px;"></i>
                                Date change d'arrivée
                            </h4>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px;"><strong>Previous date :</strong></td>
                                    <td style="padding: 8px;">${new Date(oldArrivalDate).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px;"><strong>New date :</strong></td>
                                    <td style="padding: 8px; color: #28a745; font-weight: bold;">
                                        ${new Date(newArrivalDate).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                    </td>
                                </tr>
                            </table>
                            <p style="margin-top: 10px; margin-bottom: 0;"><strong>Reason :</strong> ${updateReason}</p>
                        </div>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Procedure :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${procedure}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div class="preparation-box">
                        <h4 style="margin-top: 0; color: #0056b3;">
                            <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                            Preparations for your arrival
                        </h4>
                        <ul style="margin-bottom: 0;">
                            <li>Our reception team will be waiting for you upon arrival</li>
                            <li>Prepare your medical and identification documents</li>
                            <li>If you need transfer assistance, contact us</li>
                            <li>${contactInfo}</li>
                        </ul>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p>We look forward to welcoming you and remain at your disposal for any further information.</p>
                        <p>Kind regards,<br>
                        <strong style="color: #28a745;">TuniCure Team</strong><br>
                        <small style="color: #666;">
                            📞 Assistance arrivée : +33 1 23 45 67 90<br>
                            ✉️ arrivals@medicalclinic.com
                        </small></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    console.log("📤 Envoi de l'email...");
    const result = await transporter.sendMail(mailOptions);
    console.log(
      "✅ Email modification date d'arrivée envoyé:",
      result.messageId,
    );
    return result;
  } catch (error) {
    console.log("❌ Erreur envoi email modification arrivée:", error.message);
    throw error;
  }
}

async function sendInvoiceEmail(emailData) {
  try {
    const {
      clientEmail,
      clientName,
      orderId,
      procedure,
      totalAmount,
      depositAmount,
      remainingAmount,
      paymentUrl,
      paymentDeadline,
    } = emailData;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: clientEmail,
      subject: `💰 Invoice and Payment - ${procedure}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #6f42c1, #5a32a3); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .invoice-section { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #6f42c1; }
                .payment-box { background: #e7f3ff; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; }
                .btn-payment { background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">💰 Facture & Paiement</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">TuniCure - Procedure: ${procedure}</p>
                </div>
                
                <div class="content">
                    <p>Cher(e) <strong>${clientName}</strong>,</p>
                    
                    <p>Votre Procedure <strong>${procedure}</strong> has been scheduled. Here are the details of your invoice:</p>
                    
                    <div class="invoice-section">
                        <h3 style="color: #6f42c1; margin-top: 0;">📋 Invoice Details</h3>
                        
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Reference :</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${orderId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Procedure :</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;">${procedure}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Total amount :</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">${totalAmount.toFixed(2)} €</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Required deposit (10%) :</strong></td>
                                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #28a745; font-weight: bold;">${depositAmount.toFixed(2)} €</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px;"><strong>Remaining balance :</strong></td>
                                <td style="padding: 10px;">${remainingAmount.toFixed(2)} €</td>
                            </tr>
                        </table>
                        
                        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
                            <p style="margin: 0; color: #666;">
                                <i class="fas fa-info-circle"></i> 
                                Le dépôt de 10% est requis pour confirmer votre réservation. 
                                Le solde sera réglé avant la Procedure.
                            </p>
                        </div>
                    </div>
                    
                    <div class="payment-box">
                        <h3 style="color: #0056b3;">✅ Pay your 10% deposit</h3>
                        <p>Click the button below to proceed with secure payment :</p>
                        
                        <a href="${paymentUrl}" class="btn-payment" style="margin: 20px 0;">
                            🔐 Payer ${depositAmount.toFixed(2)} € Maintenant
                        </a>
                        
                        <p style="color: #666; font-size: 14px;">
                            <i class="fas fa-shield-alt"></i> 100% secure payment via Stripe
                        </p>
                    </div>
                    
                    <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h4 style="margin-top: 0; color: #856404;">
                            <i class="fas fa-clock"></i> Payment deadline
                        </h4>
                        <p>Please complete the payment before : 
                        <strong>${new Date(paymentDeadline).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong></p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p>For any questions regarding your invoice, contact us :</p>
                        <p>
                            <strong>📞 Customer Service :</strong> (+44) 7403904850<br>
                            <strong>✉️ Email :</strong> facturation@medicalclinic.com
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email de facture envoyé:", result.messageId);
    return result;
  } catch (error) {
    console.log("❌ Erreur envoi email facture:", error.message);
    throw error;
  }
}

async function sendPaymentConfirmationEmail(emailData) {
  try {
    const {
      clientEmail,
      clientName,
      orderId,
      amount,
      paymentDate,
      transactionId,
    } = emailData;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: clientEmail,
      subject: "✅ Payment Confirmation - TuniCure",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 700px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #28a745, #1e7e34); color: white; padding: 25px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .success-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #28a745; text-align: center; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">✅ Payment Confirmed</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your trust</p>
                </div>
                
                <div class="content">
                    <p>Cher(e) <strong>${clientName}</strong>,</p>
                    
                    <div class="success-box">
                        <div style="font-size: 48px; color: #28a745; margin: 20px 0;">✓</div>
                        <h3 style="color: #28a745;">Payment Successful</h3>
                        
                        <p>Your deposit has been successfully received.</p>
                        
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; display: inline-block;">
                            <p style="margin: 5px 0; font-size: 24px; color: #28a745; font-weight: bold;">
                                ${amount.toFixed(2)} €
                            </p>
                        </div>
                        
                        <table style="width: 100%; max-width: 400px; margin: 20px auto; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Reference :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${orderId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Transaction :</strong></td>
                                <td style="padding: 8px; border-bottom: 1px solid #eee;">${transactionId}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px;"><strong>Date :</strong></td>
                                <td style="padding: 8px;">${new Date(paymentDate).toLocaleString("fr-FR")}</td>
                            </tr>
                        </table>
                        
                        <p style="color: #666; margin-top: 20px;">
                            <i class="fas fa-check-circle"></i> Your booking is now confirmed.
                        </p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p>Notre équipe vous contactera prochainement pour les Next Steps.</p>
                        <p>Kind regards,<br>
                        <strong style="color: #28a745;">TuniCure Team</strong></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email confirmation paiement envoyé:", result.messageId);
    return result;
  } catch (error) {
    console.log("❌ Erreur envoi email confirmation:", error.message);
    throw error;
  }
}

async function sendNewOrderNotificationToAdmin(order) {
  try {
    const ADMIN_EMAIL = "contact@tunicure.com";
    const clientName = order.clientInfo?.name || "Unknown";
    const clientEmail = order.clientInfo?.email || "Not provided";
    const clientPhone = order.clientInfo?.phone || "Not provided";
    const clientCountry = order.clientInfo?.country || "Not provided";
    const procedure = order.categoryName || order.generalCategoryName || "Not specified";
    const pack = order.pack || "Not specified";
    const submittedAt = new Date().toLocaleString("fr-FR");

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: ADMIN_EMAIL,
      subject: `🔔 New Booking Received — ${clientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 680px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #073840, #0a5260); color: white; padding: 28px 30px; border-radius: 10px 10px 0 0; }
                .header h1 { margin: 0; font-size: 22px; }
                .header p { margin: 8px 0 0 0; opacity: 0.85; font-size: 14px; }
                .content { background: #f4faf9; padding: 30px; border-radius: 0 0 10px 10px; }
                .badge { display: inline-block; background: #1FDFA9; color: #073840; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
                .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px; border-left: 4px solid #1FDFA9; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
                .card h3 { margin: 0 0 14px 0; color: #073840; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 8px 4px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
                td:first-child { color: #666; width: 40%; }
                td:last-child { font-weight: 600; color: #222; }
                .cta { text-align: center; margin-top: 24px; }
                .cta a { background: linear-gradient(135deg, #073840, #1FDFA9); color: white; padding: 13px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔔 New Booking Received</h1>
                    <p>A new order has just been submitted on tunicure.com</p>
                </div>
                <div class="content">
                    <span class="badge">⏱ ${submittedAt}</span>

                    <div class="card">
                        <h3>👤 Client Information</h3>
                        <table>
                            <tr><td>Full Name</td><td>${clientName}</td></tr>
                            <tr><td>Email</td><td>${clientEmail}</td></tr>
                            <tr><td>Phone</td><td>${clientPhone}</td></tr>
                            <tr><td>Country</td><td>${clientCountry}</td></tr>
                        </table>
                    </div>

                    <div class="card">
                        <h3>🏥 Procedure Details</h3>
                        <table>
                            <tr><td>Category</td><td>${order.generalCategoryName || "Not specified"}</td></tr>
                            <tr><td>Procedure</td><td>${procedure}</td></tr>
                            <tr><td>Pack</td><td>${pack}</td></tr>
                        </table>
                    </div>

                    ${
                      order.medicalInfo
                        ? `
                    <div class="card">
                        <h3>🩺 Medical Info</h3>
                        <table>
                            <tr><td>Age</td><td>${order.clientInfo?.age || "N/A"}</td></tr>
                            <tr><td>Weight</td><td>${order.clientInfo?.weight ? order.clientInfo.weight + " kg" : "N/A"}</td></tr>
                            <tr><td>Height</td><td>${order.clientInfo?.height ? order.clientInfo.height + " cm" : "N/A"}</td></tr>
                            <tr><td>Smokes</td><td>${order.medicalInfo?.smokes || "N/A"}</td></tr>
                            <tr><td>Allergies</td><td>${order.medicalInfo?.allergies || "None"}</td></tr>
                        </table>
                    </div>
                    `
                        : ""
                    }

                    <div class="cta">
                        <a href="https://admin.tunicure.com" target="_blank">View Order in Dashboard →</a>
                    </div>
                </div>
                <div class="footer">
                    <p>TuniCure Admin Notification — Do not reply to this email</p>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Admin notification email sent:", result.messageId);
    return result;
  } catch (error) {
    console.log("❌ Error sending admin notification email:", error.message);
    throw error;
  }
}

async function sendBookingConfirmationToClient(order) {
  try {
    const clientEmail = order.clientInfo?.email;
    if (!clientEmail) {
      console.log("⚠️ No client email found, skipping booking confirmation");
      return;
    }

    const clientName = order.clientInfo?.name || "Client";
    const procedure = order.categoryName || order.generalCategoryName || "your requested procedure";
    const pack = order.pack || "Standard";

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: clientEmail,
      subject: `✅ Booking Received — TuniCure`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 620px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #073840, #1FDFA9); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; }
                .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
                .content { background: #f4faf9; padding: 30px; border-radius: 0 0 10px 10px; }
                .summary-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #1FDFA9; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
                .summary-card h3 { margin: 0 0 14px 0; color: #073840; font-size: 15px; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 8px 4px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
                td:first-child { color: #666; width: 40%; }
                td:last-child { font-weight: 600; color: #222; }
                .steps { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
                .steps h3 { color: #073840; margin: 0 0 16px 0; font-size: 15px; }
                .step { display: flex; align-items: flex-start; margin-bottom: 14px; }
                .step-num { background: #1FDFA9; color: #073840; border-radius: 50%; width: 24px; height: 24px; min-width: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; margin-right: 12px; margin-top: 2px; }
                .contact-box { background: #e8faf5; border-radius: 8px; padding: 16px 20px; margin-top: 20px; border: 1px solid #b2edd8; text-align: center; }
                .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Request Received!</h1>
                    <p>Thank you for trusting TuniCure with your healthcare journey.</p>
                </div>

                <div class="content">
                    <p>Dear <strong>${clientName}</strong>,</p>
                    <p>We have successfully received your booking request. Our team will review your details and contact you shortly to discuss the next steps.</p>

                    <div class="summary-card">
                        <h3>📋 Your Booking Summary</h3>
                        <table>
                            <tr><td>Procedure</td><td>${procedure}</td></tr>
                            <tr><td>Pack</td><td>${pack}</td></tr>
                            <tr><td>Submitted</td><td>${new Date().toLocaleString("fr-FR")}</td></tr>
                            <tr><td>Status</td><td>⏳ Under Review</td></tr>
                        </table>
                    </div>

                    <div class="steps">
                        <h3>🗺️ What Happens Next?</h3>
                        <div class="step">
                            <div class="step-num">1</div>
                            <div><strong>Team Review</strong><br><span style="color:#666;font-size:13px;">Our medical team will review your file within 24–48 hours.</span></div>
                        </div>
                        <div class="step">
                            <div class="step-num">2</div>
                            <div><strong>Phone Call</strong><br><span style="color:#666;font-size:13px;">We will contact you to discuss your case and confirm details.</span></div>
                        </div>
                        <div class="step">
                            <div class="step-num">3</div>
                            <div><strong>Doctor Assignment</strong><br><span style="color:#666;font-size:13px;">A specialist will be assigned and will provide a medical assessment.</span></div>
                        </div>
                        <div class="step">
                            <div class="step-num">4</div>
                            <div><strong>Appointment Confirmed</strong><br><span style="color:#666;font-size:13px;">You will receive a confirmation email with all your appointment details.</span></div>
                        </div>
                    </div>

                    <div class="contact-box">
                        <p style="margin:0;"><strong>Questions?</strong> We're here to help.</p>
                        <p style="margin:6px 0 0 0;">📞 <strong>(+44) 7403904850</strong> &nbsp;|&nbsp; ✉️ <strong>contact@tunicure.com</strong></p>
                    </div>
                </div>

                <div class="footer">
                    <p>© TuniCure — This is an automated message, please do not reply directly.</p>
                </div>
            </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Booking confirmation sent to client:", result.messageId);
    return result;
  } catch (error) {
    console.log("❌ Error sending booking confirmation to client:", error.message);
    throw error;
  }
}

// Exportez toutes les nouvelles fonctions
module.exports = {
  sendEmailToDoctor,
  sendEmailToClient,
  sendDoctorRemarksEmailToClient,
  sendCancellationEmailToDoctor,
  sendCancellationEmailToClient,
  sendRescheduleEmailToDoctor,
  sendRescheduleEmailToClient,
  sendArrivalDateUpdateEmail,
  sendInvoiceEmail,
  sendPaymentConfirmationEmail,
  sendNewOrderNotificationToAdmin,
  sendBookingConfirmationToClient,
};
