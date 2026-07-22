import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarEvent, AppointmentService, StatusUpdateData } from '../services/appointment.service';
import { Doctor, DoctorService } from '../services/doctor.service';
import { OrderService } from '../services/order.service';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventApi, DateSelectArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
interface ArrivalEmailData {
    orderId: string;
    clientEmail?: string;
    clientName: string;
    procedure: string;
    oldArrivalDate: any;
    newArrivalDate: any;
    updateReason: string;
}

interface RescheduleEmailData {
    appointmentId: string;
    oldDateTime: any;
    newDateTime: any;
    clientEmail?: string;
    clientName: string;
    doctorEmail?: string;
    doctorName: string;
    procedure: string;
    duration?: number;
    notes?: string;
}
@Component({
    selector: 'app-calendrier',
    standalone: true,
    imports: [CommonModule, FormsModule, FullCalendarModule],
    templateUrl: './calendrier.component.html',
    styleUrls: ['./calendrier.component.css']
})
export class CalendrierComponent implements OnInit {
    @ViewChild('calendar') calendarComponent: any;

    calendarEvents: CalendarEvent[] = [];
    arrivalDates: any[] = [];
    doctors: Doctor[] = [];
    selectedEvent: CalendarEvent | null = null;
    selectedAppointment: any = null;
    selectedArrivalDate: any = null;
    selectedDoctor: string = 'all';
    selectedEventType: string = 'all';
    isLoading: boolean = false;
    selectedOrderId: string | null = null;
    statusUpdateNotes: string = '';


    editData: any = {};
    isSaving: boolean = false;
    // Configuration du calendrier
    calendarOptions: CalendarOptions = {
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
        events: [],
        locale: 'fr',
        firstDay: 1,
        weekends: true,
        editable: false,
        selectable: true,
        selectMirror: true,
        dayMaxEvents: true,
        allDaySlot: true,
        slotMinTime: '08:00:00',
        slotMaxTime: '20:00:00',
        slotDuration: '00:30:00',
        height: 'auto',
        nowIndicator: true,
        businessHours: {
            daysOfWeek: [1, 2, 3, 4, 5, 6],
            startTime: '08:00',
            endTime: '20:00',
        },
        eventClick: this.handleEventClick.bind(this),
        select: this.handleDateSelect.bind(this),
        eventsSet: this.handleEvents.bind(this)
    };

    constructor(
        private appointmentService: AppointmentService,
        private doctorService: DoctorService,
        private orderService: OrderService
    ) { }


    checkAndAutoConfirmAppointments() {
        const now = new Date();

        this.calendarEvents.forEach(event => {
            if (event.extendedProps.type !== 'arrival' &&
                event.extendedProps.status === 'scheduled') {

                const appointmentTime = new Date(event.start);
                const timeDiff = now.getTime() - appointmentTime.getTime();
                const secondsDiff = timeDiff / 1000; // Convertir en secondes

                // Confirmer automatiquement après 10 secondes
                if (secondsDiff >= 10 && secondsDiff < 30) { // Garder une marge
                    this.autoConfirmAppointment(event.extendedProps.appointmentId);
                }
            }
        });
    }

    // Méthode pour vérifier et terminer automatiquement les RDV passés
    checkAndAutoCompleteAppointments() {
        const now = new Date();

        this.calendarEvents.forEach(event => {
            if (event.extendedProps.type !== 'arrival' &&
                (event.extendedProps.status === 'scheduled' || event.extendedProps.status === 'confirmed')) {

                const appointmentEndTime = new Date(event.end);

                // Terminer automatiquement si la date de fin est passée
                if (now > appointmentEndTime) {
                    this.autoCompleteAppointment(event.extendedProps.appointmentId);
                }
            }
        });
    }

    // Confirmation automatique
    autoConfirmAppointment(appointmentId: string) {
        this.appointmentService.confirmAppointment(appointmentId, 'Confirmé automatiquement après 5 minutes')
            .subscribe({
                next: (response) => {
                    console.log('✅ RDV confirmé automatiquement:', appointmentId);
                    this.loadCalendarEvents(); // Recharger les événements
                },
                error: (error) => {
                    console.error('❌ Erreur confirmation automatique:', error);
                }
            });
    }

    // Terminaison automatique
    autoCompleteAppointment(appointmentId: string) {
        this.appointmentService.completeAppointment(appointmentId, 'Terminé automatiquement après la date du RDV')
            .subscribe({
                next: (response) => {
                    console.log('✅ RDV terminé automatiquement:', appointmentId);
                    this.loadCalendarEvents(); // Recharger les événements
                },
                error: (error) => {
                    console.error('❌ Erreur terminaison automatique:', error);
                }
            });
    }


    ngOnInit() {
        this.selectedOrderId = localStorage.getItem('selectedOrderForAppointment');
        this.loadCalendarEvents();
        this.loadDoctors();
        this.loadArrivalDates();
        this.checkUpcomingArrivals();
        this.startAutoChecks();

    }

    // Charger les dates d'arrivée
    loadArrivalDates() {
        this.orderService.getOrders().subscribe({
            next: (response: any) => {
                this.arrivalDates = response.orders
                    .filter((order: any) => order.arrivalDate && order.status !== 'completed')
                    .map((order: any) => ({
                        id: `arrival-${order._id}`,
                        title: `🛬 Arrivée: ${order.clientInfo.name}`,
                        start: order.arrivalDate,
                        end: order.arrivalDate,
                        allDay: true,
                        extendedProps: {
                            type: 'arrival',
                            orderId: order._id,
                            clientName: order.clientInfo.name,
                            clientEmail: order.clientInfo.email,
                            clientPhone: order.clientInfo.phone,
                            category: order.category,
                            status: order.status,
                            isUpcoming: this.isUpcomingArrival(order.arrivalDate)
                        },
                        backgroundColor: this.getArrivalEventColor(order.arrivalDate),
                        borderColor: this.getArrivalEventColor(order.arrivalDate),
                        textColor: '#ffffff'
                    }));

                this.updateCalendarEvents();
            },
            error: (error) => {
                console.error('Error loading arrival dates:', error);
            }
        });
    }

