
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';


export interface Location {
  country: string;
  international: boolean;
}

export interface ExperienceHighlight {
  title: string;
  value: string;
}

export interface Service {
  name: string;
  description: string;
}

export interface SocialLinks {
  website?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
}

export interface AppointmentInfo {
  bookingLink?: string;
  beforeAfterGallery?: string[];
  consultationFee?: number;
  availability?: {
    days: string[];
    hours: string;
  };
}

export interface Doctor {
  _id?: string;
  personalInfo: {
    name: string;
    title?: string; // NOUVEAU: "COSMETIC & IMPLANT DENTIST"
    email: string;
    phone?: string;
    specialties: string[];
    licenseNumber?: string;
    yearsOfExperience?: number;
    image?: string;
    bannerImage?: string; // NOUVEAU: Image bannière
    location?: Location; // NOUVEAU: Pour "Tunisia I International Training"
  };
  professionalInfo: {
    bio?: string;
    shortDescription?: string; // NOUVEAU: Description courte
    tagline?: string; // NOUVEAU: "Digital Smile Design | Full Digital Dentistry"
    education: string[];
    certifications: string[];
    languages: string[];
    services: Service[]; // NOUVEAU
    experienceHighlights: ExperienceHighlight[]; // NOUVEAU: Points clés
    socialLinks: SocialLinks; // NOUVEAU
  };
  appointmentInfo: AppointmentInfo; // NOUVEAU
  statistics: {
    totalOperations: number;
    completedOperations: number;
    successRate: number;
    patientSatisfaction?: number; // NOUVEAU
  };
  isActive: boolean;
  isVerified: boolean;
  featured?: boolean; // NOUVEAU: Pour mettre en avant
  createdAt: Date;
}

export interface DoctorRegister {
  name: string;
  title?: string; // NOUVEAU
  email: string;
  phone?: string;
  specialties: string[];
  licenseNumber?: string;
  yearsOfExperience?: number;
  password: string;
  bio?: string;
  shortDescription?: string; // NOUVEAU
  tagline?: string; // NOUVEAU
  education?: string[];
  certifications?: string[];
  languages?: string[];
  services?: Service[]; // NOUVEAU
  experienceHighlights?: ExperienceHighlight[]; // NOUVEAU
  image?: string;
  bannerImage?: string; // NOUVEAU
  location?: Location; // NOUVEAU
  socialLinks?: SocialLinks; // NOUVEAU
  appointmentInfo?: AppointmentInfo; // NOUVEAU
}

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Récupérer tous les docteurs
  getDoctors(params?: any): Observable<Doctor[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return this.http.get<Doctor[]>(`${this.apiUrl}/doctors`, { params: httpParams });
  }

  // Récupérer les docteurs par spécialité
  getDoctorsBySpecialty(specialty: string): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${this.apiUrl}/doctors/specialty/${specialty}`);
  }

  // Récupérer un docteur spécifique
  getDoctor(id: string): Observable<Doctor> {
    return this.http.get<Doctor>(`${this.apiUrl}/doctors/${id}`);
  }

  // Créer un nouveau docteur
  createDoctor(doctor: Doctor): Observable<Doctor> {
    return this.http.post<Doctor>(`${this.apiUrl}/doctors`, doctor);
  }

  // Mettre à jour un docteur
  updateDoctor(id: string, doctor: Doctor): Observable<Doctor> {
    return this.http.put<Doctor>(`${this.apiUrl}/doctors/${id}`, doctor);
  }

  // Supprimer un docteur (soft delete)
  deleteDoctor(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/doctors/${id}`);
  }

  // Inscription d'un docteur
  registerDoctor(doctorData: DoctorRegister): Observable<{ message: string, doctor: Doctor }> {
    return this.http.post<{ message: string, doctor: Doctor }>(`${this.apiUrl}/doctors/register`, doctorData);
  }

  // Récupérer les docteurs en attente
  getPendingDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${this.apiUrl}/doctors/pending/verification`);
  }

  // Valider un docteur
  verifyDoctor(id: string): Observable<{ message: string, doctor: Doctor }> {
    return this.http.patch<{ message: string, doctor: Doctor }>(`${this.apiUrl}/doctors/${id}/verify`, {});
  }

  // NOUVELLE MÉTHODE: Récupérer les docteurs "featured"
  getFeaturedDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${this.apiUrl}/doctors/featured/doctors`);
  }
}
