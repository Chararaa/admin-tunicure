import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Category, CategoryService, GeneralCategory } from '../services/category.service';

@Component({
  selector: 'app-category-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-manager.component.html',
  styleUrls: ['./category-manager.component.css']
})
export class CategoryManagerComponent implements OnInit {
  categories: Category[] = [];
  currentCategory!: Category;
  generalCategories: GeneralCategory[] = []; // Nouveau

  // États pour les popups
  showAddPopup = false;
  showEditPopup = false;
  deleteCategoryId: string | null = null;

  // Fichiers uploadés
  imageFile?: File;
  bannerFile?: File;

  // États pour la gestion des catégories générales
  showGeneralCategoryPopup = false;
  selectedGeneralCategory: string = '';


  loading: boolean = false;
  keywordInputValue: string = '';

  selectedCategory: Category | null = null;
  showDetailsPopup = false;

  constructor(private categoryService: CategoryService) { }

  ngOnInit(): void {
    this.currentCategory = this.getEmptyCategory();
    this.loadCategories();
    this.loadGeneralCategories(); // Charger les catégories générales
  }

  loadCategories(): void {
    this.loading = true;
    this.categoryService.getAllCategories(false).subscribe({
      next: (data) => {
        this.categories = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.loading = false;
      }
    });
  }

  loadGeneralCategories(): void {
    this.categoryService.getAllGeneralCategories(false).subscribe({
      next: (data) => {
        this.generalCategories = data;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des catégories générales:', error);
      }
    });
  }

  // Méthode pour créer une catégorie vide avec tous les champs
  getEmptyCategory(): Category {
    return {
      name: '',
      description: '',
      keywords: [],
      averageDuration: '',
      recoveryTime: '',
      priceRange: {
        min: 0,
        max: 0,
        currency: 'EUR'
      },
      benefits: [],
      faqs: [],
      displayOrder: 0,
      isActive: true,
      image: '',
      banner: '',
      metaTitle: '',
      metaDescription: '',
      slug: '',
      generalCategory: undefined
    };
  }
  // Ouvrir popup pour affecter une catégorie générale
  openGeneralCategoryPopup(category: Category): void {
    this.selectedCategory = category;
    this.selectedGeneralCategory = category.generalCategory as string || '';
    this.showGeneralCategoryPopup = true;
  }
  // Appliquer la catégorie générale
  applyGeneralCategory(): void {
    if (!this.selectedCategory || !this.selectedCategory._id) return;

    const categoryId = this.selectedCategory._id;
    const generalCategoryId = this.selectedGeneralCategory;

    if (generalCategoryId) {
      // 1. D'abord, retirer de l'ancienne catégorie générale si elle existe
      const currentGeneralCategory = this.selectedCategory.generalCategory;
      if (currentGeneralCategory && typeof currentGeneralCategory === 'string') {
        this.categoryService.removeSubCategoryFromGeneral(currentGeneralCategory, categoryId).subscribe({
          next: (success) => {
            if (success) {
              console.log('Retiré de l\'ancienne catégorie générale');
            }
          },
          error: (error) => console.error('Erreur lors du retrait:', error)
        });
      }

      // 2. Ajouter à la nouvelle catégorie générale
      this.categoryService.addSubCategoryToGeneral(generalCategoryId, categoryId).subscribe({
        next: (success) => {
          if (success) {
            // 3. Mettre à jour la catégorie avec la nouvelle référence
            this.categoryService.updateCategory(categoryId, {
              generalCategory: generalCategoryId
            }).subscribe({
              next: () => {
                // 4. Recharger LES DEUX listes pour mettre à jour les compteurs
                this.loadCategories();
                this.loadGeneralCategories(); // IMPORTANT : recharger les catégories générales
                this.showGeneralCategoryPopup = false;
                alert('Catégorie affectée avec succès !');
              },
              error: (error) => alert('Erreur: ' + error.message)
            });
          }
        },
        error: (error) => alert('Erreur: ' + error.message)
      });
    } else {
      // Retirer de la catégorie générale si existe
      const currentGeneralCategory = this.selectedCategory.generalCategory;
      if (currentGeneralCategory && typeof currentGeneralCategory === 'string') {
        this.categoryService.removeSubCategoryFromGeneral(currentGeneralCategory, categoryId).subscribe({
          next: (success) => {
            if (success) {
              // Pour retirer la référence, on envoie explicitement undefined
              const updateData: Partial<Category> = {
                generalCategory: undefined
              };

              this.categoryService.updateCategory(categoryId, updateData).subscribe({
                next: () => {
                  // Recharger LES DEUX listes
                  this.loadCategories();
                  this.loadGeneralCategories(); // IMPORTANT
                  this.showGeneralCategoryPopup = false;
                  alert('Catégorie retirée avec succès !');
                },
                error: (error) => alert('Erreur: ' + error.message)
              });
            }
          },
          error: (error) => alert('Erreur: ' + error.message)
        });
      } else {
        // Si pas de catégorie générale, simplement fermer
        this.showGeneralCategoryPopup = false;
      }
    }
  }
  // Obtenir le nom de la catégorie générale
  getGeneralCategoryName(category: Category): string {
    if (!category.generalCategory) return 'Non affectée';

    if (typeof category.generalCategory === 'string') {
      const generalCat = this.generalCategories.find(gc => gc._id === category.generalCategory);
      return generalCat ? generalCat.name : 'Catégorie générale';
    } else {
      return (category.generalCategory as GeneralCategory).name;
    }
  }