    // Vérifier les arrivées dans 3 jours
    checkUpcomingArrivals() {
        this.orderService.getOrders().subscribe({
            next: (response: any) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const upcomingArrivals = response.orders.filter((order: any) => {
                    if (!order.arrivalDate || order.status === 'completed') return false;

                    const arrivalDate = new Date(order.arrivalDate);
                    arrivalDate.setHours(0, 0, 0, 0);
                    const timeDiff = arrivalDate.getTime() - today.getTime();
                    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

                    return daysDiff <= 3 && daysDiff >= 0;
                });

                // Afficher les alertes
                upcomingArrivals.forEach((order: any) => {
                    const arrivalDate = new Date(order.arrivalDate);
                    const daysUntilArrival = Math.ceil((arrivalDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

                    this.showArrivalAlert(order, daysUntilArrival);
                });
            },
            error: (error) => {
                console.error('Error checking upcoming arrivals:', error);
            }
        });
    }

    // Afficher l'alerte
    showArrivalAlert(order: any, daysUntilArrival: number) {
        const message = `🚨 ALERTE: Le client ${order.clientInfo.name} arrive dans ${daysUntilArrival} jour(s) (${new Date(order.arrivalDate).toLocaleDateString('fr-FR')})`;

        // Vous pouvez remplacer par un système de notification plus sophistiqué
        console.warn(message);

        // Notification simple
        if (daysUntilArrival <= 3) {
            this.showNotification(message, 'warning');
        }
    }

    // Notification
    showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info') {
        // Utilisez un service de notification (toastr) ou une alerte simple
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type];

