const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { auth, authorize } = require("../middleware/auth");
const Doctor = require("../models/Doctor");

// GET all doctors
router.get("/", async (req, res) => {
  try {
    const { specialties, active, verified } = req.query;
    let filter = {};
    if (specialties) filter["personalInfo.specialty"] = specialties;
    if (active !== undefined) filter.isActive = active === "true";
    if (verified !== undefined) filter.isVerified = verified === "true";

    const doctors = await Doctor.find(filter).sort({ "personalInfo.name": 1 });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET doctors by specialty
router.get("/specialty/:specialty", async (req, res) => {
  try {
    const doctors = await Doctor.find({
      "personalInfo.specialty": req.params.specialties,
      isActive: true,
      isVerified: true,
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET pending doctors
router.get("/pending/verification", async (req, res) => {
  try {
    const doctors = await Doctor.find({
      isVerified: false,
      isActive: true,
    }).sort({ createdAt: -1 });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST register doctor
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      title,
      email,
      phone,
      specialties,
      licenseNumber,
      yearsOfExperience,
      password,
      bio,
      shortDescription,
      tagline,
      education,
      certifications,
      languages,
      image,
      bannerImage,
      location,
      services,
      experienceHighlights,
      socialLinks,
      appointmentInfo,
    } = req.body;

    // Vérifier si l'email existe déjà
    const existingDoctor = await Doctor.findOne({
      "personalInfo.email": email,
    });
    if (existingDoctor) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    const doctor = new Doctor({
      personalInfo: {
        name,
        title,
        email,
        phone,
        specialties,
        licenseNumber,
        yearsOfExperience,
        image: image || "",
        bannerImage: bannerImage || "",
        location: location || {},
      },
      professionalInfo: {
        bio,
        shortDescription,
        tagline,
        education: education || [],
        certifications: certifications || [],
        languages: languages || [],
        services: services || [],
        experienceHighlights: experienceHighlights || [],
        socialLinks: socialLinks || {},
      },
      appointmentInfo: appointmentInfo || {},
      password: hashedPassword,
      isActive: true,
      isVerified: false,
    });

    await doctor.save();

    const doctorResponse = doctor.toObject();
    delete doctorResponse.password;

    res.status(201).json({
      message: "Doctor registered successfully. Waiting for admin approval.",
      doctor: doctorResponse,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ✅ POST create doctor (ADMIN) - AVEC VÉRIFICATION D'EMAIL
router.post("/", async (req, res) => {
  try {
    // ✅ Vérifier si l'email existe déjà
    const existingDoctor = await Doctor.findOne({
      "personalInfo.email": req.body.personalInfo.email,
    });

    if (existingDoctor) {
      return res.status(400).json({
        error: "Cet email est déjà utilisé par un autre docteur",
      });
    }

    const doctorData = {
      personalInfo: {
        name: req.body.personalInfo.name,
        email: req.body.personalInfo.email,
        specialties: req.body.personalInfo.specialties,
        phone: req.body.personalInfo.phone || "",
        title: req.body.personalInfo.title || "",
        licenseNumber: req.body.personalInfo.licenseNumber || "",
        yearsOfExperience: req.body.personalInfo.yearsOfExperience || 0,
        image: req.body.personalInfo.image || "",
        bannerImage: req.body.personalInfo.bannerImage || "",
        location: req.body.personalInfo.location || {
          country: "",
          international: false,
        },
      },
      professionalInfo: {
        bio: req.body.professionalInfo?.bio || "",
        shortDescription: req.body.professionalInfo?.shortDescription || "",
        tagline: req.body.professionalInfo?.tagline || "",
        education: req.body.professionalInfo?.education || [],
        certifications: req.body.professionalInfo?.certifications || [],
        languages: req.body.professionalInfo?.languages || [],
        services: req.body.professionalInfo?.services || [],
        experienceHighlights:
          req.body.professionalInfo?.experienceHighlights || [],
        socialLinks: req.body.professionalInfo?.socialLinks || {},
      },
      appointmentInfo: {
        bookingLink: req.body.appointmentInfo?.bookingLink || "",
        consultationFee: req.body.appointmentInfo?.consultationFee || 0,
        beforeAfterGallery: req.body.appointmentInfo?.beforeAfterGallery || [],
      },
      statistics: req.body.statistics || {
        totalOperations: 0,
        completedOperations: 0,
        successRate: 0,
      },
      password: req.body.password || "defaultPassword123",
      isActive: true,
      isVerified: true,
    };

    const doctor = new Doctor(doctorData);
    await doctor.save();
    res.status(201).json(doctor);
  } catch (err) {
    console.error("CREATE DOCTOR ERROR:", err);

    // ✅ Gestion spécifique de l'erreur de duplication
    if (err.code === 11000) {
      return res.status(400).json({
        error: "Cet email est déjà utilisé par un autre docteur",
      });
    }

    res.status(400).json({ error: err.message });
  }
});

// GET featured doctors
router.get("/featured/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find({
      isActive: true,
      isVerified: true,
      featured: true,
    }).sort({ "personalInfo.name": 1 });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single doctor
router.get("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH verify doctor
router.patch("/:id/verify", async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true },
    );

    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    res.json({
      message: "Doctor verified successfully",
      doctor,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE doctor
router.put("/:id", async (req, res) => {
  try {
    const doctorId = req.params.id;
    const updateData = req.body;

    // Si l'email est modifié, vérifier qu'il n'est pas pris par un autre docteur
    if (updateData.personalInfo && updateData.personalInfo.email) {
      const existing = await Doctor.findOne({
        "personalInfo.email": updateData.personalInfo.email,
        _id: { $ne: doctorId },
      });
      if (existing) {
        return res.status(400).json({
          error: "Cet email est déjà utilisé par un autre docteur",
        });
      }
    }

    const doctor = await Doctor.findByIdAndUpdate(doctorId, updateData, {
      new: true,
      runValidators: false,
    });

    if (!doctor) {
      return res.status(404).json({ error: "Docteur non trouvé" });
    }

    console.log("✅ Docteur mis à jour avec succès ID:", doctor._id);
    res.json(doctor);
  } catch (error) {
    console.error("❌ Erreur mise à jour docteur:", error);
    res.status(400).json({ error: error.message });
  }
});


// ✅ DELETE doctor (SUPPRESSION PHYSIQUE - CORRIGÉ)
router.delete("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" });
    }
    res.json({ message: "Doctor deleted successfully", doctor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

