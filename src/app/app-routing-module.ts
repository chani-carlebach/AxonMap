import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models/user.model';

// מגדיר את מסלולי הניווט העיקריים של האפליקציה ואת ה-guards האחראים לגישה לפי תפקיד.
const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dispatcher',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.Dispatcher, UserRole.Admin] },
    loadChildren: () =>
      import('./features/dispatcher/dispatcher.module')
        .then(m => m.DispatcherModule)
  },
  {
    path: 'responder',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.Paramedic, UserRole.Admin] },
    loadChildren: () =>
      import('./features/responder/responder.module')
        .then(m => m.ResponderModule)
  },
  {
    path: 'volunteer',
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.Volunteer, UserRole.Admin] },
    loadChildren: () =>
      import('./features/volunteer/volunteer.module')
        .then(m => m.VolunteerModule)
  },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
