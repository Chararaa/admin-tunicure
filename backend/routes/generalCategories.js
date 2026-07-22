const express = require("express");
const router = express.Router();
const GeneralCategory = require("../models/GeneralCategory");
const Category = require("../models/Category");

// POST - Créer une catégorie générale
router.post("/", async (req, res) => {
  try {
    const generalCategory = new GeneralCategory(req.body);
    await generalCategory.save();

    res.status(201).json({
      success: true,
      message: "Catégorie générale créée avec succès",
      data: generalCategory,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// GET - Récupérer toutes les catégories générales (VERSION CORRIGÉE)
router.get("/", async (req, res) => {
  try {
    const { active } = req.query;
    let filter = {};

    if (active === "true") {
      filter.isActive = true;
    } else if (active === "false") {
      filter.isActive = false;
    }

    const generalCategories = await GeneralCategory.find(filter)
      .sort({ displayOrder: 1, name: 1 })
      .lean(); // Utilisez .lean() pour avoir des objets simples

    // Ajoutez le count manuellement
    const categoriesWithCount = await Promise.all(
      generalCategories.map(async (gc) => {
        const count = await Category.countDocuments({
          generalCategory: gc._id,
          isActive: true,
        });
        return {
          ...gc,
          subCategoriesCount: count,
          subCategories: [], // Tableau vide - nous n'avons plus besoin des données complètes
        };
      })
    );

    res.status(200).json({
      success: true,
      data: categoriesWithCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET - Récupérer une catégorie générale par ID avec ses sous-catégories
router.get("/:id", async (req, res) => {
  try {
    const generalCategory = await GeneralCategory.findById(
      req.params.id
    ).populate({
      path: "subCategories",
      match: { isActive: true },
      options: { sort: { displayOrder: 1, name: 1 } },
    });

    if (!generalCategory) {
      return res.status(404).json({
        success: false,
        error: "Catégorie générale non trouvée",
      });
    }

    res.status(200).json({
      success: true,
      data: generalCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PUT - Mettre à jour une catégorie générale
router.put("/:id", async (req, res) => {
  try {
    const generalCategory = await GeneralCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).populate("subCategories");

    if (!generalCategory) {
      return res.status(404).json({
        success: false,
        error: "Catégorie générale non trouvée",
      });
    }

    res.status(200).json({
      success: true,
      message: "Catégorie générale mise à jour avec succès",
      data: generalCategory,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// DELETE - Désactiver une catégorie générale
router.delete("/:id", async (req, res) => {
  try {
    const generalCategory = await GeneralCategory.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!generalCategory) {
      return res.status(404).json({
        success: false,
        error: "Catégorie générale non trouvée",
      });
    }

    // Désactiver également toutes les sous-catégories
    await Category.updateMany(
      { generalCategory: req.params.id },
      { isActive: false }
    );

    res.status(200).json({
      success: true,
      message:
        "Catégorie générale et ses sous-catégories désactivées avec succès",
      data: generalCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PATCH - Ajouter une sous-catégorie
router.patch("/:id/add-subcategory", async (req, res) => {
  try {
    const { subCategoryId } = req.body;

    // Vérifier si la sous-catégorie existe
    const subCategory = await Category.findById(subCategoryId);
    if (!subCategory) {
      return res.status(404).json({
        success: false,
        error: "Sous-catégorie non trouvée",
      });
    }

    // Mettre à jour la catégorie générale
    const generalCategory = await GeneralCategory.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { subCategories: subCategoryId },
      },
      { new: true }
    ).populate("subCategories");

    if (!generalCategory) {
      return res.status(404).json({
        success: false,
        error: "Catégorie générale non trouvée",
      });
    }

    // Mettre à jour la sous-catégorie avec la référence
    await Category.findByIdAndUpdate(subCategoryId, {
      generalCategory: req.params.id,
    });

    res.status(200).json({
      success: true,
      message: "Sous-catégorie ajoutée avec succès",
      data: generalCategory,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// PATCH - Retirer une sous-catégorie
router.patch("/:id/remove-subcategory", async (req, res) => {
  try {
    const { subCategoryId } = req.body;

    const generalCategory = await GeneralCategory.findByIdAndUpdate(
      req.params.id,
      {
        $pull: { subCategories: subCategoryId },
      },
      { new: true }
    ).populate("subCategories");

    if (!generalCategory) {
      return res.status(404).json({
        success: false,
        error: "Catégorie générale non trouvée",
      });
    }

    // Retirer la référence de la sous-catégorie
    await Category.findByIdAndUpdate(subCategoryId, {
      $unset: { generalCategory: "" },
    });

    res.status(200).json({
      success: true,
      message: "Sous-catégorie retirée avec succès",
      data: generalCategory,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// GET - Sous-catégories d'une catégorie générale
router.get("/:id/subcategories", async (req, res) => {
  try {
    const { active } = req.query;
    let filter = { generalCategory: req.params.id };

    if (active === "true") {
      filter.isActive = true;
    } else if (active === "false") {
      filter.isActive = false;
    }

    const subCategories = await Category.find(filter)
      .sort({ displayOrder: 1, name: 1 })
      .populate("generalCategory", "name");

    res.status(200).json({
      success: true,
      data: subCategories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