  // Ouvrir popup Ajouter
  openAddPopup(): void {
    this.currentCategory = this.getEmptyCategory();
    this.keywordInputValue = ''; // Réinitialiser l'input
    this.showAddPopup = true;
    this.imageFile = undefined;
    this.bannerFile = undefined;
  }

  // Ouvrir popup Modifier
  openEditPopup(category: Category): void {
    this.currentCategory = JSON.parse(JSON.stringify(category)); // Deep copy
    this.keywordInputValue = ''; // Réinitialiser l'input
    this.showEditPopup = true;
    this.imageFile = undefined;
    this.bannerFile = undefined;
  }

  // Gestion des fichiers image
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.imageFile = input.files[0];
      this.convertToBase64(this.imageFile, 'image');
    }
  }

  onBannerSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.bannerFile = input.files[0];
      this.convertToBase64(this.bannerFile, 'banner');
    }
  }

  convertToBase64(file: File, type: 'image' | 'banner'): void {
    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'image') {
        this.currentCategory.image = reader.result as string;
      } else {
        this.currentCategory.banner = reader.result as string;
      }
    };
    reader.readAsDataURL(file);
  }

  // Sauvegarder catégorie (mise à jour)
  saveCategory(isEdit: boolean): void {
    // Validation supplémentaire
    if (!this.isFormValid()) {
      alert('Veuillez remplir tous les champs obligatoires correctement.');
      return;
    }

    // S'assurer que max >= min
    if (this.currentCategory.priceRange.max < this.currentCategory.priceRange.min) {
      this.currentCategory.priceRange.max = this.currentCategory.priceRange.min;
    }

    // Préparer les données pour l'envoi
    const categoryData = { ...this.currentCategory };

    // Si c'est une chaîne vide, envoyer undefined pour l'API
    if (categoryData.generalCategory === '') {
      delete categoryData.generalCategory;
    }

    if (isEdit && this.currentCategory._id) {
      this.categoryService.updateCategory(this.currentCategory._id, categoryData).subscribe({
        next: () => {
          this.loadCategories();
          this.showEditPopup = false;
          alert('Catégorie mise à jour avec succès!');
        },
        error: (error) => alert('Erreur: ' + error.message)
      });
    } else {
      this.categoryService.createCategory(categoryData).subscribe({
        next: () => {
          this.loadCategories();
          this.showAddPopup = false;
          alert('Catégorie créée avec succès!');
        },
        error: (error) => alert('Erreur: ' + error.message)
      });
    }
  }
  // Dans category-manager.component.ts
  filterByGeneralCategory(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const generalCategoryId = select.value;

    if (!generalCategoryId) {
      this.loadCategories();
      return;
    }

    if (generalCategoryId === 'unassigned') {
      this.viewUnassignedCategories();
      return;
    }

    this.loading = true;
    this.categoryService.getCategoriesByGeneralCategory(generalCategoryId).subscribe({
      next: (data) => {
        this.categories = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.loading = false;
      }
    });
  }
  // Voir les catégories non affectées
  viewUnassignedCategories(): void {
    this.loading = true;
    this.categoryService.getCategoriesWithoutGeneral().subscribe({
      next: (data) => {
        this.categories = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.loading = false;
      }
    });
  }


  // Ouvrir confirmation suppression
  openDeletePopup(id: string): void {
    this.deleteCategoryId = id;
  }

  // Confirmer suppression
  confirmDelete(): void {
    if (this.deleteCategoryId) {
      this.categoryService.deleteCategory(this.deleteCategoryId).subscribe({
        next: (success) => {
          if (success) {
            this.loadCategories();
            this.deleteCategoryId = null;
            alert('Catégorie supprimée avec succès!');
          }
        },
        error: (error) => alert('Erreur: ' + error.message)
      });
    }
  }

  // Ajouter un mot-clé (version corrigée)
  addKeyword(): void {
    const keyword = this.keywordInputValue.trim();
    if (keyword && !this.currentCategory.keywords.includes(keyword)) {
      this.currentCategory.keywords.push(keyword);
      this.keywordInputValue = ''; // Vide l'input
    }
  }

  // Supprimer un mot-clé
  removeKeyword(index: number): void {
    this.currentCategory.keywords.splice(index, 1);
  }

  // Fermer tous les popups
  closePopups(): void {
    this.showAddPopup = false;
    this.showEditPopup = false;
    this.deleteCategoryId = null;
    this.showGeneralCategoryPopup = false;
    this.keywordInputValue = '';
  }

  calculateAveragePrice(): string {
    if (this.categories.length === 0) return '0 €';

    const total = this.categories.reduce((sum, category) => {
      const avg = (category.priceRange.min + category.priceRange.max) / 2;
      return sum + avg;
    }, 0);

    const average = total / this.categories.length;
    return `${Math.round(average)} €`;
  }

  // Vérification du formulaire (améliorée)
  isFormValid(): boolean {
    if (!this.currentCategory.priceRange) {
      return false;
    }

    return (
      this.currentCategory.name?.trim().length >= 3 &&
      this.currentCategory.name?.trim().length <= 100 &&
      this.currentCategory.description?.trim().length >= 50 &&
      this.currentCategory.description?.trim().length <= 20000 &&
      this.currentCategory.averageDuration?.trim().length > 0 &&
      this.currentCategory.recoveryTime?.trim().length > 0 &&
      this.currentCategory.priceRange.min >= 0 &&
      this.currentCategory.priceRange.max >= this.currentCategory.priceRange.min
    );
  }

  viewCategoryDetails(id: string): void {
    const category = this.categories.find(c => c._id === id);
    if (category) {
      this.selectedCategory = JSON.parse(JSON.stringify(category)); // Deep copy
      this.showDetailsPopup = true;
    }
  }

  // Fermer la popup des détails
  closeDetailsPopup(): void {
    this.showDetailsPopup = false;
    this.selectedCategory = null;
  }

  formatDate(date: any): string {
    if (!date) return 'Non spécifié';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  // Obtenir l'URL de l'image par défaut
  getDefaultImage(): string {
    return 'assets/images/category-default.jpg';
  }

  // Nettoyage de la description pour l'affichage
  truncateDescription(description: string, maxLength: number = 100): string {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  }
  // Méthode pour obtenir les détails de la catégorie générale sélectionnée
  getSelectedGeneralCategory(): GeneralCategory | undefined {
    if (!this.currentCategory.generalCategory) {
      return undefined;
    }

    if (typeof this.currentCategory.generalCategory === 'string') {
      return this.generalCategories.find(gc => gc._id === this.currentCategory.generalCategory);
    }

    // Si c'est déjà un objet GeneralCategory
    return this.currentCategory.generalCategory as GeneralCategory;
  }
  // Version la plus simple
  getGeneralCategorySubCount(gc: GeneralCategory): number {
    return gc.subCategoriesCount || 0;
  }
}
