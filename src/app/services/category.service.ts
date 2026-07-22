
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';

export interface GeneralCategory {
  _id?: string;
  name: string;
  description: string;
  banner: string;
  video?: string;
  videoType?: string;
  icon?: string;
  subCategories?: Category[];
  displayOrder: number;
  isActive?: boolean;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
  subCategoriesCount?: number; // <-- AJOUTEZ CETTE LIGNE

}

export interface Category {
  _id?: string;
  name: string;
  description: string;
  image?: string;
  banner?: string;
  keywords: string[];
  averageDuration: string;
  recoveryTime: string;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  benefits?: Array<{ title: string; description: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  displayOrder: number;
  isActive?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  createdAt?: Date;
  updatedAt?: Date;
  generalCategory?: string | GeneralCategory | null | undefined;

}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: string;
  details?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = `${environment.apiUrl}/categories`;
  private generalCategoriesUrl = `${environment.apiUrl}/generalcategories`;


  constructor(private http: HttpClient) { }

  // =========================
  // CREATE
  // =========================
  createCategory(category: Category): Observable<Category> {
    return this.http.post<ApiResponse<Category>>(this.apiUrl, category).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Aucune catégorie retournée');
        }
        return res.data;
      }),
      catchError(this.handleError)
    );
  }

  // =========================
  // READ ALL
  // =========================
  getAllCategories(activeOnly: boolean = true): Observable<Category[]> {
    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('active', 'true');
    }

    return this.http.get<ApiResponse<Category[]>>(this.apiUrl, { params }).pipe(
      map(res => res.data ?? []),
      catchError(this.handleError)
    );
  }

  // =========================
  // READ ONE
  // =========================
  getCategoryById(id: string): Observable<Category> {
    return this.http.get<ApiResponse<Category>>(`${this.apiUrl}/${id}`).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Catégorie introuvable');
        }
        return res.data;
      }),
      catchError(this.handleError)
    );
  }

  // =========================
  // UPDATE
  // =========================
  updateCategory(id: string, category: Partial<Category>): Observable<Category> {
    return this.http.put<ApiResponse<Category>>(
      `${this.apiUrl}/${id}`,
      category
    ).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Échec de la mise à jour');
        }
        return res.data;
      }),
      catchError(this.handleError)
    );
  }

  // =========================
  // DELETE (soft)
  // =========================
  deleteCategory(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      map(res => res.success),
      catchError(this.handleError)
    );
  }

  // =========================
  // TOGGLE STATUS
  // =========================
  toggleCategoryStatus(id: string): Observable<Category> {
    return this.http.patch<ApiResponse<Category>>(
      `${this.apiUrl}/${id}/toggle-status`,
      {}
    ).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Impossible de changer le statut');
        }
        return res.data;
      }),
      catchError(this.handleError)
    );
  }

  // =========================
  // UTILS
  // =========================
  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  getEmptyCategory(): Category {
    return {
      name: '',
      description: '',
      keywords: [],
      averageDuration: '',
      recoveryTime: '',
      priceRange: { min: 0, max: 0, currency: 'EUR' },
      benefits: [],
      faqs: [],
      displayOrder: 0,
      isActive: true,

    };
  }

  // =========================
  // ERROR HANDLING
  // =========================
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur est survenue';

    if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
  // =========================
  // GENERAL CATEGORIES
  // =========================

  getAllGeneralCategories(activeOnly: boolean = true): Observable<GeneralCategory[]> {
    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('active', 'true');
    }

    // Pas besoin de paramètre si l'API retourne toujours les sous-catégories
    return this.http.get<ApiResponse<GeneralCategory[]>>(this.generalCategoriesUrl, { params }).pipe(
      map(res => res.data ?? []),
      catchError(this.handleError)
    );
  }

  // Récupérer les catégories par catégorie générale
  getCategoriesByGeneralCategory(generalCategoryId: string): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(`${this.apiUrl}/by-general/${generalCategoryId}`).pipe(
      map(res => res.data ?? []),
      catchError(this.handleError)
    );
  }

  // Récupérer les catégories sans catégorie générale
  getCategoriesWithoutGeneral(): Observable<Category[]> {
    return this.http.get<ApiResponse<Category[]>>(`${this.apiUrl}/without-general`).pipe(
      map(res => res.data ?? []),
      catchError(this.handleError)
    );
  }

  // Ajouter une sous-catégorie à une catégorie générale
  addSubCategoryToGeneral(generalCategoryId: string, subCategoryId: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(
      `${this.generalCategoriesUrl}/${generalCategoryId}/add-subcategory`,
      { subCategoryId }
    ).pipe(
      map(res => res.success),
      catchError(this.handleError)
    );
  }

  // Retirer une sous-catégorie d'une catégorie générale
  removeSubCategoryFromGeneral(generalCategoryId: string, subCategoryId: string): Observable<any> {
    return this.http.patch<ApiResponse<any>>(
      `${this.generalCategoriesUrl}/${generalCategoryId}/remove-subcategory`,
      { subCategoryId }
    ).pipe(
      map(res => res.success),
      catchError(this.handleError)
    );
  }
  // Dans category.service.ts, ajoute cette méthode :
  removeGeneralCategoryReference(categoryId: string): Observable<boolean> {
    return this.http.patch<ApiResponse<any>>(
      `${this.apiUrl}/${categoryId}/remove-general-category`,
      {}
    ).pipe(
      map(res => res.success),
      catchError(this.handleError)
    );
  }

  // Ou si tu n'as pas cette route, utilise update avec undefined :
  removeGeneralCategory(categoryId: string): Observable<Category> {
    return this.updateCategory(categoryId, { generalCategory: undefined });
  }
  createGeneralCategory(generalCategory: GeneralCategory): Observable<GeneralCategory> {
    return this.http.post<ApiResponse<GeneralCategory>>(this.generalCategoriesUrl, generalCategory).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Aucune catégorie générale retournée');
        }
        return res.data;
      }),
      catchError(this.handleError)
    );
  }

  updateGeneralCategory(id: string, generalCategory: Partial<GeneralCategory>): Observable<GeneralCategory> {
    return this.http.put<ApiResponse<GeneralCategory>>(
      `${this.generalCategoriesUrl}/${id}`,
      generalCategory
    ).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Échec de la mise à jour');
        }
        return res.data;
      }),
      catchError(this.handleError)
    );
  }

  deleteGeneralCategory(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<any>>(`${this.generalCategoriesUrl}/${id}`).pipe(
      map(res => res.success),
      catchError(this.handleError)
    );
  }

  toggleGeneralCategoryStatus(id: string): Observable<GeneralCategory> {
    return this.http.patch<ApiResponse<GeneralCategory>>(
      `${this.generalCategoriesUrl}/${id}/toggle-status`,
      {}
    ).pipe(
      map(res => {
        if (!res.data) {
          throw new Error('Impossible de changer le statut');
        }
        return res.data;
      }),
      catchError(this.handleError)
    );
  }

}
