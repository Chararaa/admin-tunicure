// components/employee-register/employee-register.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EmployeeService, CreateEmployeeDto } from '../services/employee.service';

@Component({
  selector: 'app-employee-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './employee-register.component.html',
  styleUrls: ['./employee-register.component.css']
})
export class EmployeeRegisterComponent {
  registerForm: FormGroup;
  postes = ['marketing', 'dev', 'designer', 'commercial'];
  loading = false;
  message = '';
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  skillsInput: string = '';

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private router: Router
  ) {
    this.registerForm = this.createForm();
  }

  createForm(): FormGroup {
    return this.fb.group({
      // Informations personnelles
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],

      // Informations professionnelles
      poste: ['', [Validators.required]],
      bio: [''],
      skills: [[]],

      // Sécurité
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    const password = g.get('password');
    const confirmPassword = g.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ 'mismatch': true });
    } else {
      confirmPassword?.setErrors(null);
    }
    return null;
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
      this.message = '';

      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
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

  onSkillsBlur() {
    if (this.skillsInput) {
      const skillsArray = this.skillsInput
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);

      this.registerForm.patchValue({
        skills: skillsArray
      });
    }
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

        const formData: CreateEmployeeDto = {
          name: this.registerForm.value.name,
          email: this.registerForm.value.email,
          phone: this.registerForm.value.phone,
          poste: this.registerForm.value.poste,
          bio: this.registerForm.value.bio,
          skills: this.registerForm.value.skills || [],
          password: this.registerForm.value.password,
          image: imageBase64
        };

        console.log('Données envoyées:', formData);

        this.employeeService.createEmployee(formData).subscribe({
          next: (response) => {
            this.loading = false;
            this.message = 'Employé créé avec succès !';
            this.resetForm();

            // Redirection après 2 secondes
            setTimeout(() => {
              this.router.navigate(['/employees']);
            }, 2000);
          },
          error: (error) => {
            this.loading = false;
            console.error('Erreur complète:', error);
            this.message = error.error?.error || error.message || 'Une erreur est survenue lors de la création de l\'employé';
          }
        });
      } catch (error) {
        this.loading = false;
        this.message = 'Erreur lors du traitement de l\'image';
        console.error('Erreur conversion image:', error);
      }
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      this.markFormGroupTouched(this.registerForm);
      this.message = 'Veuillez corriger les erreurs dans le formulaire';
    }
  }

  private resetForm() {
    this.registerForm.reset({
      skills: [],
      poste: ''
    });
    this.imagePreview = null;
    this.selectedFile = null;
    this.skillsInput = '';
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  getPosteDisplayName(poste: string): string {
    const posteNames: { [key: string]: string } = {
      'marketing': 'Marketing',
      'dev': 'Développeur',
      'designer': 'Designer',
      'commercial': 'Commercial'
    };
    return posteNames[poste] || poste;
  }

  // Méthodes utilitaires pour le template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['email']) return 'Email invalide';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['mismatch']) return 'Les mots de passe ne correspondent pas';
    }
    return '';
  }
}