import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';


export interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  address?: string;
  zipCode?: string;
  country?: string;
  state?: string;
  dateBirth?: Date;
  weight?: number;
  height?: number;
  age?: number;
}

export interface MedicalInfo {
  smokes: 'yes' | 'no';
  alcoholConsumption?: string;
  contagiousDisease?: string;
  previousOperations: 'yes' | 'no';
  previousOperationsDetails?: string;
  woundHealingAbnormality?: string;
  bleedingClottingAbnormality?: string;
  chronicMedication: 'yes' | 'no';
  allergies: 'yes' | 'no';
  allergiesDetails?: string;
  expectations?: string;
}

export interface Order {
  _id?: string;
  clientInfo: ClientInfo;
  medicalInfo: MedicalInfo;
  category: string | { _id: string; name: string; description?: string };
  generalCategory?: string | { _id: string; name: string; description?: string };
  categoryName?: string;
  generalCategoryName?: string;
  pack: 'bronze' | 'silver' | 'gold';
  photos: string[];
  status: 'pending' | 'under_review' | 'phone_confirmed' | 'doctor_assigned' | 'doctor_replied' | 'appointment_scheduled' | 'completed' | 'invoice_sent'; // Ajouter 'invoice_sent'
  assignedToDoctor?: string;
  arrivalDate?: Date;
  price?: number;

  // AJOUTER CES CHAMPS POUR LE PAIEMENT :
  isDepositPaid?: boolean; // ✅ AJOUTER
  depositPaid?: boolean; // ✅ AJOUTER
  amountPaid?: number; // ✅ AJOUTER
  remainingAmount?: number; // ✅ AJOUTER

  // Interface Stripe
  stripe?: { // ✅ AJOUTER
    sessionId?: string;
    paymentId?: string;
    paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded';
    depositAmount?: number;
    totalAmount?: number;
    paidAt?: Date;
  };

  // Token pour paiement sécurisé
  paymentToken?: string; // ✅ AJOUTER
  paymentTokenExpires?: Date; // ✅ AJOUTER

  workflow: {
    submittedAt: Date;
    phoneCalledAt?: Date;
    phoneConfirmedAt?: Date;
    sentToDoctorAt?: Date;
    doctorRepliedAt?: Date;
    appointmentScheduledAt?: Date;
    completedAt?: Date;
    priceSetAt?: Date;
    // AJOUTER POUR LE PAIEMENT :
    invoiceSentAt?: Date; // ✅ AJOUTER
    depositPaidAt?: Date; // ✅ AJOUTER
    paymentConfirmedAt?: Date; // ✅ AJOUTER
  };

  notes: {
    phoneCallNotes?: string;
    doctorRemarks?: string;
    appointmentNotes?: string;
    price: number;  // Changer de Number à number (type TypeScript)
    priceNotes: string;  // Changer de String à string (type TypeScript)
  };

  appointmentDate?: Date;
  appointmentLocation?: string;
  completionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrdersResponse {
  orders: Order[];
  totalPages: number;
  currentPage: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Récupérer toutes les commandes
  getOrders(params?: any): Observable<OrdersResponse> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return this.http.get<OrdersResponse>(`${this.apiUrl}/orders`, { params: httpParams });
  }

  // Récupérer une commande spécifique
  getOrder(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/orders/${id}`);
  }

  // Confirmer par téléphone
  phoneConfirm(orderId: string, phoneCallNotes: string, arrivalDate: string): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/orders/${orderId}/phone-confirm`, {
      phoneCallNotes,
      arrivalDate
    });
  }

  // Assigner un docteur
  assignDoctor(orderId: string, doctorId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/orders/${orderId}/assign-doctor`, { doctorId });
  }

  // Réponse du docteur
  doctorReply(orderId: string, doctorRemarks: string): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/orders/${orderId}/doctor-reply`, { doctorRemarks });
  }


  // Programmer un rendez-vous
  scheduleAppointment(orderId: string, appointmentData: any): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/orders/${orderId}/schedule-appointment`, appointmentData);
  }

  // Compléter la commande avec notes (version corrigée)
  completeOrder(orderId: string, completionNotes: string): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/orders/${orderId}/complete`, { completionNotes });
  }

  getOrderWithDoctorReply(orderId: string) {
    return this.http.get(`${this.apiUrl}/orders/${orderId}`);
  }

  // Assigner un docteur à un rendez-vous existant
  assignDoctorToAppointment(appointmentId: string, doctorId: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/appointments/${appointmentId}/assign-doctor`, { doctorId });
  }

  // Dans order.service.ts
  sendAppointmentEmail(orderId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/orders/${orderId}/send-appointment-email`, {});
  }
  // Méthode pour envoyer les remarques du docteur par email
  sendDoctorRemarksEmail(orderId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders/${orderId}/send-doctor-remarks-email`, {});
  }
  updatePrice(orderId: string, price: number): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/orders/${orderId}/update-price`, { price });
  }

  // Ajouter cette méthode dans OrderService
  updateOrderNotes(orderId: string, notes: any): Observable<Order> {
    return this.http.put<Order>(`${this.apiUrl}/orders/${orderId}/update-notes`, { notes });
  }

  // Dans order.service.ts
  sendArrivalDateUpdateEmail(emailData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/orders/send-arrival-date-update`, emailData);
  }

  // Envoyer la facture par email
  sendInvoiceEmail(orderId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment/send-invoice/${orderId}`, {});
  }

  // Créer une session de paiement Stripe
  createPaymentSession(orderId: string, returnUrl: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/payment/create-payment-session/${orderId}`, {
      returnUrl
    });
  }

  // Vérifier le statut du paiement
  getPaymentStatus(orderId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/payment/payment-status/${orderId}`);
  }

}
