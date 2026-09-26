import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Doctor, DoctorService, DoctorRegister, ExperienceHighlight, Service, SocialLinks, Location, AppointmentInfo } from '../services/doctor.service';
import { DoctorStatisticsComponent } from "../statistics/statistics.component";

@Component({
  selector: 'app-doctor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doctor.component.html',
  styleUrls: ['./doctor.component.css']
})
export class DoctorComponent implements OnInit {
  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  selectedDoctor: Doctor | null = null;
  searchTerm: string = '';
  selectedSpecialty: string = 'all';
  isLoading: boolean = false;
  showStatistics: boolean = false;
  educationInput: string = '';
  certificationsInput: string = '';
  languagesInput: string = '';
  servicesInput: string = ''; // NOUVEAU
  experienceHighlightsInput: string = ''; // NOUVEAU
  pendingDoctors: Doctor[] = [];
  activeTab: string = 'verified';
  editEducationInput: string = '';
  editCertificationsInput: string = '';
  editLanguagesInput: string = '';
  editServicesInput: string = '';
  editExperienceHighlightsInput: string = '';
  editLocationCountry: string = '';
  editLocationInternational: boolean = false;
  editSocialLinks: SocialLinks = {};
  editAppointmentInfo: AppointmentInfo = {};
  editBeforeAfterGalleryInput: string = '';
  editGalleryFiles: File[] = [];
  showAddDoctorPopup: boolean = false;
  showEditDoctorPopup: boolean = false;
  showDetailsPopup: boolean = false;

  // Variables pour les nouveaux champs
  selectedBannerFile: File | null = null; // NOUVEAU
  locationCountry: string = ''; // NOUVEAU
  locationInternational: boolean = false; // NOUVEAU
  socialLinks: SocialLinks = {}; // NOUVEAU
  appointmentInfo: AppointmentInfo = {}; // NOUVEAU

  beforeAfterGalleryInput: string = ''; // NOUVEAU: Pour l'entrée texte
  galleryFiles: File[] = []; // NOUVEAU: Pour les fichiers images


  // New doctor form
  newDoctor: DoctorRegister = {
    name: '',
    email: '',
    specialties: [] as string[],
    password: '',
    // NOUVEAUX CHAMPS
    title: '',
    shortDescription: '',
    tagline: '',
    image: '',
    bannerImage: '',
    location: {
      country: '',
      international: false
    },
    services: [],
    experienceHighlights: [],
    socialLinks: {},
    appointmentInfo: {},
    education: [],
    certifications: [],
    languages: []
  };

  // For update form
  updatedDoctor: Partial<Doctor> | null = null;

  // File upload
  selectedFile: File | null = null;
  selectedFileUpdate: File | null = null;

  specialties: string[] = [
      'Plastic Surgery',
  'Aesthetic Surgery',
  'Reconstructive Surgery',
  'Burn Surgery',
  'General Surgery',
  'Digestive Surgery',
  'Bariatric Surgery',
  'Dental Surgery',
  'Cosmetic Dentistry',
  'Implantology',
  'Hair Transplant Surgery',
  'Ophthalmology',
  'Maxillofacial Surgery',
  'Stomatology',
  'Aesthetic Medicine','Nose Job', 'Liposuction', 'Breast Augmentation',
    'Gastric Sleeve', 'Tummy Tuck', 'BBL', 'Hair Transplant',
    'Digital Smile Design', 'Full Digital Dentistry', "General, Digestive, Oncologic, Colorectal and Bariatric Surgeon",
    'Maxillofacial Surgeon', "Professor & Head of Department - Plastic, Reconstructive, Aesthetic Surgery & Burn", "Plastic, Reconstructive and Aesthetic Surgeon",
    "MD, FEBO – Ophthalmologist"

];
  activeDetailTab: any;

  constructor(
    private doctorService: DoctorService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.loadDoctors();
    this.loadPendingDoctors();
  }

