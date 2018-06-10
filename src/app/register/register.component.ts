import { AuthenticationService } from '../_services';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AlertService, UserService } from '../_services/index';

@Component({
    moduleId: module.id,
    templateUrl: 'register.component.html'
})

export class RegisterComponent implements OnInit {
    model: any = {};
    loading = false;

    constructor(
        private router: Router,
        private userService: UserService,
        private alertService: AlertService,
        private authService: AuthenticationService
    ) { }

    ngOnInit() {
        if (this.authService.isUserLoggedIn()) { this.router.navigateByUrl('/home'); }
    }

    register() {
        this.loading = true;
        this.userService.create(this.model)
            .subscribe(
                data => {

                    // response from serve for creating user:
                    if (data.success === false) {
                        this.alertService.error(data.message, false, 4000);
                          this.loading = false;
                    }else {
                        this.alertService.success('Registration Succesful', true);
                        this.router.navigate(['/login']);
                    }
                });
    }
}

// The register component has a single register()
// method that creates a new user with the user service when the register form is submitted.