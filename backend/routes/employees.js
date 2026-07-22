// routes/employees.js
const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { auth } = require("../middleware/auth");

// GET all employees
router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find({ isActive: true })
      .populate("user", "name email role isActive")
      .sort({ "personalInfo.name": 1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// GET employee by user id
router.get("/by-user/:userId", async (req, res) => {
  try {
    const emp = await Employee.findOne({ user: req.params.userId })
      .populate("user", "name email role isActive")
      .lean();
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    res.json(emp);
  } catch (err) {
    console.error("GET /employees/by-user error", err);
    res.status(500).json({ error: err.message });
  }
});

// CREATE new employee (avec création de compte user)
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, image, poste, skills, bio, password } =
      req.body;

    console.log("Données reçues:", req.body);

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Un utilisateur avec cet email existe déjà" });
    }

    // Vérifier si un employé avec cet email existe déjà
    const existingEmployee = await Employee.findOne({
      "personalInfo.email": email,
    });
    if (existingEmployee) {
      return res
        .status(400)
        .json({ error: "Un employé avec cet email existe déjà" });
    }

    // Hasher le mot de passe
    //const hashedPassword = await bcrypt.hash(password, 12);

    // Créer le compte user avec rôle par défaut "employee"
    const user = new User({
      name,
      email,
      password: password,
      role: "customer_service", // Rôle par défaut
    });

    await user.save();

    // Créer l'employé
    const employee = new Employee({
      user: user._id,
      personalInfo: {
        name,
        email,
        phone,
        image: image || "",
      },
      professionalInfo: {
        poste,
        skills: skills || [],
        bio: bio || "",
        hireDate: new Date(),
      },
    });

    await employee.save();

    // Populer la réponse
    const employeeWithUser = await Employee.findById(employee._id).populate(
      "user",
      "name email role isActive"
    );

    res.status(201).json({
      message: "Employé créé avec succès",
      employee: employeeWithUser,
    });
  } catch (error) {
    console.error("Erreur création employé:", error);
    res.status(400).json({ error: error.message });
  }
});

// UPDATE employee role
router.patch("/:id/role", async (req, res) => {
  try {
    const { role } = req.body;

    // Valider le rôle
    const validRoles = ["customer_service", "admin", "super_admin", "employee"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Rôle invalide" });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Employé non trouvé" });
    }

    // Mettre à jour le rôle dans le User
    const user = await User.findByIdAndUpdate(
      employee.user,
      { role },
      { new: true }
    );

    // Recharger l'employé avec les infos user mises à jour
    const updatedEmployee = await Employee.findById(req.params.id).populate(
      "user",
      "name email role isActive"
    );

    res.json({
      message: "Rôle mis à jour avec succès",
      employee: updatedEmployee,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// UPDATE employee info
router.put("/:id", async (req, res) => {
  try {
    const { name, phone, image, poste, skills, bio } = req.body;

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        "personalInfo.name": name,
        "personalInfo.phone": phone,
        "personalInfo.image": image,
        "professionalInfo.poste": poste,
        "professionalInfo.skills": skills,
        "professionalInfo.bio": bio,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("user", "name email role isActive");

    if (!employee) return res.status(404).json({ error: "Employee not found" });

    res.json({
      message: "Employé modifié avec succès",
      employee,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE employee (soft delete)
router.delete("/:id", async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).populate("user", "name email role isActive");

    if (!employee) return res.status(404).json({ error: "Employee not found" });

    // Désactiver aussi le compte user
    await User.findByIdAndUpdate(employee.user._id, { isActive: false });

    res.json({
      message: "Employé supprimé avec succès",
      employee,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
