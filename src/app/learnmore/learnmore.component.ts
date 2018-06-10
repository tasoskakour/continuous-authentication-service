import { AuthenticationService } from '../_services';
import { Component, OnInit } from '@angular/core';



@Component({
    moduleId: module.id,
    templateUrl: 'learnmore.component.html'
})

export class LearnmoreComponent  {

    constructor(public authService: AuthenticationService) {}

}
