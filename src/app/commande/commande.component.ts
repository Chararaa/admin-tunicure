import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Doctor, DoctorService } from '../services/doctor.service';
import { Order, OrderService, OrdersResponse } from '../services/order.service';
import { AppointmentService } from '../services/appointment.service';

declare const bootstrap: any;

@Component({
  selector: 'app-commande',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './commande.component.html',
  styleUrls: ['./commande.component.css']
})
export class CommandeComponent implements OnInit {
  orders: Order[] = [];
  doctors: Doctor[] = [];
  filteredOrders: Order[] = [];
  selectedOrder: Order | null = null;
  selectedStatus: string = 'all';
  searchTerm: string = '';
  isLoading: boolean = false;
  confirmedOperationDate: string = '';
  operationNotes: string = '';
  selectedAppointmentId: string = '';

  emailStatus: string = '';
  emailStatusClass: string = '';

  price: number = 0;
  priceNotes: string = '';

  // Modal data
  phoneCallNotes: string = '';
  arrivalDate: string = '';
  selectedDoctorId: string = '';
  doctorRemarks: string = '';
  appointmentDate: string = '';
  appointmentLocation: string = '';
  appointmentNotes: string = '';

  minDate: string;

  invoiceStatus: string = '';
  invoiceStatusClass: string = '';


