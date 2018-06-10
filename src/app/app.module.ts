import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { NouisliderModule } from 'ng2-nouislider/src/nouislider';
import { Ng2SearchPipeModule } from 'ng2-search-filter';
import { Ng2PageScrollModule } from 'ng2-page-scroll';

import { AppComponent } from './app.component';
import { routing } from './app.routing';
import { ClipboardModule } from 'ngx-clipboard';


import { AlertComponent } from './_directives/index';
import { AuthGuard } from './_guards/index';
import { AlertService, AuthenticationService, UserService, GlobalEventsManagerService } from './_services/index';
import { HomeComponent } from './home/index';
import { LoginComponent } from './login/index';
import { RegisterComponent } from './register/index';
import { TopNavBarComponent } from './topnavbar/index';
import { LogoComponent } from './logo/index';
import { MyProfileComponent } from './myprofile/index';
import { AboutComponent } from './about/about.component';
import { LearnmoreComponent } from './learnmore/learnmore.component';
import { ProjectsComponent } from './projects/projects.component';
import { ViewProjectComponent } from './view-project/view-project.component';






@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        HttpModule,
        routing,
        ClipboardModule,
        NouisliderModule,
        Ng2SearchPipeModule,
        Ng2PageScrollModule
    ],
    declarations: [
        AppComponent,
        AlertComponent,
        HomeComponent,
        LoginComponent,
        RegisterComponent,
        TopNavBarComponent,
        LogoComponent,
        MyProfileComponent,
        AboutComponent,
        LearnmoreComponent,
        ProjectsComponent,
        ViewProjectComponent
    ],
    providers: [
        AuthGuard,
        AlertService,
        AuthenticationService,
        UserService,
        GlobalEventsManagerService
    ],
    bootstrap: [AppComponent]
})

export class AppModule { }
