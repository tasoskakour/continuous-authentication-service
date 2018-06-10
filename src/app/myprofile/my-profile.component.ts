import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../_models/index';
import { UserService } from '../_services/index';
import { AlertService } from '../_services/alert.service';




@Component({
    selector: 'myprofile',
    templateUrl: 'my-profile.component.html',
    styleUrls: ['./my-profile.component.css'],
})

export class MyProfileComponent implements OnInit {

    currentUser = new User;


    constructor(private router: Router, private userService: UserService, private alertService: AlertService) {

    }

    ngOnInit() {

        // Get the current user from local storage
        const localStor = JSON.parse(localStorage.getItem('currentUser'));
        console.log(localStor);

        if (!localStor) {
            alert('You are not logged in');
            this.router.navigate(['/login']);
        } else {
            this.currentUser = localStor;
            this.currentUser.date = this.formatMyDate(this.currentUser.date);
        }


        // fake stoixeia
        // this.currentUser._id = 123123;
        // this.currentUser.username = 'greekoo';
        // this.currentUser.firstname = 'Tasos';
        // this.currentUser.lastname = 'Kakouris';
        // this.currentUser.date = this.formatMyDate(new Date().toLocaleString());
        // const debugProj = {
        //      date: new Date().toLocaleString(),
        //      siteurl: 'www.lol.com',
        //      track_code: '53456657',
        //      // last_train_date:
        //      enable_keyguard_auth_flag: true,
        //      testing_threshold: 0.6,
        //      training_n_components: 2,
        //      training_outlier_min_dt: 15,
        //      training_outlier_max_dt: 1000,
        //      training_digraph_min_samples: 25,
        //      keystroke_code_collect_limit: 30
        // }
        // this.currentUser.projects.push(debugProj);
        // console.log(this.currentUser);

    }

    /**
     * formats date
    */
    formatMyDate(myDate) {
        const d = new Date(myDate);
        return d.toLocaleString().substr(0, 10).concat(', ' + d.toTimeString().substr(0, 5));
    }


}