  constructor(
    private orderService: OrderService,
    private doctorService: DoctorService,
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private router: Router
  ) {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  ngOnInit() {
    this.loadOrders();
    this.loadDoctors();
  }

  loadOrders() {
    this.isLoading = true;
    this.orderService.getOrders().subscribe({
      next: (response: OrdersResponse) => {
        this.orders = response.orders;
        this.filteredOrders = response.orders;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.isLoading = false;
      }
    });
  }

  loadDoctors() {
    this.doctorService.getDoctors({ verified: 'true' }).subscribe({
      next: (doctors) => {
        this.doctors = doctors;
      },
      error: (error) => {
        console.error('Error loading doctors:', error);
      }
    });
  }


  filterDoctorsByCategory(): any[] {
    if (!this.selectedOrder || !this.doctors) {
      return [];
    }

    const categoryName = this.getCategoryName(this.selectedOrder.category);

    if (!categoryName || categoryName === 'N/A') {
      console.warn('Nom de catégorie non trouvé pour cette commande');
      return [];
    }

    console.log('Catégorie de la commande:', categoryName);

    // Filtrer les médecins par spécialité
    const filteredDoctors = this.doctors.filter(doctor => {
      const matchesSpecialty = doctor.personalInfo.specialties.includes(categoryName);
      const isVerified = doctor.isVerified === true;
      return matchesSpecialty && isVerified;
    });

    console.log(`Catégorie: ${categoryName}, Médecins filtrés:`, filteredDoctors);
    return filteredDoctors;
  }
  

filterDoctorsByGeneralCategory(): any[] {
  if (!this.selectedOrder || !this.doctors) {
    return [];
  }

  // ✅ Utiliser direct le nom stocké
  const orderGeneralCategory = this.selectedOrder.generalCategoryName;

  console.log('🔍 Filtrage médecins');
  console.log('Catégorie générale de la commande:', orderGeneralCategory);
  console.log('Type:', typeof orderGeneralCategory);

  if (!orderGeneralCategory || orderGeneralCategory === 'N/A') {
    console.log('⚠️ Catégorie générale non trouvée');
    return [];
  }

  // Filtrer les médecins
  const filteredDoctors = this.doctors.filter(doctor => {
    const doctorSpecialties = doctor.personalInfo.specialties;
    const isVerified = doctor.isVerified === true;
    const matches = doctorSpecialties.includes(orderGeneralCategory);
    return matches && isVerified;
  });

  console.log(`🎯 Résultat: ${filteredDoctors.length} médecin(s) trouvé(s)`);
  return filteredDoctors;
}
 
 filterOrders() {
    this.filteredOrders = this.orders.filter(order => {
      const matchesStatus = this.selectedStatus === 'all' || order.status === this.selectedStatus;
      const matchesSearch = order.clientInfo.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.clientInfo.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }

  selectOrder(order: Order) {
    this.selectedOrder = order;
    // Reset form data when selecting a new order
    this.resetFormData();
  }

  confirmPhoneCall() {
    if (!this.selectedOrder || !this.arrivalDate) return;

    this.orderService.phoneConfirm(
      this.selectedOrder._id!,
      this.phoneCallNotes,
      this.arrivalDate
    ).subscribe({
      next: (updatedOrder) => {
        this.updateOrderInList(updatedOrder);
        this.selectedOrder = updatedOrder;
        this.phoneCallNotes = '';
        this.arrivalDate = '';
        this.showSuccess('Appel téléphonique confirmé avec succès');
      },
      error: (error) => {
        console.error('Error confirming phone call:', error);
        this.showError('Erreur lors de la confirmation de l\'appel');
      }
    });
  }


  assignDoctor() {
    if (!this.selectedOrder || !this.selectedDoctorId) return;

    // Vérifier d'abord si selectedOrder a un _id
    if (!this.selectedOrder._id) {
      this.showError('Erreur : La commande sélectionnée n\'a pas d\'ID');
      return;
    }

    // Assigner le docteur directement à la commande
    this.orderService.assignDoctor(this.selectedOrder._id, this.selectedDoctorId).subscribe({
      next: (orderResponse: any) => {
        this.updateOrderInList(orderResponse.order);
        this.selectedOrder = orderResponse.order;
        this.selectedDoctorId = '';

        // Optionnel : Créer un rendez-vous après l'assignation
        //this.createAppointmentAfterDoctorAssignment(orderResponse.order);

        this.showSuccess('Docteur assigné avec succès !');
      },
      error: (error) => {
        console.error('Error assigning doctor:', error);
        this.showError('Erreur lors de l\'assignation du docteur: ' + error.error?.message);
      }
    });
  }

  // Méthode optionnelle pour créer un rendez-vous après assignation du docteur
  private createAppointmentAfterDoctorAssignment(order: Order) {
    // Vous pouvez créer un rendez-vous par défaut ici
    const appointmentData = {
      orderId: order._id,
      dateTime: new Date().toISOString(), // Date par défaut
      duration: 60,
      type: 'consultation',
      appointmentLocation: 'À déterminer',
      appointmentNotes: 'Docteur assigné : ' + this.getAssignedDoctorName()
    };

    this.appointmentService.createAppointment(appointmentData).subscribe({
      next: (response: any) => {
        console.log('Rendez-vous créé automatiquement après assignation du docteur');
        // Stocker l'ID du rendez-vous pour la confirmation d'opération
        if (response.appointment && response.appointment._id) {
          this.selectedAppointmentId = response.appointment._id;
        }
      },
      error: (error) => {
        console.error('Error creating automatic appointment:', error);
        // Ne pas afficher d'erreur à l'utilisateur car l'assignation a réussi
      }
    });
  }
  submitDoctorRemarks() {
    if (!this.selectedOrder || !this.doctorRemarks) return;

    this.orderService.doctorReply(this.selectedOrder._id!, this.doctorRemarks).subscribe({
      next: (updatedOrder) => {
        this.updateOrderInList(updatedOrder);
        this.selectedOrder = updatedOrder;
        this.doctorRemarks = '';
        this.showSuccess('Remarques du docteur enregistrées avec succès');
      },
      error: (error) => {
        console.error('Error submitting doctor remarks:', error);
        this.showError('Erreur lors de l\'enregistrement des remarques');
      }
    });
  }

  private updateOrderInList(updatedOrder: Order) {
    const index = this.orders.findIndex(o => o._id === updatedOrder._id);
    if (index !== -1) {
      this.orders[index] = updatedOrder;
      this.filterOrders();
    }
  }

  getAssignedDoctorName(): string {
    if (!this.selectedOrder || !this.selectedOrder.assignedToDoctor) return '';

    // Si c'est un ID → cherche dans la liste
    if (typeof this.selectedOrder.assignedToDoctor === 'string') {
      const doctor = this.doctors.find(
        d => d._id === this.selectedOrder!.assignedToDoctor
      );
      return doctor ? doctor.personalInfo.name : 'Docteur non trouvé';
    }

    // Si c'est un objet complet → retourne le nom directement
    const doctorObj = this.selectedOrder.assignedToDoctor as any;
    return doctorObj.personalInfo?.name || 'Docteur non trouvé';
  }

  private resetFormData() {
    this.phoneCallNotes = '';
    this.arrivalDate = '';
    this.selectedDoctorId = '';
    this.doctorRemarks = '';
    this.appointmentDate = '';
    this.appointmentLocation = '';
    this.appointmentNotes = '';
    this.price = 0; // <-- AJOUTER
    this.priceNotes = ''; // <-- AJOUTER
  }

  private resetAppointmentForm() {
    this.appointmentDate = '';
    this.appointmentLocation = '';
    this.appointmentNotes = '';
  }

  private closeModal() {
    const modalElement = document.getElementById('orderDetailsModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      } else {
        const newModal = new bootstrap.Modal(modalElement);
        newModal.hide();
      }
    }
  }

  private showSuccess(message: string) {
    // Vous pouvez utiliser Toastr ou autre système de notification
    alert(message); // Remplacez par votre système de notification
  }

  private showError(message: string) {
    alert(message); // Remplacez par votre système de notification
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
  scheduleAppointment() {
    if (!this.selectedOrder || !this.appointmentDate || !this.appointmentLocation) return;

    // ✅ CORRECTION 1 : Vérifier que la date du RDV n'est pas avant la date d'arrivée
    if (this.selectedOrder.arrivalDate) {
      const arrivalDate = new Date(this.selectedOrder.arrivalDate);
      const appointmentDate = new Date(this.appointmentDate);

      // Comparer seulement les dates (ignorer l'heure)
      const arrivalDateOnly = new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate());
      const appointmentDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());

      if (appointmentDateOnly < arrivalDateOnly) {
        this.showError(`Erreur : La date du rendez-vous (${appointmentDate.toLocaleDateString('fr-FR')}) ne peut pas être antérieure à la date d'arrivée (${arrivalDate.toLocaleDateString('fr-FR')})`);
        return;
      }
    }
    const formattedDate = new Date(this.appointmentDate).toISOString();

    // Créer le rendez-vous SANS docteur assigné
    const appointmentData = {
      orderId: this.selectedOrder._id,
      dateTime: formattedDate,
      duration: 60,
      type: 'consultation',
      appointmentLocation: this.appointmentLocation,
      appointmentNotes: this.appointmentNotes
    };

    console.log('📤 Données rendez-vous sans docteur:', appointmentData);

    this.appointmentService.createAppointment(appointmentData).subscribe({
      next: (response: any) => {
        this.updateOrderInList(response.order);
        this.selectedOrder = response.order;
        this.resetAppointmentForm();
        this.showSuccess('Rendez-vous programmé avec succès ! Docteur à assigner ensuite.');
      },
      error: (error) => {
        console.error('❌ Error creating appointment:', error);
        this.showError('Erreur lors de la création du rendez-vous: ' + error.error?.message);
      }
    });
  }
  getCategoryName(category: any): string {
    if (!category) return 'N/A';

    if (typeof category === 'string') {
      return category;
    } else if (typeof category === 'object' && category.name) {
      return category.name;
    } else if (this.selectedOrder?.categoryName) {
      return this.selectedOrder.categoryName;
    }

    return 'N/A';
  }

  // Méthode pour extraire le nom de la catégorie générale
  getGeneralCategoryName(generalCategory: any): string {
    if (!generalCategory) return 'N/A';

    if (typeof generalCategory === 'string') {
      return generalCategory;
    } else if (typeof generalCategory === 'object' && generalCategory.name) {
      return generalCategory.name;
    } else if (this.selectedOrder?.generalCategoryName) {
      return this.selectedOrder.generalCategoryName;
    }

    return 'N/A';
  }

  confirmOperation() {
    if (!this.selectedAppointmentId || !this.confirmedOperationDate) {
      this.showError('Veuillez sélectionner une date d\'opération confirmée');
      return;
    }

    if (!this.selectedOrder) {
      this.showError('Aucune commande sélectionnée');
      return;
    }

    this.appointmentService.confirmOperation(
      this.selectedAppointmentId,
      new Date(this.confirmedOperationDate),
      this.operationNotes
    ).subscribe({
      next: (response: any) => {
        this.showSuccess('Date d\'opération confirmée avec succès ! Email envoyé au client.');

        // Réinitialiser les champs
        this.confirmedOperationDate = '';
        this.operationNotes = '';
        this.selectedAppointmentId = '';

        // Mettre à jour l'ordre si retourné dans la réponse
        if (response.order) {
          this.updateOrderInList(response.order);
          this.selectedOrder = response.order;
        }
      },
      error: (error) => {
        console.error('Error confirming operation:', error);
        this.showError('Erreur lors de la confirmation de l\'opération: ' + error.error?.message);
      }
    });
  }

  sendAppointmentEmail() {
    if (!this.selectedOrder) {
      this.showError('Aucune commande sélectionnée');
      return;
    }

    if (!this.selectedOrder.appointmentDate) {
      this.showError('La commande n\'a pas de rendez-vous programmé');
      return;
    }

    // ✅ SIMPLE : Utiliser toujours sendAppointmentEmail (qui existe déjà)
    this.orderService.sendAppointmentEmail(this.selectedOrder._id!).subscribe({
      next: (response: any) => {
        this.showSuccess('Email envoyé avec succès au client !');
        if (response.order) {
          this.updateOrderInList(response.order);
          this.selectedOrder = response.order;
        }
      },
      error: (error) => {
        console.error('Error sending email:', error);
        this.showError('Erreur: ' + error.error?.message);
      }
    });
  }


  sendDoctorRemarksEmail() {
    if (!this.selectedOrder) {
      this.showError('Aucune commande sélectionnée');
      return;
    }

    // Vérifier qu'il y a des remarques du docteur
    if (!this.selectedOrder.notes?.doctorRemarks) {
      this.showError('Aucune remarque du docteur disponible');
      return;
    }

    // Afficher l'état d'envoi
    this.emailStatus = 'Envoi en cours...';
    this.emailStatusClass = 'text-info';

    // Appeler le service pour envoyer l'email
    this.orderService.sendDoctorRemarksEmail(this.selectedOrder._id!).subscribe({
      next: (response: any) => {
        this.emailStatus = '✅ Email envoyé avec succès au client !';
        this.emailStatusClass = 'text-success';
        this.showSuccess('Email envoyé avec succès au client !');

        // Optionnel: Mettre à jour le statut
        if (response.order) {
          this.updateOrderInList(response.order);
          this.selectedOrder = response.order;
        }

        // Effacer le message après 5 secondes
        setTimeout(() => {
          this.emailStatus = '';
          this.emailStatusClass = '';
        }, 5000);
      },
      error: (error) => {
        console.error('Error sending doctor remarks email:', error);
        this.emailStatus = '❌ Erreur lors de l\'envoi de l\'email';
        this.emailStatusClass = 'text-danger';
        this.showError('Erreur lors de l\'envoi de l\'email: ' + error.error?.message);

        // Effacer le message après 5 secondes
        setTimeout(() => {
          this.emailStatus = '';
          this.emailStatusClass = '';
        }, 5000);
      }
    });
  }

  // Méthode simplifiée
  savePrice() {
    if (!this.selectedOrder) {
      this.showError('Aucune commande sélectionnée');
      return;
    }

    if (!this.price || this.price <= 0) {
      this.showError('Veuillez entrer un prix valide (supérieur à 0)');
      return;
    }

    // Si pas de notes, juste enregistrer le prix
    if (!this.priceNotes) {
      this.updatePriceOnly();
    } else {
      // Si notes, enregistrer les deux
      this.updatePriceWithNotes();
    }
  }

  private updatePriceOnly() {
    this.orderService.updatePrice(this.selectedOrder!._id!, this.price).subscribe({
      next: (updatedOrder) => {
        this.updateOrderInList(updatedOrder);
        this.selectedOrder = updatedOrder;
        this.price = 0;
        this.showSuccess('Prix enregistré avec succès');
      },
      error: (error) => {
        console.error('Error saving price:', error);
        this.showError('Erreur lors de l\'enregistrement du prix: ' + (error.error?.error || error.message));
      }
    });
  }

  private updatePriceWithNotes() {
    // Mettre à jour le prix d'abord
    this.orderService.updatePrice(this.selectedOrder!._id!, this.price).subscribe({
      next: (updatedOrder) => {
        // Ensuite mettre à jour les notes
        const updatedNotes = {
          ...updatedOrder.notes,
          priceNotes: this.priceNotes  // Note: créer un nouveau champ pour les notes texte
        };

        this.orderService.updateOrderNotes(updatedOrder._id!, updatedNotes).subscribe({
          next: (orderWithNotes) => {
            this.updateOrderInList(orderWithNotes);
            this.selectedOrder = orderWithNotes;
            this.price = 0;
            this.priceNotes = '';
            this.showSuccess('Prix et notes enregistrés avec succès');
          },
          error: (error) => {
            console.error('Error saving price notes:', error);
            this.showError('Prix enregistré mais erreur avec les notes: ' + (error.error?.error || error.message));
          }
        });
      },
      error: (error) => {
        console.error('Error saving price:', error);
        this.showError('Erreur lors de l\'enregistrement du prix: ' + (error.error?.error || error.message));
      }
    });
  }
  private updatePriceNotes(order: Order) {
    const updatedNotes = {
      ...order.notes,
      price: this.price,  // <-- CORRECTION : utiliser this.price (number)
      priceNotes: this.priceNotes  // <-- AJOUT : créer un champ séparé pour les notes
    };

    this.orderService.updateOrderNotes(order._id!, updatedNotes).subscribe({
      next: (updatedOrder) => {
        this.updateOrderInList(updatedOrder);
        this.selectedOrder = updatedOrder;
        this.price = 0;
        this.priceNotes = '';
        this.showSuccess('Prix et notes enregistrés avec succès');
      },
      error: (error) => {
        console.error('Error updating price notes:', error);
        console.log('Détails de l\'erreur:', error.error);
        this.showError('Erreur lors de l\'enregistrement des notes: ' + (error.error?.error || error.message));
      }
    });
  }

  // Méthode pour envoyer la facture
  sendInvoice() {
    if (!this.selectedOrder) {
      this.showError('Aucune commande sélectionnée');
      return;
    }

    if (!this.selectedOrder.price) {
      this.showError('Veuillez d\'abord définir un prix');
      return;
    }

    this.invoiceStatus = 'Envoi de la facture en cours...';
    this.invoiceStatusClass = 'text-info';

    this.orderService.sendInvoiceEmail(this.selectedOrder._id!).subscribe({
      next: (response: any) => {
        this.invoiceStatus = '✅ Facture envoyée avec succès au client !';
        this.invoiceStatusClass = 'text-success';

        // Mettre à jour l'ordre
        if (response.order) {
          this.updateOrderInList(response.order);
          this.selectedOrder = response.order;
        }

        this.showSuccess('Facture envoyée avec succès ! Le client peut maintenant payer en ligne.');

        // Effacer le message après 5 secondes
        setTimeout(() => {
          this.invoiceStatus = '';
          this.invoiceStatusClass = '';
        }, 5000);
      },
      error: (error) => {
        console.error('Erreur envoi facture:', error);
        this.invoiceStatus = '❌ Erreur lors de l\'envoi de la facture';
        this.invoiceStatusClass = 'text-danger';
        this.showError('Erreur lors de l\'envoi de la facture: ' + error.error?.message);
      }
    });
  }

  // Méthode pour vérifier le statut du paiement
  checkPaymentStatus() {
    if (!this.selectedOrder) return;

    this.orderService.getPaymentStatus(this.selectedOrder._id!).subscribe({
      next: (status: any) => {
        if (status.depositPaid && !this.selectedOrder?.isDepositPaid) {
          // Rafraîchir les données
          this.loadOrders();
        }
      },
      error: (error) => {
        console.error('Erreur vérification paiement:', error);
      }
    });
  }
  // Dans le composant
  getStripePaymentStatus(order: Order): string | null {
    return order.stripe?.paymentStatus || null;
  }

  getPaymentBadgeClass(order: Order): string {
    const status = order.stripe?.paymentStatus;

    switch (status) {
      case 'completed':
        return 'bg-success'; // vert
      case 'pending':
        return 'bg-danger'; // rouge
      case 'failed':
        return 'bg-danger';
      case 'refunded':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
    }
  }

  getPaymentStatusText(order: Order): string {
    const status = order.stripe?.paymentStatus;

    switch (status) {
      case 'completed':
        return 'Payé';
      case 'pending':
        return 'En attente';
      case 'failed':
        return 'Échec';
      case 'refunded':
        return 'Remboursé';
      default:
        return '—';
    }
  }

}

