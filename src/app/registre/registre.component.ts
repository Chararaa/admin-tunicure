import { CommonModule } from '@angular/common'; import { HttpClient } from '@angular/common/http'; import { Component } from '@angular/core'; import { FormBuilder, FormGroup, ReactiveFormsModule, 
Validators } from '@angular/forms'; import { Router } from '@angular/router'; import { DoctorRegister, DoctorService } from '../services/doctor.service';

@Component({
  selector: 'app-registre',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './registre.component.html',
  styleUrl: './registre.component.css'
})
export class RegistreComponent {
  registerForm: FormGroup;
  specialties = [
 "Plastic Surgery",
  "Aesthetic Surgery",
  "Reconstructive Surgery",
  "Burn Surgery",
  "General Surgery",
  "Digestive Surgery",
  "Bariatric Surgery",
  "Dental Surgery",
  "Cosmetic Dentistry",
  "Implantology",
  "Hair Transplant Surgery",
  "Ophthalmology",
  "Maxillofacial Surgery",
  "Stomatology",
  "Aesthetic Medicine",
    "Nose Job",
    "Liposuction",
    "Breast Augmentation",
    "Gastric Sleeve",
    "Tummy Tuck",
    "BBL",
    "Hair Transplant", "General, Digestive, Oncologic, Colorectal and Bariatric Surgeon",
    'Maxillofacial Surgeon', "Professor & Head of Department - Plastic, Reconstructive, Aesthetic Surgery & Burn", "Plastic, Reconstructive and Aesthetic Surgeon",
    "MD, FEBO – Ophthalmologist"

  ];
  loading = false;
  message = '';
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private doctorService: DoctorService,
    private router: Router
  ) {
    this.registerForm = this.createForm();
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      specialty: ['', [Validators.required]],
      licenseNumber: ['', [Validators.required]],
      yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      bio: [''],
      education: [''],
      certifications: [''],
      languages: ['']
    }, { validator: this.passwordMatchValidator });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Vérifier la taille du fichier (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.message = 'La taille de l\'image ne doit pas dépasser 2MB';
        return;
      }

      // Vérifier le type de fichier
      if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
        this.message = 'Seules les images JPEG, JPG, PNG et GIF sont autorisées';
        return;
      }

      this.selectedFile = file;

      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // NOUVELLE METHODE: Convertir le fichier en base64
  private convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }


  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  async onSubmit() {
    if (this.registerForm.valid) {
      this.loading = true;
      this.message = '';

      try {
        let imageBase64 = '';

        // Convertir l'image en base64 si un fichier est sélectionné
        if (this.selectedFile) {
          imageBase64 = await this.convertFileToBase64(this.selectedFile);
        }

        const formData: DoctorRegister = {
          name: this.registerForm.value.name,
          email: this.registerForm.value.email,
          phone: this.registerForm.value.phone,
          specialties: this.registerForm.value.specialties,
          licenseNumber: this.registerForm.value.licenseNumber,
          yearsOfExperience: this.registerForm.value.yearsOfExperience,
          password: this.registerForm.value.password,
          bio: this.registerForm.value.bio,
          education: this.registerForm.value.education ? [this.registerForm.value.education] : [],
          certifications: this.registerForm.value.certifications ? [this.registerForm.value.certifications] : [],
          languages: this.registerForm.value.languages
            ? this.registerForm.value.languages.split(',').map((lang: string) => lang.trim()).filter((lang: string) => lang.length > 0)
            : [],
          image: imageBase64 // AJOUTER L'IMAGE
        };

        this.doctorService.registerDoctor(formData).subscribe({
          next: (response) => {
            this.loading = false;
            this.message = response.message;
            this.registerForm.reset();
            this.imagePreview = null;
            this.selectedFile = null;

            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 3000);
          },
          error: (error) => {
            this.loading = false;
            this.message = error.error?.error || 'Une erreur est survenue lors de l\'inscription';
          }
        });
      } catch (error) {
        this.loading = false;
        this.message = 'Erreur lors du traitement de l\'image';
      }
    }
  }
}
