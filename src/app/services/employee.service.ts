// services/employee.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment';
import { environment } from '../../environments/environment.prod';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface Employee {
  _id?: string;
  user: User;
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    image?: string;
  };
  professionalInfo: {
    poste: 'marketing' | 'dev' | 'designer' | 'commercial';
    skills: string[];
    bio?: string;
    hireDate: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeDto {
  name: string;
  email: string;
  phone: string;
  image?: string;
  poste: 'marketing' | 'dev' | 'designer' | 'commercial';
  skills?: string[];
  bio?: string;
  password: string;
}

export interface UpdateEmployeeDto {
  name?: string;
  phone?: string;
  image?: string;
  poste?: 'marketing' | 'dev' | 'designer' | 'commercial';
  skills?: string[];
  bio?: string;
}

export interface UpdateRoleDto {
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = `${environment.apiUrl}/employees`;

  constructor(private http: HttpClient) { }

  createEmployee(employeeData: CreateEmployeeDto): Observable<{ message: string, employee: Employee }> {
    return this.http.post<{ message: string, employee: Employee }>(this.apiUrl, employeeData);
  }

  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.apiUrl);
  }

  getEmployee(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.apiUrl}/${id}`);
  }

  updateEmployee(id: string, employeeData: UpdateEmployeeDto): Observable<{ message: string, employee: Employee }> {
    return this.http.put<{ message: string, employee: Employee }>(`${this.apiUrl}/${id}`, employeeData);
  }

  updateEmployeeRole(id: string, roleData: UpdateRoleDto): Observable<{ message: string, employee: Employee }> {
    return this.http.patch<{ message: string, employee: Employee }>(`${this.apiUrl}/${id}/role`, roleData);
  }

  deleteEmployee(id: string): Observable<{ message: string, employee: Employee }> {
    return this.http.delete<{ message: string, employee: Employee }>(`${this.apiUrl}/${id}`);
  }
  // nouveau method à ajouter dans EmployeeService
  getByUser(userId: string) {
    return this.http.get<Employee>(`${this.apiUrl}/by-user/${userId}`);
  }

}
