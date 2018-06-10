import { ViewProjectComponent } from './view-project/view-project.component';

import { ProjectsComponent } from './projects/projects.component';

import { LearnmoreComponent } from './learnmore/learnmore.component';
import { Routes, RouterModule } from '@angular/router';

import { HomeComponent } from './home/index';
import { LoginComponent } from './login/index';
import { RegisterComponent } from './register/index';
import { MyProfileComponent } from './myprofile/my-profile.component';
import { AboutComponent } from './about/about.component';


import { AuthGuard } from './_guards/index';




const appRoutes: Routes = [
    { path: 'home', component: HomeComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'learn-more', component: LearnmoreComponent },
    { path: 'about', component: AboutComponent },
    { path: 'myprofile', component: MyProfileComponent, canActivate: [AuthGuard] },  // canActivate: [AuthGuard]
    { path: 'projects', component: ProjectsComponent, canActivate: [AuthGuard] }, // canActivate: [AuthGuard]
    { path: 'view-project/:id', component: ViewProjectComponent, canActivate: [AuthGuard] }, // canActivate: [AuthGuard]
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: '**', redirectTo: '/home', pathMatch: 'full' }
];

export const routing = RouterModule.forRoot(appRoutes);
