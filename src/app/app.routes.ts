import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { CommandeComponent } from './commande/commande.component';
import { CalendrierComponent } from './calendrier/calendrier.component';
import { DoctorComponent } from './doctor/doctor.component';
import { DoctorStatisticsComponent } from './statistics/statistics.component';
import { RegistreComponent } from './registre/registre.component';
import { EmployeeRegisterComponent } from './employee-register/employee-register.component';
import { EmployeeListComponent } from './employee-list/employee-list.component';
import { authGuard } from './guards/auth.guard';
import { CategoryManagerComponent } from './category-manager/category-manager.component';
import { GeneralCategoryManagerComponent } from './general-category-manager/general-category-manager.component';

export const routes: Routes = [

    {
        path: '', component: HomeComponent,
        canActivate: [authGuard],
        data: { roles: ['admin', 'super_admin'] }
    },
    {
        path: 'home', component: HomeComponent,


    },
    { path: 'login', component: LoginComponent },
    { path: 'registre', component: RegistreComponent },
    { path: 'order', component: CommandeComponent },
    { path: 'appointment', component: CalendrierComponent },
    { path: 'doctor', component: DoctorComponent },
    { path: 'statistics', component: DoctorStatisticsComponent },
    { path: 'employees/register', component: EmployeeRegisterComponent },
    { path: 'employees/list', component: EmployeeListComponent, canActivate: [authGuard], data: { roles: ['admin', 'super_admin'] } },
    {
        path: 'general-categories',
        component: GeneralCategoryManagerComponent,
        canActivate: [authGuard],
        data: { roles: ['admin', 'super_admin'] }
    },
    {
        path: 'categories',
        component: CategoryManagerComponent,
        canActivate: [authGuard],
        data: { roles: ['admin', 'super_admin'] }
    }
];
