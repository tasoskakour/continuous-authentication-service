import {Component, OnInit} from "@angular/core";
import { User } from '../_models/index';
import { AuthenticationService } from '../_services/authentication.service';

@Component({
    selector: "topnavbar",
    templateUrl: "top-nav-bar.component.html",
    styleUrls: ['./top-nav-bar.component.css'],

})

export class TopNavBarComponent  {

    constructor(public authService: AuthenticationService) {}


}

