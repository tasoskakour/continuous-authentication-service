import { Component, OnInit } from '@angular/core';

import { User } from '../_models/index';
import { UserService } from '../_services/index';
import { AuthenticationService } from '../_services/authentication.service';

@Component({
    moduleId: module.id,
    templateUrl: 'home.component.html'
})

export class HomeComponent  {

    constructor(public authService:AuthenticationService){}

}

// The home component gets the current user from local storage
//  and all users from the user service, and makes them available to the template.