  loadDoctors() {
    this.isLoading = true;
    this.doctorService.getDoctors({
      verified: 'true',
      active: 'true'
    }).subscribe({
      next: (doctors) => {
        this.doctors = doctors;
        this.filteredDoctors = doctors;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading doctors:', error);
        this.isLoading = false;
      }
    });
  }

  loadPendingDoctors() {
    this.doctorService.getPendingDoctors().subscribe({
      next: (doctors) => {
        this.pendingDoctors = doctors;
      },
      error: (error) => {
        console.error('Error loading pending doctors:', error);
      }
    });
  }

  verifyDoctor(doctorId: string) {
    if (confirm('Êtes-vous sûr de vouloir valider ce docteur ?')) {
      this.doctorService.verifyDoctor(doctorId).subscribe({
        next: (response) => {
          alert(response.message);
          this.loadPendingDoctors();
          this.loadDoctors();
        },
        error: (error) => {
          console.error('Error verifying doctor:', error);
          alert('Erreur lors de la validation du docteur');
        }
      });
    }
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  filterDoctors() {
    this.filteredDoctors = this.doctors.filter(doctor => {
      const matchesSpecialty = this.selectedSpecialty === 'all' ||
        doctor.personalInfo.specialties.includes(this.selectedSpecialty)
      const matchesSearch = doctor.personalInfo.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        doctor.personalInfo.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (doctor.personalInfo.title && doctor.personalInfo.title.toLowerCase().includes(this.searchTerm.toLowerCase()));
      return matchesSpecialty && matchesSearch;
    });
  }



  // File selection for new doctor
  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile) {
      this.convertFileToBase64(this.selectedFile).then(base64 => {
        this.newDoctor.image = base64;
      });
    }
  }

  // NOUVELLE MÉTHODE: Sélection de la bannière
  onBannerFileSelected(event: any) {
    this.selectedBannerFile = event.target.files[0];
    if (this.selectedBannerFile) {
      this.convertFileToBase64(this.selectedBannerFile).then(base64 => {
        this.newDoctor.bannerImage = base64;
      });
    }
  }

  // File selection for update doctor
  onFileSelectedUpdate(event: any) {
    this.selectedFileUpdate = event.target.files[0];
    if (this.selectedFileUpdate && this.updatedDoctor?.personalInfo) {
      this.convertFileToBase64(this.selectedFileUpdate).then(base64 => {
        this.updatedDoctor!.personalInfo!.image = base64;
      });
    }
  }

  private convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  createDoctor() {
    // Validation
    if (!this.newDoctor.name || !this.newDoctor.email || !this.newDoctor.specialties) {
      alert('Veuillez remplir les champs obligatoires: nom, email et spécialité');
      return;
    }

    // Conversion des champs texte en tableaux
    this.onEducationBlur();
    this.onCertificationsBlur();
    this.onLanguagesBlur();

    // Construire l'objet Doctor complet avec tous les champs
    const doctorToCreate: any = {
      personalInfo: {
        name: this.newDoctor.name,
        title: this.newDoctor.title || '',
        email: this.newDoctor.email,
        phone: this.newDoctor.phone || '',
        specialty: this.newDoctor.specialties,
        licenseNumber: this.newDoctor.licenseNumber || '',
        yearsOfExperience: this.newDoctor.yearsOfExperience || 0,
        image: this.newDoctor.image || '',
        bannerImage: this.newDoctor.bannerImage || '',
        location: {
          country: this.locationCountry || '',
          international: this.locationInternational || false
        }
      },
      professionalInfo: {
        bio: this.newDoctor.bio || '',
        shortDescription: this.newDoctor.shortDescription || '',
        tagline: this.newDoctor.tagline || '',
        education: this.newDoctor.education || [],
        certifications: this.newDoctor.certifications || [],
        languages: this.newDoctor.languages || [],
        services: this.newDoctor.services || [],
        experienceHighlights: this.newDoctor.experienceHighlights || [],
        socialLinks: this.socialLinks || {}
      },
      appointmentInfo: {
        bookingLink: this.appointmentInfo.bookingLink || '',
        consultationFee: this.appointmentInfo.consultationFee || 0,
        beforeAfterGallery: this.newDoctor.appointmentInfo?.beforeAfterGallery || []
      },
      statistics: {
        totalOperations: 0,
        completedOperations: 0,
        successRate: 0
      },
      isActive: true,
      isVerified: true,
      password: 'defaultPassword123', // Mot de passe par défaut pour la création admin
      createdAt: new Date()
    };

    console.log('Création docteur dashboard:', doctorToCreate);

    // Utiliser la route POST /doctors
    this.doctorService.createDoctor(doctorToCreate).subscribe({
      next: (createdDoctor) => {
        this.doctors.push(createdDoctor);
        this.filterDoctors();
        this.resetNewDoctorForm();
        this.closePopups();
        alert('Docteur créé avec succès !');
      },
      error: (error) => {
        console.error('Erreur:', error);
        alert('Erreur: ' + (error.error?.error || error.message || 'Erreur inconnue'));
      }
    });
  }

  updateDoctor() {
    if (!this.updatedDoctor?._id) return;

    // Collecter toutes les données des champs texte et composants imbriqués
    this.onEditEducationBlur();
    this.onEditCertificationsBlur();
    this.onEditLanguagesBlur();
    this.onEditServicesBlur();
    this.onEditExperienceHighlightsBlur();
    this.onEditGalleryBlur();

    if (this.updatedDoctor.personalInfo) {
      if (!this.updatedDoctor.personalInfo.location) {
        this.updatedDoctor.personalInfo.location = { country: '', international: false };
      }
      this.updatedDoctor.personalInfo.location.country = this.editLocationCountry || '';
      this.updatedDoctor.personalInfo.location.international = this.editLocationInternational || false;
    }

    if (this.updatedDoctor.professionalInfo) {
      this.updatedDoctor.professionalInfo.socialLinks = this.editSocialLinks || {};
    }

    if (this.updatedDoctor.appointmentInfo) {
      this.updatedDoctor.appointmentInfo.bookingLink = this.editAppointmentInfo.bookingLink || '';
      this.updatedDoctor.appointmentInfo.consultationFee = this.editAppointmentInfo.consultationFee || 0;
    } else {
      this.updatedDoctor.appointmentInfo = {
        bookingLink: this.editAppointmentInfo.bookingLink || '',
        consultationFee: this.editAppointmentInfo.consultationFee || 0,
        beforeAfterGallery: []
      };
    }

    this.doctorService.updateDoctor(this.updatedDoctor._id, this.updatedDoctor as Doctor).subscribe({
      next: (updatedDoctor) => {
        const index = this.doctors.findIndex(d => d._id === updatedDoctor._id);
        if (index !== -1) {
          this.doctors[index] = updatedDoctor;
          this.filteredDoctors = [...this.doctors];
          this.selectedDoctor = updatedDoctor;
        }
        this.closePopups();
        alert('Docteur mis à jour avec succès !');
      },
      error: (error) => {
        console.error('Error updating doctor:', error);
        alert('Erreur lors de la mise à jour : ' + (error.error?.error || error.message || 'Erreur inconnue'));
      }
    });
  }


  deleteDoctor() {
    if (!this.selectedDoctor || !this.selectedDoctor._id) {
      console.error('Aucun docteur sélectionné');
      return;
    }

    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement ce docteur ?')) {
      const doctorId = this.selectedDoctor._id;

      this.doctorService.deleteDoctor(doctorId).subscribe({
        next: () => {
          // ✅ Mettre à jour la liste des docteurs
          this.doctors = this.doctors.filter(d => d._id !== doctorId);
          this.filteredDoctors = this.doctors;

          // ✅ Réinitialiser les variables
          this.selectedDoctor = null;
          this.updatedDoctor = null;

          // ✅ Fermer les popups
          this.closePopups();

          alert('Docteur supprimé avec succès');
        },
        error: (error) => {
          console.error('Error deleting doctor:', error);
          alert('Erreur lors de la suppression: ' + (error.error?.error || error.message));
        }
      });
    }
  }
  private closeModal(modalId: string) {
    const modal = document.getElementById(modalId);
    if (modal) {
      const bootstrapModal = (window as any).bootstrap?.Modal?.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      } else {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
      }
    }
  }

  private resetNewDoctorForm() {
    this.newDoctor = {
      name: '',
      email: '',
      specialties: [],
      password: '',
      title: '',
      shortDescription: '',
      tagline: '',
      image: '',
      bannerImage: '',
      location: {
        country: '',
        international: false
      },
      services: [],
      experienceHighlights: [],
      socialLinks: {},
      appointmentInfo: {
        beforeAfterGallery: [],
        bookingLink: '',
        consultationFee: 0
      },
      education: [],
      certifications: [],
      languages: []
    };

    this.selectedFile = null;
    this.selectedBannerFile = null;
    this.locationCountry = '';
    this.locationInternational = false;
    this.socialLinks = {};
    this.appointmentInfo = {
      beforeAfterGallery: [],
      bookingLink: '',
      consultationFee: 0
    };
    this.educationInput = '';
    this.certificationsInput = '';
    this.languagesInput = '';
    this.servicesInput = '';
    this.experienceHighlightsInput = '';
    this.beforeAfterGalleryInput = '';
    this.galleryFiles = [];
  }

  // NOUVELLE MÉTHODE: Gérer les services
  onServicesBlur() {
    if (this.servicesInput) {
      this.newDoctor.services = this.servicesInput
        .split('\n')
        .map(service => {
          const parts = service.split(':');
          return {
            name: parts[0]?.trim() || '',
            description: parts[1]?.trim() || ''
          };
        })
        .filter(service => service.name.length > 0);
    }
  }

  // NOUVELLE MÉTHODE: Gérer les points d'expérience
  onExperienceHighlightsBlur() {
    if (this.experienceHighlightsInput) {
      this.newDoctor.experienceHighlights = this.experienceHighlightsInput
        .split('\n')
        .map(line => {
          const parts = line.split(':');
          return {
            title: parts[0]?.trim() || '',
            value: parts[1]?.trim() || ''
          };
        })
        .filter(highlight => highlight.title.length > 0);
    }
  }

  // Méthodes existantes modifiées
  onEducationBlur() {
    if (this.educationInput) {
      this.newDoctor.education = this.educationInput
        .split('\n')
        .map(edu => edu.trim())
        .filter(edu => edu.length > 0);
    }
  }

  onCertificationsBlur() {
    if (this.certificationsInput) {
      this.newDoctor.certifications = this.certificationsInput
        .split('\n')
        .map(cert => cert.trim())
        .filter(cert => cert.length > 0);
    }
  }

  onLanguagesBlur() {
    if (this.languagesInput) {
      this.newDoctor.languages = this.languagesInput
        .split(',')
        .map(lang => lang.trim())
        .filter(lang => lang.length > 0);
    }
  }

  canManageDoctors(): boolean {
    try {
      return this.authService.hasRole('super_admin') || this.authService.hasRole('admin');
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  getSuccessRateColor(rate: number): string {
    if (rate >= 90) return 'text-success';
    if (rate >= 70) return 'text-warning';
    return 'text-danger';
  }

  getDoctorImage(doctor: Doctor): string {
    return doctor?.personalInfo?.image || 'assets/images/profile/user-1.jpg';
  }

  // NOUVELLE MÉTHODE: Obtenir l'image bannière
  getDoctorBannerImage(doctor: Doctor): string {
    return doctor?.personalInfo?.bannerImage || 'assets/images/banner/default-banner.jpg';
  }

  isDoctorValid(doctor: any): boolean {
    return doctor && doctor.personalInfo && doctor.personalInfo.name;
  }


  // Méthode pour sélectionner plusieurs images de galerie
  onGalleryFilesSelected(event: any) {
    const files: FileList = event.target.files;
    this.galleryFiles = Array.from(files);

    // Initialiser appointmentInfo s'il est undefined
    if (!this.newDoctor.appointmentInfo) {
      this.newDoctor.appointmentInfo = {
        beforeAfterGallery: []
      };
    }

    // Convertir tous les fichiers en base64
    const base64Promises = this.galleryFiles.map(file =>
      this.convertFileToBase64(file)
    );

    Promise.all(base64Promises).then(base64Images => {
      // S'assurer que beforeAfterGallery existe
      if (!this.newDoctor.appointmentInfo!.beforeAfterGallery) {
        this.newDoctor.appointmentInfo!.beforeAfterGallery = [];
      }
      this.newDoctor.appointmentInfo!.beforeAfterGallery = base64Images;
    });
  }

  // Méthode pour gérer l'entrée texte de galerie (URLs)
  onGalleryBlur() {
    if (this.beforeAfterGalleryInput) {
      // Initialiser appointmentInfo s'il est undefined
      if (!this.newDoctor.appointmentInfo) {
        this.newDoctor.appointmentInfo = {
          beforeAfterGallery: []
        };
      }

      const urls = this.beforeAfterGalleryInput
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      this.newDoctor.appointmentInfo!.beforeAfterGallery = urls;
    }
  }

  // Méthode pour supprimer une image de la galerie
  removeGalleryImage(index: number) {
    // Vérifier que appointmentInfo et beforeAfterGallery existent
    if (this.newDoctor.appointmentInfo?.beforeAfterGallery) {
      this.newDoctor.appointmentInfo.beforeAfterGallery.splice(index, 1);
      this.galleryFiles.splice(index, 1);
    }
  }

  // Créer un getter pour faciliter l'accès à la galerie
  get gallery(): string[] {
    return this.newDoctor.appointmentInfo?.beforeAfterGallery || [];
  }

  // Getter pour la longueur de la galerie
  get galleryLength(): number {
    return this.gallery.length;
  }



  // Ajoutez cette méthode pour préparer les données d'édition
  prepareEditForm(doctor: Doctor) {
    this.updatedDoctor = JSON.parse(JSON.stringify(doctor));

    // Remplir les champs texte
    this.editEducationInput = doctor.professionalInfo.education?.join('\n') || '';
    this.editCertificationsInput = doctor.professionalInfo.certifications?.join('\n') || '';
    this.editLanguagesInput = doctor.professionalInfo.languages?.join(', ') || '';
    this.editServicesInput = doctor.professionalInfo.services?.map(s => `${s.name}:${s.description}`).join('\n') || '';
    this.editExperienceHighlightsInput = doctor.professionalInfo.experienceHighlights?.map(e => `${e.title}:${e.value}`).join('\n') || '';
    this.editLocationCountry = doctor.personalInfo.location?.country || '';
    this.editLocationInternational = doctor.personalInfo.location?.international || false;
    this.editSocialLinks = doctor.professionalInfo.socialLinks || {};
    this.editAppointmentInfo = doctor.appointmentInfo || {};
    this.editBeforeAfterGalleryInput = doctor.appointmentInfo?.beforeAfterGallery?.join('\n') || '';
  }

  // Méthodes pour gérer les modifications
  onEditEducationBlur() {
    if (this.updatedDoctor?.professionalInfo) {
      this.updatedDoctor.professionalInfo.education = this.editEducationInput
        .split('\n')
        .map(edu => edu.trim())
        .filter(edu => edu.length > 0);
    }
  }

  onEditCertificationsBlur() {
    if (this.updatedDoctor?.professionalInfo) {
      this.updatedDoctor.professionalInfo.certifications = this.editCertificationsInput
        .split('\n')
        .map(cert => cert.trim())
        .filter(cert => cert.length > 0);
    }
  }

  onEditLanguagesBlur() {
    if (this.updatedDoctor?.professionalInfo) {
      this.updatedDoctor.professionalInfo.languages = this.editLanguagesInput
        .split(',')
        .map(lang => lang.trim())
        .filter(lang => lang.length > 0);
    }
  }

  onEditServicesBlur() {
    if (this.updatedDoctor?.professionalInfo) {
      this.updatedDoctor.professionalInfo.services = this.editServicesInput
        .split('\n')
        .map(service => {
          const parts = service.split(':');
          return {
            name: parts[0]?.trim() || '',
            description: parts[1]?.trim() || ''
          };
        })
        .filter(service => service.name.length > 0);
    }
  }

  onEditExperienceHighlightsBlur() {
    if (this.updatedDoctor?.professionalInfo) {
      this.updatedDoctor.professionalInfo.experienceHighlights = this.editExperienceHighlightsInput
        .split('\n')
        .map(line => {
          const parts = line.split(':');
          return {
            title: parts[0]?.trim() || '',
            value: parts[1]?.trim() || ''
          };
        })
        .filter(highlight => highlight.title.length > 0);
    }
  }

  onEditGalleryBlur() {
    if (this.updatedDoctor?.appointmentInfo) {
      const urls = this.editBeforeAfterGalleryInput
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      if (!this.updatedDoctor.appointmentInfo.beforeAfterGallery) {
        this.updatedDoctor.appointmentInfo.beforeAfterGallery = [];
      }

      // Ajouter les URLs aux images existantes (sans supprimer les uploads)
      const existingUrls = this.updatedDoctor.appointmentInfo.beforeAfterGallery
        .filter(img => typeof img === 'string' && img.startsWith('http'));

      // Conserver les images uploadées (base64)
      const uploadedImages = this.updatedDoctor.appointmentInfo.beforeAfterGallery
        .filter(img => typeof img === 'string' && img.startsWith('data:'));

      this.updatedDoctor.appointmentInfo.beforeAfterGallery = [
        ...uploadedImages,
        ...urls
      ];
    }
  }

  // Méthode pour sélectionner des images dans l'édition
  onEditGalleryFilesSelected(event: any) {
    const files: FileList = event.target.files;
    const newFiles = Array.from(files);

    if (!this.updatedDoctor?.appointmentInfo) {
      this.updatedDoctor!.appointmentInfo = {
        beforeAfterGallery: []
      };
    }

    // Ajouter les nouveaux fichiers à la liste
    this.editGalleryFiles = [...this.editGalleryFiles, ...newFiles];

    // Convertir les nouveaux fichiers en base64
    const base64Promises = newFiles.map(file =>
      this.convertFileToBase64(file)
    );

    Promise.all(base64Promises).then(base64Images => {
      if (this.updatedDoctor?.appointmentInfo) {
        if (!this.updatedDoctor.appointmentInfo.beforeAfterGallery) {
          this.updatedDoctor.appointmentInfo.beforeAfterGallery = [];
        }
        this.updatedDoctor.appointmentInfo.beforeAfterGallery = [
          ...this.updatedDoctor.appointmentInfo.beforeAfterGallery,
          ...base64Images
        ];
      }
    });
  }

  // Méthode pour supprimer une image en édition
  removeEditGalleryImage(index: number) {
    if (this.updatedDoctor?.appointmentInfo?.beforeAfterGallery) {
      this.updatedDoctor.appointmentInfo.beforeAfterGallery.splice(index, 1);

      // Ajuster les fichiers si nécessaire
      if (index < this.editGalleryFiles.length) {
        this.editGalleryFiles.splice(index, 1);
      }
    }
  }

  // Getter pour la galerie d'édition
  get editGallery(): string[] {
    return this.updatedDoctor?.appointmentInfo?.beforeAfterGallery || [];
  }

  // Modifiez la méthode selectDoctor pour préparer le formulaire
  selectDoctor(doctor: Doctor) {
    this.selectedDoctor = { ...doctor };
    this.updatedDoctor = JSON.parse(JSON.stringify(doctor));

    // Initialiser les champs d'édition
    this.editEducationInput = doctor.professionalInfo?.education?.join('\n') || '';
    this.editCertificationsInput = doctor.professionalInfo?.certifications?.join('\n') || '';
    this.editLanguagesInput = doctor.professionalInfo?.languages?.join(', ') || '';
    this.editLocationCountry = doctor.personalInfo?.location?.country || '';
    this.editLocationInternational = doctor.personalInfo?.location?.international || false;
    this.editSocialLinks = doctor.professionalInfo?.socialLinks || {};
    this.editAppointmentInfo = doctor.appointmentInfo || {};
  }



  openAddDoctorPopup() {
    this.resetNewDoctorForm();
    this.showAddDoctorPopup = true;
  }



  closePopups() {
    this.showAddDoctorPopup = false;
    this.showEditDoctorPopup = false;
    this.showDetailsPopup = false;
    this.selectedDoctor = null;
    this.updatedDoctor = null;
  }

  // Ajoutez ces méthodes dans la classe DoctorComponent

  // Validation des formulaires
  isFormValid(): boolean {
    return !!(
      this.newDoctor.name?.trim() &&
      this.newDoctor.email?.trim() &&
      this.newDoctor.specialties?.length
    );
  }

  isEditFormValid(): boolean {
    return !!(
      this.updatedDoctor?.personalInfo?.name?.trim() &&
      this.updatedDoctor?.personalInfo?.email?.trim() &&
      this.updatedDoctor?.personalInfo?.specialties?.length
    );
  }

  addService(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (!value) return;

    const parts = value.split(':');

    if (parts.length < 2) {
      alert('Format invalide. Utilisez : Nom:Description');
      return;
    }

    // ✅ SÉCURITÉ
    if (!this.newDoctor.services) {
      this.newDoctor.services = [];
    }

    this.newDoctor.services.push({
      name: parts[0].trim(),
      description: parts.slice(1).join(':').trim()
    });

    input.value = '';
  }



  removeService(index: number): void {
    if (this.newDoctor.services && this.newDoctor.services.length > index) {
      this.newDoctor.services.splice(index, 1);
    }
  }

  addEditService(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value && this.updatedDoctor?.professionalInfo) {
      const parts = value.split(':');
      if (parts.length >= 2) {
        if (!this.updatedDoctor.professionalInfo.services) {
          this.updatedDoctor.professionalInfo.services = [];
        }
        this.updatedDoctor.professionalInfo.services.push({
          name: parts[0].trim(),
          description: parts.slice(1).join(':').trim()
        });
        input.value = '';
      }
    }
  }

  removeEditService(index: number): void {
    if (this.updatedDoctor?.professionalInfo?.services) {
      this.updatedDoctor.professionalInfo.services.splice(index, 1);
    }
  }

  // Méthodes pour gérer les points d'expérience
  addExperience(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value) {
      const parts = value.split(':');
      if (parts.length >= 2) {
        if (!this.newDoctor.experienceHighlights) this.newDoctor.experienceHighlights = [];
        this.newDoctor.experienceHighlights.push({
          title: parts[0].trim(),
          value: parts.slice(1).join(':').trim()
        });
        input.value = '';
      }
    }
  }

  removeExperience(index: number): void {
    if (this.newDoctor.experienceHighlights) {
      this.newDoctor.experienceHighlights.splice(index, 1);
    }
  }

  addEditExperience(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value && this.updatedDoctor?.professionalInfo) {
      const parts = value.split(':');
      if (parts.length >= 2) {
        if (!this.updatedDoctor.professionalInfo.experienceHighlights) {
          this.updatedDoctor.professionalInfo.experienceHighlights = [];
        }
        this.updatedDoctor.professionalInfo.experienceHighlights.push({
          title: parts[0].trim(),
          value: parts.slice(1).join(':').trim()
        });
        input.value = '';
      }
    }
  }

  removeEditExperience(index: number): void {
    if (this.updatedDoctor?.professionalInfo?.experienceHighlights) {
      this.updatedDoctor.professionalInfo.experienceHighlights.splice(index, 1);
    }
  }

  // Méthodes pour la galerie
  addGalleryUrl(input: HTMLInputElement): void {
    const url = input.value.trim();
    if (url && this.isValidUrl(url)) {
      if (!this.newDoctor.appointmentInfo) {
        this.newDoctor.appointmentInfo = { beforeAfterGallery: [] };
      }
      if (!this.newDoctor.appointmentInfo.beforeAfterGallery) {
        this.newDoctor.appointmentInfo.beforeAfterGallery = [];
      }
      this.newDoctor.appointmentInfo.beforeAfterGallery.push(url);
      input.value = '';
    }
  }

  addEditGalleryUrl(input: HTMLInputElement): void {
    const url = input.value.trim();
    if (url && this.isValidUrl(url) && this.updatedDoctor?.appointmentInfo) {
      if (!this.updatedDoctor.appointmentInfo.beforeAfterGallery) {
        this.updatedDoctor.appointmentInfo.beforeAfterGallery = [];
      }
      this.updatedDoctor.appointmentInfo.beforeAfterGallery.push(url);
      input.value = '';
    }
  }

  // Méthode pour vérifier les liens sociaux
  hasSocialLinks(doctor: Doctor): boolean {
    const social = doctor.professionalInfo?.socialLinks;
    return !!(social?.website || social?.linkedin || social?.facebook || social?.instagram);
  }

  // Validation d'URL
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Méthodes pour ouvrir les popups
  openDetailsPopup(doctor: Doctor) {
    this.selectedDoctor = { ...doctor };
    this.showDetailsPopup = true;
  }

  openEditDoctorPopup(doctor: Doctor) {
    this.selectDoctor(doctor);
    this.showEditDoctorPopup = true;
  }

  // Méthode pour sélectionner la bannière dans l'édition
  onEditBannerFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && this.updatedDoctor?.personalInfo) {
      this.convertFileToBase64(file).then(base64 => {
        this.updatedDoctor!.personalInfo!.bannerImage = base64;
      });
    }
  }
  openEditFromDetails() {
    if (this.selectedDoctor) {
      // 1. Fermer la popup d'affichage
      this.showDetailsPopup = false;

      // 2. Préparer les données pour l'édition
      this.selectDoctor(this.selectedDoctor);

      // 3. Ouvrir la popup d'édition après un petit délai
      setTimeout(() => {
        this.showEditDoctorPopup = true;
      }, 50); // Petit délai pour s'assurer que la première popup est fermée
    }
  }

onSpecialtyChange(event: any, specialty: string) {
  if (event.target.checked) {
    this.newDoctor.specialties.push(specialty);
  } else {
    this.newDoctor.specialties = this.newDoctor.specialties.filter(s => s !== specialty);
  }
}
onEditSpecialtyChange(event: any, specialty: string) {
  if (!this.updatedDoctor?.personalInfo?.specialties) {
    this.updatedDoctor!.personalInfo!.specialties = [];
  }
  if (event.target.checked) {
    this.updatedDoctor!.personalInfo!.specialties.push(specialty);
  } else {
    this.updatedDoctor!.personalInfo!.specialties = this.updatedDoctor!.personalInfo!.specialties.filter(s => s !== specialty);
  }
}
}
