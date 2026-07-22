import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeneralCategory, CategoryService } from '../services/category.service';

@Component({
  selector: 'app-general-category-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './general-category-manager.component.html',
  styleUrls: ['./general-category-manager.component.css']
})
export class GeneralCategoryManagerComponent implements OnInit {
  generalCategories: GeneralCategory[] = [];
  currentGeneralCategory!: GeneralCategory;

  showAddPopup = false;
  showEditPopup = false;
  deleteGeneralCategoryId: string | null = null;

  bannerFile?: File;
  iconFile?: File;

  loading: boolean = false;

  selectedGeneralCategory: GeneralCategory | null = null;
  showDetailsPopup = false;


  videoPlatforms = [
    { value: 'youtube', label: 'YouTube', icon: '▶️' },
    { value: 'facebook', label: 'Facebook', icon: '📘' },
    { value: 'instagram', label: 'Instagram', icon: '📷' },
    { value: 'vimeo', label: 'Vimeo', icon: '🎬' }
  ];


  constructor(private categoryService: CategoryService) { }

  ngOnInit(): void {
    this.currentGeneralCategory = this.getEmptyGeneralCategory();
    this.loadGeneralCategories();
  }

  loadGeneralCategories(): void {
    this.loading = true;
    this.categoryService.getAllGeneralCategories(false).subscribe({
      next: (data) => {
        console.log('Catégories générales chargées:', data); // AJOUTEZ CETTE LIGNE
        console.log('Première catégorie:', data[0]); // AJOUTEZ CETTE LIGNE
        console.log('Sous-catégories de la première:', data[0]?.subCategories); // AJOUTEZ CETTE LIGNE
        this.generalCategories = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.loading = false;
      }
    });
  }

  getEmptyGeneralCategory(): GeneralCategory {
    return {
      name: '',
      description: '',
      banner: '',
      video: '',
      videoType: '',
      icon: '',
      displayOrder: 0,
      isActive: true,
      subCategories: []
    };
  }

  openAddPopup(): void {
    this.currentGeneralCategory = this.getEmptyGeneralCategory();
    this.showAddPopup = true;
  }

  openEditPopup(generalCategory: GeneralCategory): void {
    this.currentGeneralCategory = JSON.parse(JSON.stringify(generalCategory));
    this.showEditPopup = true;
  }

  saveGeneralCategory(isEdit: boolean): void {
    if (!this.isFormValid()) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (isEdit && this.currentGeneralCategory._id) {
      // Mettre à jour
      this.categoryService.updateGeneralCategory(
        this.currentGeneralCategory._id,
        this.currentGeneralCategory
      ).subscribe({
        next: () => {
          this.loadGeneralCategories();
          this.showEditPopup = false;
          alert('Catégorie générale mise à jour avec succès!');
        },
        error: (error) => alert('Erreur: ' + error.message)
      });
    } else {
      // Créer
      this.categoryService.createGeneralCategory(this.currentGeneralCategory).subscribe({
        next: () => {
          this.loadGeneralCategories();
          this.showAddPopup = false;
          alert('Catégorie générale créée avec succès!');
        },
        error: (error) => alert('Erreur: ' + error.message)
      });
    }
  }

  // Ouvrir confirmation suppression
  openDeletePopup(id: string): void {
    this.deleteGeneralCategoryId = id;
  }

  // Confirmer suppression
  confirmDelete(): void {
    if (this.deleteGeneralCategoryId) {
      this.categoryService.deleteGeneralCategory(this.deleteGeneralCategoryId).subscribe({
        next: (success) => {
          if (success) {
            this.loadGeneralCategories();
            this.deleteGeneralCategoryId = null;
            alert('Catégorie générale supprimée avec succès!');
          }
        },
        error: (error) => alert('Erreur: ' + error.message)
      });
    }
  }

