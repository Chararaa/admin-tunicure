import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';


export interface Appointment {
  _id?: string;
  order: any;
  doctor: any;
  client: string;
  dateTime: Date;
  duration: number;
  type: 'consultation' | 'surgery';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  title?: string;
  description?: string;
  createdAt: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
  allDay?: boolean;
  extendedProps: {
    doctorName: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    category: string;
    status: string;
    notes: string;
    appointmentId: string;
    type: string;
    orderId?: string;
    isUpcoming?: boolean;
  };
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  classNames?: string[];
}


export interface StatusUpdateData {
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Récupérer tous les rendez-vous
  getAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/appointments`);
  }

  // Récupérer un rendez-vous par ID
  getAppointmentById(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/appointments/${id}`);
  }

  // Récupérer les événements du calendrier
  getCalendarEvents(params?: any): Observable<CalendarEvent[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    return this.http.get<CalendarEvent[]>(`${this.apiUrl}/appointments/calendar`, { params: httpParams });
  }

  // Créer un nouveau rendez-vous
  createAppointment(appointmentData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/appointments`, appointmentData);
  }

  // Mettre à jour un rendez-vous
  updateAppointment(id: string, appointment: Appointment): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.apiUrl}/appointments/${id}`, appointment);
  }

  // Mettre à jour le statut d'un rendez-vous
  updateAppointmentStatus(id: string, statusData: StatusUpdateData): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/appointments/${id}/status`, statusData);
  }

  // Actions spécifiques pour les statuts
  confirmAppointment(id: string, notes?: string): Observable<any> {
    return this.updateAppointmentStatus(id, { status: 'confirmed', notes });
  }

  completeAppointment(id: string, notes?: string): Observable<any> {
    return this.updateAppointmentStatus(id, { status: 'completed', notes });
  }

  cancelAppointment(id: string, notes?: string): Observable<any> {
    return this.updateAppointmentStatus(id, { status: 'cancelled', notes });
  }

  // Supprimer un rendez-vous
  deleteAppointment(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/appointments/${id}`);
  }

  // Créer un rendez-vous à partir d'une commande
  createAppointmentFromOrder(orderData: any): Observable<Appointment> {
    const appointmentData = {
      order: orderData._id,
      doctor: orderData.assignedToDoctor,
      client: orderData.clientInfo.name,
      dateTime: orderData.appointmentDate,
      duration: 60,
      type: 'consultation',
      status: 'scheduled',
      title: `RDV - ${orderData.category}`,
      description: `Rendez-vous pour ${orderData.clientInfo.name} - ${orderData.notes?.appointmentNotes || ''}`
    };
    return this.http.post<Appointment>(`${this.apiUrl}/appointments`, appointmentData);
  }
  assignDoctorToAppointment(appointmentId: string, doctorId: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/appointments/${appointmentId}/assign-doctor`, { doctorId });
  }

  confirmOperation(appointmentId: string, confirmedDateTime: Date, operationNotes?: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${appointmentId}/confirm-operation`, {
      confirmedDateTime,
      operationNotes
    });
  }

  // Dans appointment.service.ts, ajoutez :
  checkAppointmentIntegrity(appointmentId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/appointments/${appointmentId}/check-integrity`);
  }


  // Email pour l'annulation
  sendCancellationEmails(appointmentId: string, cancellationData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/appointments/${appointmentId}/send-cancellation-emails`, cancellationData);
  }

  // Email pour la modification de date
  sendRescheduleEmails(appointmentId: string, rescheduleData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/appointments/${appointmentId}/send-reschedule-emails`, rescheduleData);
  }


}
