import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Component({
    moduleId: module.id,
    selector: 'app',
    templateUrl: 'app.component.html',
    styleUrls: ['./app.component.css'],
})

export class AppComponent  implements OnInit {

    constructor(private router: Router) { }

    // Implement this to automatically scroll to top on route change
    ngOnInit() {
        this.router.events.subscribe((evt) => {
            if (!(evt instanceof NavigationEnd)) {
                return;
            }
            window.scrollTo(0, 0);
        });
    }
 }

