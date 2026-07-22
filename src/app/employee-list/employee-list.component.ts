// components/employee-list/employee-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Employee, EmployeeService, UpdateRoleDto } from '../services/employee.service';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.css']
})
export class EmployeeListComponent implements OnInit {
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];
  isLoading: boolean = false;
  searchTerm: string = '';
  selectedPoste: string = 'all';
  selectedRole: string = 'all';

  // Pour l'édition du rôle
  selectedEmployee: Employee | null = null;
  newRole: string = '';
  isUpdatingRole: boolean = false;

  postes = ['marketing', 'dev', 'designer', 'commercial'];
  roles = [
    { value: 'employee', label: 'Employé' },
    { value: 'customer_service', label: 'Service Client' },
    { value: 'admin', label: 'Administrateur' },
    { value: 'super_admin', label: 'Super Admin' }
  ];

  constructor(private employeeService: EmployeeService) { }

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.isLoading = true;
    this.employeeService.getEmployees().subscribe({
      next: (employees) => {
        this.employees = employees;
        this.filteredEmployees = employees;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.isLoading = false;
      }
    });
  }

  filterEmployees() {
    this.filteredEmployees = this.employees.filter(employee => {
      const matchesPoste = this.selectedPoste === 'all' ||
        employee.professionalInfo.poste === this.selectedPoste;

      const matchesRole = this.selectedRole === 'all' ||
        employee.user.role === this.selectedRole;

      const matchesSearch = employee.personalInfo.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        employee.personalInfo.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        employee.professionalInfo.poste.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchesPoste && matchesRole && matchesSearch;
    });
  }

  selectEmployeeForRole(employee: Employee) {
    this.selectedEmployee = employee;
    this.newRole = employee.user.role;
  }

  updateEmployeeRole() {
    if (!this.selectedEmployee || !this.newRole) return;

    this.isUpdatingRole = true;
    const roleData: UpdateRoleDto = { role: this.newRole };

    this.employeeService.updateEmployeeRole(this.selectedEmployee._id!, roleData).subscribe({
      next: (response) => {
        this.isUpdatingRole = false;

        // Mettre à jour l'employé dans la liste
        const index = this.employees.findIndex(e => e._id === this.selectedEmployee!._id);
        if (index !== -1) {
          this.employees[index] = response.employee;
        }

        this.filterEmployees();
        this.selectedEmployee = null;
        this.newRole = '';

        // Fermer le modal
        this.closeModal('roleModal');
      },
      error: (error) => {
        this.isUpdatingRole = false;
        console.error('Error updating role:', error);
        alert('Erreur lors de la mise à jour du rôle: ' + (error.error?.error || error.message));
      }
    });
  }

  deleteEmployee(employee: Employee) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'employé ${employee.personalInfo.name} ?`)) {
      this.employeeService.deleteEmployee(employee._id!).subscribe({
        next: (response) => {
          // Retirer l'employé de la liste
          this.employees = this.employees.filter(e => e._id !== employee._id);
          this.filterEmployees();
          alert(response.message);
        },
        error: (error) => {
          console.error('Error deleting employee:', error);
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

  getPosteDisplayName(poste: string): string {
    const posteNames: { [key: string]: string } = {
      'marketing': 'Marketing',
      'dev': 'Développeur',
      'designer': 'Designer',
      'commercial': 'Commercial'
    };
    return posteNames[poste] || poste;
  }

  getRoleDisplayName(role: string): string {
    const roleObj = this.roles.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  }

  getRoleBadgeClass(role: string): string {
    const classes: { [key: string]: string } = {
      'super_admin': 'bg-danger',
      'admin': 'bg-warning text-dark',
      'customer_service': 'bg-info',
      'employee': 'bg-secondary'
    };
    return classes[role] || 'bg-light text-dark';
  }

  getPosteBadgeClass(poste: string): string {
    const classes: { [key: string]: string } = {
      'marketing': 'bg-purple',
      'dev': 'bg-primary',
      'designer': 'bg-success',
      'commercial': 'bg-orange'
    };
    return classes[poste] || 'bg-secondary';
  }

  getEmployeeImage(employee: Employee): string {
    return employee.personalInfo.image || 'assets/images/profile/user-1.jpg';
  }
}