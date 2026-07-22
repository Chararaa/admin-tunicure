const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const GeneralCategory = require("../models/GeneralCategory");

// POST - Créer une catégorie (comme doctors)
router.post("/", async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json({
      success: true,
      message: "Catégorie créée avec succès",
      data: category,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// GET - Récupérer toutes les catégories (comme doctors)
router.get("/", async (req, res) => {
  try {
    const { active } = req.query;
    let filter = {};

    if (active === "true") {
      filter.isActive = true;
    } else if (active === "false") {
      filter.isActive = false;
    }

    const categories = await Category.find(filter).sort({
      displayOrder: 1,
      name: 1,
    });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET - Récupérer une catégorie par ID (comme doctors)
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Catégorie non trouvée",
      });
    }
    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    // S'assurer que priceRange est bien défini avant la mise à jour
    if (req.body.priceRange) {
      // S'assurer que max >= min
      if (req.body.priceRange.max < req.body.priceRange.min) {
        req.body.priceRange.max = req.body.priceRange.min;
      }
    }

    // Récupérer l'ancienne catégorie pour connaître l'ancien generalCategory
    const oldCategory = await Category.findById(req.params.id);

    if (!oldCategory) {
      return res.status(404).json({
        success: false,
        error: "Catégorie non trouvée",
      });
    }

    // Mettre à jour d'abord la catégorie
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Mettre à jour les subCategories dans la catégorie générale
    if (req.body.generalCategory !== undefined) {
      const oldGeneralCategoryId = oldCategory.generalCategory;
      const newGeneralCategoryId = req.body.generalCategory;

      // 1. Retirer de l'ancienne catégorie générale si elle existe
      if (
        oldGeneralCategoryId &&
        oldGeneralCategoryId.toString() !== newGeneralCategoryId
      ) {
        await GeneralCategory.findByIdAndUpdate(oldGeneralCategoryId, {
          $pull: { subCategories: req.params.id },
        });
      }

      // 2. Ajouter à la nouvelle catégorie générale si elle existe et est différente
      if (
        newGeneralCategoryId &&
        newGeneralCategoryId !== "undefined" &&
        (!oldGeneralCategoryId ||
          oldGeneralCategoryId.toString() !== newGeneralCategoryId)
      ) {
        await GeneralCategory.findByIdAndUpdate(newGeneralCategoryId, {
          $addToSet: { subCategories: req.params.id },
        });
      }

      // 3. Si on supprime la référence (generalCategory est vide ou null)
      if (
        (!newGeneralCategoryId || newGeneralCategoryId === "undefined") &&
        oldGeneralCategoryId
      ) {
        await GeneralCategory.findByIdAndUpdate(oldGeneralCategoryId, {
          $pull: { subCategories: req.params.id },
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Catégorie mise à jour avec succès",
      data: category,
    });
  } catch (error) {
    // Gestion d'erreur améliorée
    console.error("Erreur lors de la mise à jour:", error);
    res.status(400).json({
      success: false,
      error: error.message,
      details: error.errors
        ? Object.values(error.errors).map((e) => e.message)
        : [],
    });
  }
});

// DELETE - Supprimer une catégorie (soft delete comme doctors)
router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Catégorie non trouvée",
      });
    }

    res.status(200).json({
      success: true,
      message: "Catégorie désactivée avec succès",
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PATCH - Toggle status (comme doctors)
router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Catégorie non trouvée",
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { isActive: !category.isActive },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Catégorie ${
        updatedCategory.isActive ? "activée" : "désactivée"
      } avec succès`,
      data: updatedCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET - Catégories par catégorie générale
router.get("/by-general/:generalCategoryId", async (req, res) => {
  try {
    const { active } = req.query;
    let filter = { generalCategory: req.params.generalCategoryId };

    if (active === "true") {
      filter.isActive = true;
    } else if (active === "false") {
      filter.isActive = false;
    }

    const categories = await Category.find(filter)
      .sort({ displayOrder: 1, name: 1 })
      .populate("generalCategory", "name banner");

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET - Catégories sans catégorie générale
router.get("/without-general", async (req, res) => {
  try {
    const categories = await Category.find({
      generalCategory: { $exists: false },
      isActive: true,
    }).sort({ displayOrder: 1, name: 1 });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
module.exports = router;