        // Créer une alerte temporaire
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alertClass} alert-dismissible fade show`;
        alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

        const container = document.querySelector('.container-fluid') || document.body;
        container.insertBefore(alertDiv, container.firstChild);

        // Supprimer après 5 secondes
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

    // Couleur pour les dates d'arrivée
    getArrivalEventColor(arrivalDate: string): string {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const arrival = new Date(arrivalDate);
        arrival.setHours(0, 0, 0, 0);
        const timeDiff = arrival.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysDiff < 0) return '#6c757d'; // Passé - gris
        if (daysDiff <= 3) return '#dc3545'; // Dans 3 jours - rouge
        if (daysDiff <= 7) return '#ffc107'; // Dans 1 semaine - orange
        return '#198754'; // Futur - vert
    }

    // Vérifier si c'est une arrivée proche
    isUpcomingArrival(arrivalDate: string): boolean {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const arrival = new Date(arrivalDate);
        arrival.setHours(0, 0, 0, 0);
        const timeDiff = arrival.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff <= 3 && daysDiff >= 0;
    }

    loadCalendarEvents() {
        this.isLoading = true;
        this.appointmentService.getCalendarEvents().subscribe({
            next: (events) => {
                // Filtrer les événements invalides
                this.calendarEvents = events.filter(event =>
                    event && event.start && event.extendedProps
                );
                this.updateCalendarEvents();
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading calendar events:', error);
                this.calendarEvents = [];
                this.updateCalendarEvents();
                this.isLoading = false;
                this.showNotification('Erreur lors du chargement des rendez-vous', 'error');
            }
        });
    }

    loadDoctors() {
        this.doctorService.getDoctors().subscribe({
            next: (doctors) => {
                this.doctors = doctors.filter(doctor =>
                    doctor && doctor.personalInfo && doctor.personalInfo.name
                );
            },
            error: (error) => {
                console.error('Error loading doctors:', error);
                this.doctors = [];
            }
        });
    }
    updateCalendarEvents() {
        let eventsToShow = [...this.calendarEvents, ...this.arrivalDates];
        eventsToShow = eventsToShow.map(event => {
            // Si c'est un rendez-vous et qu'il n'a pas de type, ajouter 'appointment'
            if (event.extendedProps.appointmentId && !event.extendedProps.type) {
                return {
                    ...event,
                    extendedProps: {
                        ...event.extendedProps,
                        type: 'appointment'
                    }
                };
            }
            return event;
        });
        // Filtre par docteur
        if (this.selectedDoctor !== 'all') {
            eventsToShow = eventsToShow.filter(event =>
                event.extendedProps.doctorName?.includes(this.selectedDoctor)
            );
        }

        // Filtre par type d'événement
        if (this.selectedEventType !== 'all') {
            eventsToShow = eventsToShow.filter(event =>
                event.extendedProps.type === this.selectedEventType
            );
        }

        const fullCalendarEvents = eventsToShow.map(event => ({
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            allDay: event.allDay || false,
            extendedProps: event.extendedProps,
            backgroundColor: event.backgroundColor || this.getEventColor(event.extendedProps.status),
            borderColor: event.borderColor || this.getEventColor(event.extendedProps.status),
            textColor: '#ffffff',
            classNames: ['calendar-event']
        }));

        this.calendarOptions.events = fullCalendarEvents;
    }

    getEventColor(status: string): string {
        const colors: { [key: string]: string } = {
            'scheduled': '#0d6efd',
            'confirmed': '#198754',
            'completed': '#6c757d',
            'cancelled': '#dc3545'
        };
        return colors[status] || '#6c757d';
    }

    async handleEventClick(clickInfo: EventClickArg) {
        const event = clickInfo.event;

        // Vérifier si c'est une date d'arrivée
        if (event.id.startsWith('arrival-')) {
            this.handleArrivalClick(event);
            return;
        }

        // Sinon, traitement normal des rendez-vous
        const originalEvent = this.calendarEvents.find(e => e.id === event.id);

        if (originalEvent) {
            this.selectedEvent = originalEvent;

            try {
                this.selectedAppointment = await this.appointmentService
                    .getAppointmentById(originalEvent.extendedProps.appointmentId)
                    .toPromise();
                this.showAppointmentModal();
            } catch (error) {
                console.error('Erreur chargement détails:', error);
                this.selectedAppointment = null;
            }
        }
    }

    prepareEditArrivalModal(arrivalEvent: any) {
        this.orderService.getOrder(arrivalEvent.extendedProps.orderId).subscribe({
            next: (order) => {
                let arrivalDate = '';
                if (order.arrivalDate) {
                    const arrival = new Date(order.arrivalDate);
                    arrivalDate = this.formatDateForDateInput(arrival);
                }

                this.editData = {
                    orderId: order._id,
                    arrivalDate: arrivalDate,
                    clientName: order.clientInfo.name,
                    clientEmail: order.clientInfo.email,
                    category: order.generalCategoryName || order.categoryName || order.category,
                    editType: 'arrival',
                    originalEvent: arrivalEvent
                };

                // Ouvrir le modal d'édition d'arrivée
                this.showEditArrivalModal();
            },
            error: (error) => {
                console.error('Erreur chargement commande:', error);
            }
        });
    }


    closeAllModalsExcept(excludeId: string) {
        const allModals = document.querySelectorAll('.modal');
        allModals.forEach(modalElement => {
            if (modalElement.id && modalElement.id !== excludeId) {
                const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
        });
    }



    saveArrivalDateOnly() {
        if (!this.editData.orderId || !this.editData.arrivalDate) {
            this.showNotification('La date d\'arrivée est requise', 'error');
            return;
        }

        this.isSaving = true;
        console.log('🛬 Sauvegarde date d\'arrivée seulement');

        // Récupérer l'ancienne date d'arrivée
        const oldArrivalDate = this.editData.originalEvent?.start ||
            this.editData.originalAppointment?.order?.arrivalDate ||
            this.selectedAppointment?.order?.arrivalDate;

        console.log('📋 Données pour modification arrivée:', {
            orderId: this.editData.orderId,
            oldArrivalDate: oldArrivalDate,
            newArrivalDate: this.editData.arrivalDate
        });

        // 1. Mettre à jour la date d'arrivée dans la commande
        this.orderService.phoneConfirm(
            this.editData.orderId,
            'Date d\'arrivée modifiée via calendrier',
            this.editData.arrivalDate
        ).subscribe({
            next: (updatedOrder) => {
                console.log('✅ Date d\'arrivée mise à jour dans la base');

                // 2. Envoyer l'email de modification d'arrivée au client
                this.sendArrivalDateUpdateEmail(oldArrivalDate, this.editData.arrivalDate);
            },
            error: (error) => {
                console.error('❌ Erreur mise à jour date d\'arrivée:', error);
                this.isSaving = false;
                this.showNotification('Erreur lors de la modification de la date d\'arrivée', 'error');
            }
        });
    }



    finishArrivalDateSave() {
        console.log('✅ Sauvegarde date d\'arrivée terminée');
        this.isSaving = false;
        this.showNotification('Date d\'arrivée modifiée avec succès. Email envoyé au client.', 'success');
        this.closeEditArrivalModal(); // Fermer le modal d'arrivée
        this.loadArrivalDates();
        this.loadCalendarEvents();
    }




    // Remplacer les deux méthodes par :
    showAppointmentModal() {
        setTimeout(() => {
            const modalElement = document.getElementById('eventDetailsModal');
            if (modalElement) {
                const modal = new (window as any).bootstrap.Modal(modalElement);
                modal.show();
            }
        }, 100);
    }

    showArrivalDateModal() {
        setTimeout(() => {
            const modalElement = document.getElementById('arrivalDateModal');
            if (modalElement) {
                const modal = new (window as any).bootstrap.Modal(modalElement);
                modal.show();
            }
        }, 100);
    }

    handleDateSelect(selectInfo: DateSelectArg) {
        console.log('Date sélectionnée:', selectInfo.start, selectInfo.end);
    }

    handleEvents(events: EventApi[]) {
        // Callback lorsque les événements sont chargés
    }

    onFilterChange() {
        this.updateCalendarEvents();
    }

    onEventTypeChange() {
        this.updateCalendarEvents();
    }

    // Actions sur les rendez-vous
    confirmAppointment() {
        if (!this.selectedAppointment) return;

        this.appointmentService.confirmAppointment(
            this.selectedAppointment._id,
            this.statusUpdateNotes
        ).subscribe({
            next: (response) => {
                this.showNotification('Rendez-vous confirmé avec succès', 'success');
                this.closeModal();
                this.loadCalendarEvents();
                this.statusUpdateNotes = '';
            },
            error: (error) => {
                console.error('Erreur confirmation:', error);
                this.showNotification('Erreur lors de la confirmation', 'error');
            }
        });
    }

    completeAppointment() {
        if (!this.selectedAppointment) return;

        this.appointmentService.completeAppointment(
            this.selectedAppointment._id,
            this.statusUpdateNotes
        ).subscribe({
            next: (response) => {
                this.showNotification('Rendez-vous marqué comme terminé', 'success');
                this.closeModal();
                this.loadCalendarEvents();
                this.statusUpdateNotes = '';
            },
            error: (error) => {
                console.error('Erreur completion:', error);
                this.showNotification('Erreur lors de la complétion', 'error');
            }
        });
    }

    cancelAppointment() {
        if (!this.selectedAppointment) return;

        if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
            return;
        }

        // Récupération correcte des données du docteur
        let doctorName = 'le docteur';
        let doctorEmail = '';

        if (this.selectedAppointment.doctor) {
            // Vérification en profondeur
            if (this.selectedAppointment.doctor.personalInfo) {
                doctorName = this.selectedAppointment.doctor.personalInfo.name || 'le docteur';
                doctorEmail = this.selectedAppointment.doctor.personalInfo.email || '';
            } else if (this.selectedAppointment.doctor.name) {
                // Si le format est différent
                doctorName = this.selectedAppointment.doctor.name;
            } else if (this.selectedAppointment.doctor.doctorName) {
                doctorName = this.selectedAppointment.doctor.doctorName;
            }
        }

        // CORRECTION: Récupération fiable de la procédure
        const procedure = this.getProcedureName(this.selectedAppointment.order);
        const doctorInfo = this.getDoctorInfo(this.selectedAppointment);

        // Données pour l'email
        const emailData = {
            appointmentId: this.selectedAppointment._id,
            oldDateTime: this.selectedEvent?.start,
            clientEmail: this.selectedAppointment.order?.clientInfo?.email,
            clientName: this.selectedAppointment.order?.clientInfo?.name,
            doctorEmail: doctorEmail,
            doctorName: doctorName,
            procedure: procedure,
            cancellationReason: this.statusUpdateNotes || 'Annulation administrative',
            cancelledBy: 'Administrateur'
        };

        console.log('📧 Données pour annulation:', emailData);

        // 1. Envoyer les emails UNIQUEMENT VIA LE BACKEND
        this.appointmentService.sendCancellationEmails(this.selectedAppointment._id, emailData)
            .subscribe({
                next: (emailResponse) => {
                    console.log('📧 Emails d\'annulation envoyés:', emailResponse);

                    // 2. Mettre à jour le statut du RDV
                    this.appointmentService.cancelAppointment(
                        this.selectedAppointment._id,
                        this.statusUpdateNotes
                    ).subscribe({
                        next: (response) => {
                            this.showNotification('Rendez-vous annulé avec succès. Emails envoyés.', 'success');
                            this.closeModal();
                            this.loadCalendarEvents();
                            this.statusUpdateNotes = '';
                        },
                        error: (error) => {
                            console.error('❌ Erreur annulation:', error);
                            this.showNotification('Erreur lors de l\'annulation', 'error');
                        }
                    });
                },
                error: (emailError) => {
                    console.error('❌ Erreur envoi emails:', emailError);
                    // Annuler quand même le RDV même si l'email échoue
                    this.appointmentService.cancelAppointment(
                        this.selectedAppointment._id,
                        this.statusUpdateNotes
                    ).subscribe({
                        next: (response) => {
                            this.showNotification('Rendez-vous annulé (email non envoyé)', 'warning');
                            this.closeModal();
                            this.loadCalendarEvents();
                            this.statusUpdateNotes = '';
                        },
                        error: (error) => {
                            console.error('❌ Erreur annulation:', error);
                            this.showNotification('Erreur lors de l\'annulation', 'error');
                        }
                    });
                }
            });
    }

    deleteAppointment() {
        if (!this.selectedAppointment) return;

        if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce rendez-vous ?')) {
            return;
        }

        this.appointmentService.deleteAppointment(this.selectedAppointment._id).subscribe({
            next: (response) => {
                this.showNotification('Rendez-vous supprimé avec succès', 'success');
                this.closeModal();
                this.loadCalendarEvents();
            },
            error: (error) => {
                console.error('Erreur suppression:', error);
                this.showNotification('Erreur lors de la suppression', 'error');
            }
        });
    }

    closeModal() {
        // Fermer le modal de détails seulement
        const detailsModal = document.getElementById('eventDetailsModal');
        if (detailsModal) {
            const modal = (window as any).bootstrap.Modal.getInstance(detailsModal);
            if (modal) {
                modal.hide();
            }
        }

        // Fermer le modal d'arrivée seulement
        const arrivalModal = document.getElementById('arrivalDateModal');
        if (arrivalModal) {
            const modal = (window as any).bootstrap.Modal.getInstance(arrivalModal);
            if (modal) {
                modal.hide();
            }
        }

        // Réinitialiser
        this.selectedEvent = null;
        this.selectedAppointment = null;
        this.selectedArrivalDate = null;
        this.statusUpdateNotes = '';
    }


    // Obtenir le nombre de jours avant arrivée
    getDaysUntilArrival(arrivalDate: string): number {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const arrival = new Date(arrivalDate);
        arrival.setHours(0, 0, 0, 0);
        const timeDiff = arrival.getTime() - today.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    canConfirm(): boolean {
        return false; // Confirmation automatique après 5 minutes
    }


    canComplete(): boolean {
        return false; // Terminaison automatique après la date
    }


    canEdit(): boolean {
        return this.selectedAppointment?.status !== 'completed' &&
            this.selectedAppointment?.status !== 'cancelled';
    }

    editAppointment() {
        console.log('editAppointment appelé, selectedAppointment:', this.selectedAppointment);

        if (!this.selectedAppointment || !this.selectedEvent) {
            console.error('❌ Données de rendez-vous manquantes');
            this.showNotification('Impossible de modifier: données de rendez-vous invalides', 'error');
            return;
        }

        // Copiez les données
        const appointmentData = { ...this.selectedAppointment };
        const eventData = { ...this.selectedEvent };

        // Fermer le modal actuel avec callback
        const modalElement = document.getElementById('eventDetailsModal');
        if (modalElement) {
            const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();

                modalElement.addEventListener('hidden.bs.modal', () => {
                    // Utiliser les données copiées
                    this.selectedAppointment = appointmentData;
                    this.selectedEvent = eventData;
                    this.prepareEditModal();
                }, { once: true });
            }
        }
    }



    prepareEditModal() {
        if (this.selectedAppointment && this.selectedEvent) {
            const appointmentDate = new Date(this.selectedEvent.start);
            const formattedAppointmentDate = this.formatDateForInput(appointmentDate);

            this.editData = {
                appointmentId: this.selectedAppointment._id,
                orderId: this.selectedAppointment.order?._id || this.selectedAppointment.order,
                appointmentDateTime: formattedAppointmentDate,
                clientName: this.selectedEvent.extendedProps.clientName,
                clientEmail: this.selectedAppointment.order?.clientInfo?.email,
                category: this.selectedEvent.extendedProps.category,
                editType: 'appointment',
                originalAppointment: { ...this.selectedAppointment },
                originalEvent: this.selectedEvent
            };

            // Ouvrir le modal d'édition de RDV
            this.showEditAppointmentModal();
        }
    }



    // Format pour datetime-local (RDV avec heure)
    formatDateForInput(date: Date): string {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = ('0' + (d.getMonth() + 1)).slice(-2);
        const day = ('0' + d.getDate()).slice(-2);
        const hours = ('0' + d.getHours()).slice(-2);
        const minutes = ('0' + d.getMinutes()).slice(-2);

        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // Format pour date seulement (arrivée)
    formatDateForDateInput(date: Date): string {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = ('0' + (d.getMonth() + 1)).slice(-2);
        const day = ('0' + d.getDate()).slice(-2);

        return `${year}-${month}-${day}`;
    }

    showEditModal() {
        setTimeout(() => {
            const modalElement = document.getElementById('editAppointmentModal');
            if (modalElement) {
                const modal = new (window as any).bootstrap.Modal(modalElement);
                modal.show();
            }
        }, 100);
    }

    saveEditedAppointment() {
        // Si c'est une modification d'arrivée seule, rediriger
        if (this.editData.editType === 'arrival') {
            this.saveArrivalDateOnly();
            return;
        }

        // Validation pour les rendez-vous
        if (!this.editData.appointmentId || !this.editData.appointmentDateTime) {
            this.showNotification('La date du RDV est requise', 'error');
            return;
        }

        this.isSaving = true;
        console.log('📅 Sauvegarde RDV (avec arrivée optionnelle)');

        // Données pour la sauvegarde
        const oldDateTime = this.editData.originalAppointment?.dateTime || this.selectedEvent?.start;
        const newDateTime = this.editData.appointmentDateTime;

        // Vérifier si la date d'arrivée est modifiée
        const isArrivalDateModified = this.isArrivalDateChanged(
            this.editData.arrivalDate,
            this.editData.originalAppointment?.order?.arrivalDate
        );

        // 1. Mettre à jour la date du RDV
        const updateData = {
            dateTime: new Date(this.editData.appointmentDateTime).toISOString(),
            description: this.editData.notes || ''
        };

        this.appointmentService.updateAppointment(this.editData.appointmentId, updateData as any)
            .subscribe({
                next: (updatedAppointment) => {
                    console.log('✅ Date RDV mise à jour:', updatedAppointment);

                    // 2. Gérer la date d'arrivée si modifiée
                    if (isArrivalDateModified && this.editData.orderId) {
                        this.updateArrivalDateAndSendEmails(oldDateTime, newDateTime);
                    } else {
                        // 3. Si seulement le RDV est modifié
                        this.sendRescheduleEmailsAndFinish(oldDateTime, newDateTime);
                    }
                },
                error: (error) => {
                    console.error('❌ Erreur modification date RDV:', error);
                    this.isSaving = false;
                    this.showNotification('Erreur lors de la modification du RDV', 'error');
                }
            });
    }


    updateArrivalDateAndSendEmails(oldRDVDateTime: any, newRDVDateTime: any) {
        // 1. Mettre à jour la date d'arrivée
        this.orderService.phoneConfirm(
            this.editData.orderId,
            'Date d\'arrivée modifiée via calendrier',
            this.editData.arrivalDate
        ).subscribe({
            next: (updatedOrder) => {
                console.log('✅ Date d\'arrivée mise à jour');

                const oldArrivalDate = this.editData.originalAppointment?.order?.arrivalDate;

                // 2. Envoyer l'email de modification d'arrivée
                if (oldArrivalDate) {
                    this.sendArrivalDateUpdateEmail(oldArrivalDate, this.editData.arrivalDate);
                }

                // 3. Envoyer l'email de reprogrammation du RDV
                this.sendRescheduleEmailsAndFinish(oldRDVDateTime, newRDVDateTime);
            },
            error: (error) => {
                console.error('⚠️ Erreur mise à jour date d\'arrivée:', error);
                // Si l'arrivée échoue, envoyer quand même l'email de reprogrammation
                this.sendRescheduleEmailsAndFinish(oldRDVDateTime, newRDVDateTime);
            }
        });
    }


    sendRescheduleEmailsAndFinish(oldDateTime: any, newDateTime: any) {
        console.log('📧 Préparation emails de reprogrammation');

        // 1. Récupérer les données manquantes avant d'envoyer les emails
        this.loadMissingAppointmentData().then(() => {
            // 2. Préparer les données d'email
            const emailData = this.prepareRescheduleEmailData(oldDateTime, newDateTime);

            console.log('📧 Données pour email reprogrammation:', emailData);

            // Vérifier que l'email client est disponible
            if (!emailData.clientEmail) {
                console.warn('⚠️ Email client manquant, chargement depuis la base...');
                this.loadClientEmailFromOrder(emailData).then(() => {
                    this.sendRescheduleEmailRequest(emailData);
                });
            } else {
                this.sendRescheduleEmailRequest(emailData);
            }
        }).catch(error => {
            console.error('❌ Erreur chargement données:', error);
            this.finishSave();
        });
    }

    async loadClientEmailFromOrder(emailData: RescheduleEmailData): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.editData.orderId && !emailData.clientEmail) {
                this.orderService.getOrder(this.editData.orderId)
                    .subscribe({
                        next: (order) => {
                            if (order?.clientInfo?.email) {
                                emailData.clientEmail = order.clientInfo.email;
                                emailData.clientName = order.clientInfo.name || emailData.clientName;
                                console.log('✅ Email chargé depuis order:', emailData.clientEmail);
                            }
                            resolve();
                        },
                        error: (error) => {
                            console.error('❌ Erreur chargement order:', error);
                            resolve();
                        }
                    });
            } else {
                resolve();
            }
        });
    }



    prepareRescheduleEmailData(oldDateTime: any, newDateTime: any): RescheduleEmailData {
        // Récupérer les données de base
        const clientEmail = this.selectedAppointment?.order?.clientInfo?.email ||
            this.editData.clientEmail;


        const clientName = this.selectedAppointment?.order?.clientInfo?.name ||
            this.editData.clientName ||
            'Client';

        const procedure = this.getProcedureName(this.selectedAppointment?.order) ||
            this.editData.category ||
            'Procédure';

        const doctorInfo = this.getDoctorInfo(this.selectedAppointment);

        // Retourner l'objet avec le type correct
        return {
            appointmentId: this.editData.appointmentId,
            oldDateTime: oldDateTime,
            newDateTime: newDateTime,
            clientEmail: clientEmail,
            clientName: clientName,
            doctorEmail: doctorInfo.email,
            doctorName: doctorInfo.name,
            procedure: procedure,
            duration: this.selectedAppointment?.duration || 60,
            notes: 'Modification depuis le calendrier'
        };
    }



    async loadMissingAppointmentData(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Si nous avons déjà les données du rendez-vous
            if (this.selectedAppointment && this.selectedAppointment.order?.clientInfo?.email) {
                resolve();
                return;
            }

            // Sinon, charger depuis l'ID du rendez-vous
            if (this.editData.appointmentId) {
                this.appointmentService.getAppointmentById(this.editData.appointmentId)
                    .subscribe({
                        next: (appointment) => {
                            this.selectedAppointment = appointment;
                            console.log('✅ Rendez-vous chargé:', appointment);
                            resolve();
                        },
                        error: (error) => {
                            console.error('❌ Erreur chargement rendez-vous:', error);
                            // Essayer de charger depuis l'order
                            this.loadFromOrder();
                            resolve(); // On continue quand même
                        }
                    });
            } else {
                // Charger depuis l'order
                this.loadFromOrder();
                resolve();
            }
        });
    }
    loadFromOrder() {
        if (this.editData.orderId) {
            this.orderService.getOrder(this.editData.orderId)
                .subscribe({
                    next: (order) => {
                        // Créer un objet appointment minimal si nécessaire
                        if (!this.selectedAppointment) {
                            this.selectedAppointment = {
                                order: order,
                                duration: 60 // Valeur par défaut
                            };
                        }
                        console.log('✅ Order chargé:', order);
                    },
                    error: (error) => {
                        console.error('❌ Erreur chargement order:', error);
                    }
                });
        }
    }


    sendRescheduleEmailsAndNotify(oldRDVDateTime: any, newRDVDateTime: any) {
        // CORRECTION : Ne pas inclure oldArrivalDate dans les paramètres par défaut

        // Utiliser les données de editData si selectedAppointment est null
        if (!this.selectedAppointment && !this.editData.appointmentId) {
            console.error('❌ Aucun rendez-vous sélectionné ou données manquantes');
            this.isSaving = false;
            return;
        }

        // Récupérer les données depuis editData si nécessaire
        const appointmentId = this.editData.appointmentId;
        const orderId = this.editData.orderId;
        const clientName = this.editData.clientName || 'Client';
        const category = this.editData.category || 'Procédure';

        console.log('📧 Préparation email de reprogrammation:', {
            appointmentId,
            orderId,
            clientName,
            category
        });

        // Charger les données du rendez-vous si nécessaire
        if (!this.selectedAppointment && appointmentId) {
            this.appointmentService.getAppointmentById(appointmentId)
                .subscribe({
                    next: (appointment) => {
                        this.selectedAppointment = appointment;
                        this.sendEmailWithData(oldRDVDateTime, newRDVDateTime);
                    },
                    error: (error) => {
                        console.error('❌ Erreur chargement rendez-vous:', error);
                        // Utiliser les données minimales
                        this.sendEmailWithMinimalData(oldRDVDateTime, newRDVDateTime);
                    }
                });
        } else {
            this.sendEmailWithData(oldRDVDateTime, newRDVDateTime);
        }
    }
    sendEmailWithData(oldRDVDateTime: any, newRDVDateTime: any) {
        if (!this.selectedAppointment) {
            console.error('❌ Données de rendez-vous manquantes');
            this.sendEmailWithMinimalData(oldRDVDateTime, newRDVDateTime);
            return;
        }

        const procedure = this.selectedAppointment.order?.generalCategoryName ||
            this.selectedAppointment.order?.categoryName ||
            this.selectedAppointment.order?.category ||
            this.editData.category ||
            'Procédure';

        const emailData = {
            appointmentId: this.editData.appointmentId,
            oldDateTime: oldRDVDateTime,
            newDateTime: newRDVDateTime,
            clientEmail: this.selectedAppointment.order?.clientInfo?.email,
            clientName: this.selectedAppointment.order?.clientInfo?.name || this.editData.clientName,
            doctorEmail: this.selectedAppointment.doctor?.personalInfo?.email,
            doctorName: this.selectedAppointment.doctor?.personalInfo?.name || 'le docteur',
            procedure: procedure,
            duration: this.selectedAppointment?.duration || 60,
            notes: 'Modification depuis le calendrier'
        };

        console.log('📧 Données email de reprogrammation:', emailData);

        // CORRECTION : Ne pas passer oldArrivalDate
        this.sendRescheduleEmailRequest(emailData);
    }

    sendEmailWithMinimalData(oldRDVDateTime: any, newRDVDateTime: any) {
        const emailData = {
            appointmentId: this.editData.appointmentId,
            oldDateTime: oldRDVDateTime,
            newDateTime: newRDVDateTime,
            clientName: this.editData.clientName || 'Client',
            procedure: this.editData.category || 'Procédure',
            doctorName: 'le docteur',
            duration: 60,
            notes: 'Modification depuis le calendrier'
        };

        console.log('📧 Données email minimales de reprogrammation:', emailData);

        // Charger les données manquantes
        this.loadMissingEmailData(emailData);
    }


    sendRescheduleEmailRequest(emailData: RescheduleEmailData) {
        this.appointmentService.sendRescheduleEmails(this.editData.appointmentId, emailData)
            .subscribe({
                next: (response) => {
                    console.log('📧 Emails de reprogrammation envoyés:', response);
                    this.finishSave();
                },
                error: (error) => {
                    console.error('⚠️ Erreur envoi emails reprogrammation:', error);
                    this.finishSave();
                }
            });
    }


    loadMissingEmailData(emailData: any) {
        // Si email client manque, charger depuis l'order
        if (!emailData.clientEmail && this.editData.orderId) {
            this.orderService.getOrder(this.editData.orderId)
                .subscribe({
                    next: (order) => {
                        emailData.clientEmail = order.clientInfo?.email;
                        emailData.clientName = order.clientInfo?.name || emailData.clientName;
                        emailData.procedure = order.generalCategoryName || order.categoryName || emailData.procedure;

                        // Envoyer l'email avec les données complètes
                        this.sendRescheduleEmailRequest(emailData);
                    },
                    error: (error) => {
                        console.error('❌ Erreur chargement order:', error);
                        // Envoyer quand même avec les données disponibles
                        this.sendRescheduleEmailRequest(emailData);
                    }
                });
        } else {
            // Envoyer avec les données disponibles
            this.sendRescheduleEmailRequest(emailData);
        }
    }

    getProcedureName(order: any): string {
        if (!order) return 'Procédure';

        // 1. Si c'est une string simple
        if (typeof order === 'string') return order;

        // 2. Priorité : generalCategoryName
        if (order.generalCategoryName && typeof order.generalCategoryName === 'string') {
            return order.generalCategoryName;
        }

        // 3. Si generalCategory est un objet avec name
        if (order.generalCategory && order.generalCategory.name && typeof order.generalCategory.name === 'string') {
            return order.generalCategory.name;
        }

        // 4. categoryName
        if (order.categoryName && typeof order.categoryName === 'string') {
            return order.categoryName;
        }

        // 5. Si category est un objet avec name
        if (order.category && order.category.name && typeof order.category.name === 'string') {
            return order.category.name;
        }

        // 6. Si category est une string
        if (typeof order.category === 'string') {
            return order.category;
        }

        // 7. Fallback
        return 'Procédure';
    }


    updateArrivalDate() {
        // Utiliser la route phone-confirm pour mettre à jour la date d'arrivée
        // (car elle accepte déjà l'arrivalDate)
        this.orderService.phoneConfirm(
            this.editData.orderId,
            'Date d\'arrivée modifiée via calendrier',
            this.editData.arrivalDate
        ).subscribe({
            next: (updatedOrder) => {
                console.log('✅ Date d\'arrivée mise à jour:', updatedOrder);
                this.finishSave();
            },
            error: (error) => {
                console.error('⚠️ Erreur mise à jour date d\'arrivée:', error);
                // On continue quand même car le RDV a été mis à jour
                this.finishSave();
            }
        });
    }


    // Méthode pour confirmer la date d'opération
    confirmOperationDate(appointment: any) {
        const confirmedDateTime = new Date(this.editData.confirmedOperationDate);

        this.appointmentService.confirmOperation(
            this.editData.appointmentId,
            confirmedDateTime,
            this.editData.operationNotes || ''
        ).subscribe({
            next: (response) => {
                console.log('✅ Date d\'opération confirmée:', response);
                this.finishSave();
            },
            error: (error) => {
                console.error('⚠️ Erreur confirmation opération:', error);
                // On continue quand même car le RDV a été mis à jour
                this.finishSave();
            }
        });
    }

    finishSave() {
        console.log('✅ Sauvegarde RDV terminée');
        this.isSaving = false;
        this.showNotification('RDV modifié avec succès. Email envoyé au client.', 'success');
        this.closeEditAppointmentModal(); // Fermer le modal RDV
        this.loadCalendarEvents();
    }



    closeEditModal() {
        const modalElement = document.getElementById('editAppointmentModal');
        if (modalElement) {
            const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        this.editData = {};
        this.isSaving = false;
    }
    canCancel(): boolean {
        if (!this.selectedAppointment) return false;

        const status = this.selectedAppointment.status;
        return status === 'scheduled' || status === 'confirmed';
    }

    getEventDuration(event: CalendarEvent): number {
        const start = new Date(event.start).getTime();
        const end = new Date(event.end).getTime();
        return (end - start) / (1000 * 60);
    }

    getFormattedDuration(event: CalendarEvent): string {
        const duration = this.getEventDuration(event);
        return `${duration} min`;
    }

    getEventStatusClass(status: string): string {
        const classes: { [key: string]: string } = {
            'scheduled': 'bg-primary',
            'confirmed': 'bg-success',
            'completed': 'bg-dark',
            'cancelled': 'bg-danger'
        };
        return classes[status] || 'bg-secondary';
    }

    getEventStatusText(status: string): string {
        const texts: { [key: string]: string } = {
            'scheduled': 'Programmé',
            'confirmed': 'Confirmé',
            'completed': 'Terminé',
            'cancelled': 'Annulé'
        };
        return texts[status] || status;
    }

    getStatusBadgeClass(status: string): string {
        const classes: { [key: string]: string } = {
            'pending': 'bg-warning',
            'under_review': 'bg-info',
            'phone_confirmed': 'bg-primary',
            'doctor_assigned': 'bg-secondary',
            'doctor_replied': 'bg-success',
            'appointment_scheduled': 'bg-success',
            'completed': 'bg-dark'
        };
        return classes[status] || 'bg-secondary';
    }

    getStatusText(status: string): string {
        const texts: { [key: string]: string } = {
            'pending': 'En attente',
            'under_review': 'En revue',
            'phone_confirmed': 'Confirmé par téléphone',
            'doctor_assigned': 'Docteur assigné',
            'doctor_replied': 'Docteur a répondu',
            'appointment_scheduled': 'RDV programmé',
            'completed': 'Terminé'
        };
        return texts[status] || status;
    }

    viewOrderDetails() {
        if (this.selectedArrivalDate) {
            this.closeModal();
            // Implémentez la redirection selon votre routing
            console.log('Voir commande:', this.selectedArrivalDate.extendedProps.orderId);
            // Exemple: this.router.navigate(['/commandes'], { queryParams: { orderId: this.selectedArrivalDate.extendedProps.orderId } });
        }
    }

    refreshCalendar() {
        this.loadCalendarEvents();
        this.loadArrivalDates();
        this.checkUpcomingArrivals();
    }

    onAppointmentCreated() {
        localStorage.removeItem('selectedOrderForAppointment');
        this.selectedOrderId = null;
        this.loadCalendarEvents();
    }

    clearSelection() {
        localStorage.removeItem('selectedOrderForAppointment');
        this.selectedOrderId = null;
    }

    changeView(viewName: string) {
        const calendarApi = this.calendarComponent.getApi();
        calendarApi.changeView(viewName);
    }

    goToToday() {
        const calendarApi = this.calendarComponent.getApi();
        calendarApi.today();
    }

    startAutoChecks() {
        // Vérifier toutes les 5 secondes au lieu de 60 secondes
        setInterval(() => {
            this.checkAndAutoConfirmAppointments();
            this.checkAndAutoCompleteAppointments();
        }, 5000); // 5 secondes

        // Vérifier aussi au chargement initial
        setTimeout(() => {
            this.checkAndAutoConfirmAppointments();
            this.checkAndAutoCompleteAppointments();
        }, 2000);
    }
    editArrivalDate() {
        // Si selectedArrivalDate est null, essayez de récupérer depuis l'événement
        if (!this.selectedArrivalDate) {
            console.warn('⚠️ selectedArrivalDate est null, tentative de récupération...');
            // Vous devriez avoir l'ID de l'événement quelque part
            return;
        }

        // Copiez les données pour éviter les problèmes de référence
        const arrivalData = { ...this.selectedArrivalDate };

        // Fermer le modal actuel
        const modalElement = document.getElementById('arrivalDateModal');
        if (modalElement) {
            const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();

                // Attendre la fermeture complète
                modalElement.addEventListener('hidden.bs.modal', () => {
                    this.prepareEditArrivalModal(arrivalData);
                }, { once: true });
            }
        }
    }


    // Méthode pour envoyer l'email de reprogrammation
    sendRescheduleEmail(oldDateTime: any, newDateTime: any) {
        if (!this.selectedAppointment) return;

        const emailData = {
            appointmentId: this.selectedAppointment._id,
            oldDateTime: oldDateTime,
            newDateTime: newDateTime,
            clientEmail: this.selectedAppointment.order?.clientInfo?.email,
            clientName: this.selectedAppointment.order?.clientInfo?.name,
            doctorEmail: this.selectedAppointment.doctor?.personalInfo?.email,
            doctorName: this.selectedAppointment.doctor?.personalInfo?.name,
            procedure: this.selectedAppointment.order?.category || 'Non spécifié',
            duration: this.selectedAppointment.duration || 60,
            notes: 'Modification depuis le calendrier'
        };

        this.appointmentService.sendRescheduleEmails(this.selectedAppointment._id, emailData)
            .subscribe({
                next: (response) => {
                    console.log('📧 Emails de reprogrammation envoyés:', response);
                    this.finishSave();
                },
                error: (error) => {
                    console.error('⚠️ Erreur envoi emails reprogrammation:', error);
                    // Continuer quand même si l'email échoue
                    this.finishSave();
                }
            });
    }

    updateArrivalDateAndSendEmail(oldRDVDateTime: any, newRDVDateTime: any, oldArrivalDate: any) {
        // CAS: Modification RDV ET date d'arrivée
        console.log('📅 Mise à jour RDV et date d\'arrivée');

        // 1. D'abord mettre à jour la date d'arrivée dans la base
        this.orderService.phoneConfirm(
            this.editData.orderId,
            'Date d\'arrivée modifiée via calendrier',
            this.editData.arrivalDate
        ).subscribe({
            next: (updatedOrder) => {
                console.log('✅ Date d\'arrivée mise à jour:', updatedOrder);

                // 2. Ensuite, envoyer l'email de modification d'arrivée
                if (oldArrivalDate) {
                    console.log('📧 Envoi email modification arrivée');
                    // Cette méthode doit aussi appeler finishSave() quand tout est terminé
                    this.sendArrivalDateUpdateEmail(oldArrivalDate, this.editData.arrivalDate);
                }

                // 3. Envoyer aussi l'email de reprogrammation du RDV
                console.log('📧 Envoi email reprogrammation RDV');
                this.sendRescheduleEmailsAndNotify(oldRDVDateTime, newRDVDateTime);
            },
            error: (error) => {
                console.error('⚠️ Erreur mise à jour date d\'arrivée:', error);
                // Si l'arrivée échoue, envoyer quand même l'email de reprogrammation
                this.sendRescheduleEmailsAndNotify(oldRDVDateTime, newRDVDateTime);
            }
        });
    }


    sendArrivalDateUpdateEmail(oldArrivalDate: any, newArrivalDate: any) {
        console.log('📧 Préparation email modification arrivée');

        // Créer l'objet avec toutes les propriétés
        const emailData: ArrivalEmailData = {
            orderId: this.editData.orderId,
            clientName: this.editData.clientName,
            procedure: this.editData.category,
            oldArrivalDate: oldArrivalDate,
            newArrivalDate: newArrivalDate,
            updateReason: 'Modification depuis le calendrier'
        };

        // Ajouter l'email client s'il existe
        if (this.selectedAppointment?.order?.clientInfo?.email) {
            emailData.clientEmail = this.selectedAppointment.order.clientInfo.email;
        } else if (this.editData.clientEmail) {
            emailData.clientEmail = this.editData.clientEmail;
        }

        console.log('📧 Données pour email arrivée:', emailData);

        // Vérifier si on a un email client
        if (!emailData.clientEmail) {
            console.warn('⚠️ Email client non disponible, tentative de récupération...');
            this.loadClientEmailForArrival(emailData);
        } else {
            this.sendArrivalEmailRequest(emailData);
        }
    }


    loadClientEmailForArrival(emailData: ArrivalEmailData) {
        if (this.editData.orderId) {
            this.orderService.getOrder(this.editData.orderId)
                .subscribe({
                    next: (order) => {
                        if (order?.clientInfo?.email) {
                            emailData.clientEmail = order.clientInfo.email;
                            emailData.clientName = order.clientInfo.name || emailData.clientName;
                            console.log('✅ Email chargé depuis order pour arrivée:', emailData.clientEmail);
                        }
                        this.sendArrivalEmailRequest(emailData);
                    },
                    error: (error) => {
                        console.error('❌ Erreur chargement order pour arrivée:', error);
                        this.sendArrivalEmailRequest(emailData); // Envoyer quand même
                    }
                });
        } else {
            this.sendArrivalEmailRequest(emailData);
        }
    }
    sendArrivalEmailRequest(emailData: ArrivalEmailData) {
        this.orderService.sendArrivalDateUpdateEmail(emailData)
            .subscribe({
                next: (response) => {
                    console.log('📧 Email modification arrivée envoyé:', response);
                    this.finishArrivalDateSave();
                },
                error: (error) => {
                    console.error('⚠️ Erreur envoi email modification arrivée:', error);
                    this.finishArrivalDateSave();
                }
            });
    }



    // Nouvelle méthode pour envoyer l'email avec les données de la commande
    sendArrivalEmailWithOrderData(order: any, oldArrivalDate: any, newArrivalDate: any) {
        const emailData = {
            orderId: this.editData.orderId,
            clientEmail: order?.clientInfo?.email,
            clientName: order?.clientInfo?.name || this.editData.clientName,
            procedure: order?.generalCategoryName || order?.categoryName || order?.category || this.editData.category,
            oldArrivalDate: oldArrivalDate,
            newArrivalDate: newArrivalDate,
            updateReason: 'Modification depuis le calendrier'
        };

        console.log('📧 Données pour email d\'arrivée:', emailData);

        this.orderService.sendArrivalDateUpdateEmail(emailData)
            .subscribe({
                next: (response) => {
                    console.log('📧 Email modification arrivée envoyé:', response);
                    this.finishSave(); // <-- IMPORTANT: Ajouter cet appel
                },
                error: (error) => {
                    console.error('⚠️ Erreur envoi email modification arrivée:', error);
                    this.finishSave(); // <-- Terminer même en cas d'erreur
                }
            });
    }
    sendArrivalEmailWithMinimalData(oldArrivalDate: any, newArrivalDate: any) {
        const emailData = {
            orderId: this.editData.orderId,
            clientName: this.editData.clientName || 'Client',
            procedure: this.editData.category || 'Procédure',
            oldArrivalDate: oldArrivalDate,
            newArrivalDate: newArrivalDate,
            updateReason: 'Modification depuis le calendrier'
        };

        console.log('📧 Envoi email avec données minimales:', emailData);

        this.orderService.sendArrivalDateUpdateEmail(emailData)
            .subscribe({
                next: (response) => {
                    console.log('📧 Email modification arrivée envoyé (données minimales):', response);
                    this.finishSave(); // Terminer après l'envoi
                },
                error: (error) => {
                    console.error('⚠️ Erreur envoi email modification arrivée:', error);
                    this.finishSave(); // Terminer même en cas d'erreur
                }
            });
    }

    getDoctorInfo(appointment: any): { name: string, email: string } {
        if (!appointment || !appointment.doctor) {
            return { name: 'le docteur', email: '' };
        }

        let doctorName = 'le docteur';
        let doctorEmail = '';

        // Essayer différents formats de données
        if (appointment.doctor.personalInfo) {
            doctorName = appointment.doctor.personalInfo.name || 'le docteur';
            doctorEmail = appointment.doctor.personalInfo.email || '';
        } else if (appointment.doctor.name) {
            doctorName = appointment.doctor.name;
            if (appointment.doctor.email) {
                doctorEmail = appointment.doctor.email;
            }
        } else if (appointment.doctor.doctorName) {
            doctorName = appointment.doctor.doctorName;
        } else if (typeof appointment.doctor === 'string') {
            // C'est un ID, chercher dans la liste des docteurs
            const doctor = this.doctors.find(d => d._id === appointment.doctor);
            if (doctor) {
                doctorName = doctor.personalInfo?.name || 'le docteur';
                doctorEmail = doctor.personalInfo?.email || '';
            }
        }

        return { name: doctorName, email: doctorEmail };
    }

    isArrivalDateChanged(newArrivalDate: string, oldArrivalDate: any): boolean {
        if (!newArrivalDate || !oldArrivalDate) return false;

        const newDate = new Date(newArrivalDate);
        const oldDate = new Date(oldArrivalDate);

        // Comparer les dates (ignorer l'heure)
        newDate.setHours(0, 0, 0, 0);
        oldDate.setHours(0, 0, 0, 0);

        return newDate.getTime() !== oldDate.getTime();
    }
    handleArrivalClick(event: any) {
        const arrivalEvent = this.arrivalDates.find(e => e.id === event.id);
        if (arrivalEvent) {
            this.selectedArrivalDate = arrivalEvent;
            //this.prepareEditArrivalModal(arrivalEvent);
            this.showArrivalDateModal();
        }
    }
    saveAppointmentOnly() {
        // Validation pour les rendez-vous
        if (!this.editData.appointmentId || !this.editData.appointmentDateTime) {
            this.showNotification('La date du RDV est requise', 'error');
            return;
        }

        this.isSaving = true;
        console.log('📅 Sauvegarde RDV seulement');

        // Données pour la sauvegarde
        const oldDateTime = this.editData.originalAppointment?.dateTime || this.selectedEvent?.start;
        const newDateTime = this.editData.appointmentDateTime;

        // 1. Mettre à jour la date du RDV
        const updateData = {
            dateTime: new Date(this.editData.appointmentDateTime).toISOString(),
            description: this.editData.notes || ''
        };

        this.appointmentService.updateAppointment(this.editData.appointmentId, updateData as any)
            .subscribe({
                next: (updatedAppointment) => {
                    console.log('✅ Date RDV mise à jour:', updatedAppointment);

                    // 2. Envoyer l'email de reprogrammation du RDV
                    this.sendRescheduleEmailsAndFinish(oldDateTime, newDateTime);
                },
                error: (error) => {
                    console.error('❌ Erreur modification date RDV:', error);
                    this.isSaving = false;
                    this.showNotification('Erreur lors de la modification du RDV', 'error');
                }
            });
    }

    // Ajouter ces méthodes pour gérer l'ouverture/fermeture des modals spécifiques

    showEditArrivalModal() {
        setTimeout(() => {
            const modalElement = document.getElementById('editArrivalDateOnlyModal');
            if (modalElement) {
                const modal = new (window as any).bootstrap.Modal(modalElement);
                modal.show();
            }
        }, 100);
    }

    showEditAppointmentModal() {
        setTimeout(() => {
            const modalElement = document.getElementById('editAppointmentOnlyModal');
            if (modalElement) {
                const modal = new (window as any).bootstrap.Modal(modalElement);
                modal.show();
            }
        }, 100);
    }

    closeEditArrivalModal() {
        const modalElement = document.getElementById('editArrivalDateOnlyModal');
        if (modalElement) {
            const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        this.editData = {};
        this.isSaving = false;
    }

    closeEditAppointmentModal() {
        const modalElement = document.getElementById('editAppointmentOnlyModal');
        if (modalElement) {
            const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }
        this.editData = {};
        this.isSaving = false;
    }
}