  toggleStatus(id: string): void {
    // Trouver la catégorie à modifier
    const category = this.generalCategories.find(gc => gc._id === id);
    if (!category) return;

    const newStatus = !category.isActive;

    this.categoryService.updateGeneralCategory(id, { isActive: newStatus }).subscribe({
      next: () => {
        this.loadGeneralCategories();
        alert('Statut changé avec succès!');
      },
      error: (error) => {
        console.error('Erreur de changement de statut:', error);
        alert('Erreur: ' + (error.error?.message || error.message || 'Échec du changement de statut'));
      }
    });
  }


  // Fermer tous les popups
  closePopups(): void {
    this.showAddPopup = false;
    this.showEditPopup = false;
    this.deleteGeneralCategoryId = null;
  }


  isFormValid(): boolean {
    return (
      this.currentGeneralCategory.name?.trim().length >= 3 &&
      this.currentGeneralCategory.description?.trim().length >= 50 &&
      this.currentGeneralCategory.banner?.trim().length > 0
    );
  }

  // Méthodes pour uploader les fichiers
  onBannerSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.bannerFile = input.files[0];
      this.convertToBase64(this.bannerFile, 'banner');
    }
  }

  // Méthode pour détecter la plateforme vidéo
  detectVideoPlatform(url: string | undefined): string {
    if (!url) return '';

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    } else if (url.includes('facebook.com') || url.includes('fb.watch')) {
      return 'facebook';
    } else if (url.includes('instagram.com')) {
      return 'instagram';
    } else if (url.includes('vimeo.com')) {
      return 'vimeo';
    }

    return '';
  }

  // Lorsque l'URL vidéo change
  onVideoUrlChange(url: string | undefined): void {
    // Assurez-vous que url n'est jamais undefined dans currentGeneralCategory
    this.currentGeneralCategory.video = url || '';
    this.currentGeneralCategory.videoType = this.detectVideoPlatform(url);
  }

  // Méthode pour afficher un aperçu de la vidéo
  getVideoPreview(): string {
    if (!this.currentGeneralCategory.video) return '';

    const url = this.currentGeneralCategory.video;
    const type = this.currentGeneralCategory.videoType;

    switch (type) {
      case 'youtube':
        const youtubeId = this.extractYoutubeId(url);
        return youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : '';

      case 'facebook':
        return this.getFacebookEmbedUrl(url);

      case 'instagram':
        return this.getInstagramEmbedUrl(url);

      case 'vimeo':
        const vimeoId = this.extractVimeoId(url);
        return vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : '';

      default:
        return '';
    }
  }

  private extractYoutubeId(url: string): string | null {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  }

  private extractVimeoId(url: string): string | null {
    const regExp = /vimeo\.com\/(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  }

  private getFacebookEmbedUrl(url: string): string {
    // Facebook nécessite l'API Graph pour obtenir l'URL d'embed
    // Pour l'instant, retournez l'URL originale
    return url;
  }

  private getInstagramEmbedUrl(url: string): string {
    if (url.includes('embed')) return url;
    return `${url}embed/`;
  }


  onIconSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.iconFile = input.files[0];
      this.convertToBase64(this.iconFile, 'icon');
    }
  }

  convertToBase64(file: File, type: 'banner' | 'video' | 'icon'): void {
    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'banner') {
        this.currentGeneralCategory.banner = reader.result as string;
      } else if (type === 'video') {
        this.currentGeneralCategory.video = reader.result as string;
      } else if (type === 'icon') {
        this.currentGeneralCategory.icon = reader.result as string;
      }
    };
    reader.readAsDataURL(file);
  }

  viewGeneralCategoryDetails(id: string): void {
    const generalCategory = this.generalCategories.find(gc => gc._id === id);
    if (generalCategory) {
      this.selectedGeneralCategory = JSON.parse(JSON.stringify(generalCategory)); // Deep copy
      this.showDetailsPopup = true;
    }
  }

  // Fermer la popup des détails
  closeDetailsPopup(): void {
    this.showDetailsPopup = false;
    this.selectedGeneralCategory = null;
  }

}