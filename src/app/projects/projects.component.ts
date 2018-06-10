import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { UserService } from '../_services/user.service';
import { AlertService } from '../_services/alert.service';
declare var jQuery: any;

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit {

  projects: any; // The array of projects
  theNewProjectSiteUrl: any;
  createTheProjectClicked = false;

  // Flags for hovers ets
  mouseOverProjectFlags: any; // will be array of flags later

  // Script track_code loaded from index
  viewScriptModalSnippet = '';
  copied = false;

  constructor(private userService: UserService, private router: Router, private alertService: AlertService) { }

  /**
   * Gets the projects from the back-end and saves it to localstorage for later use
   */
  ngOnInit() {
    this.loadAllProjectsFromServer();

    // ~~ DEGBUGGING
    //   // ~~~~~~~~
    //   let debugProj = {
    //         _id: 1235,
    //         date: new Date().toLocaleString(),
    //         siteurl: 'www.lol.com',
    //         track_code: '53456657',
    //         // last_train_date:
    //         enable_keyguard_auth_flag: true,
    //         testing_threshold: 0.6,
    //         training_n_components: 2,
    //         training_outlier_min_dt: 15,
    //         training_outlier_max_dt: 1000,
    //         training_digraph_min_samples: 25,
    //         keystroke_code_collect_limit: 30
    //   }
    //   this.projects = [debugProj];
    //   debugProj = {
    //     _id: 7,
    //     date: new Date().toLocaleString(),
    //     siteurl: 'www.tasos123.com',
    //     track_code: '352362457',
    //     // last_train_date:
    //     enable_keyguard_auth_flag: false,
    //     testing_threshold: 0.9,
    //     training_n_components: 3,
    //     training_outlier_min_dt: 15,
    //     training_outlier_max_dt: 1000,
    //     training_digraph_min_samples: 25,
    //     keystroke_code_collect_limit: 30
    //  }
    //  this.projects.push(debugProj);
    //  this.mouseOverProjectFlags = new Array(this.projects.length).fill(false)
    //  console.log(this.projects);
    //  // ~~~~~~~
  }


  /**
   * Gets the user id from local storage
   */
  getUserIdFromLocalStorage() {
    // Get the current user from local storage
    const localStor = JSON.parse(localStorage.getItem('currentUser'));
    if (!localStor) {
      alert('You are not logged in');
      this.router.navigate(['/login']);
    } else {
      return localStor._id;
    }
  }

  /**
   * Get projects from back-end wrapper
   */
  loadAllProjectsFromServer() {
    const _id = this.getUserIdFromLocalStorage();
    this.userService.loadProjects(_id).subscribe(
      data => {
        if (data.success) {
          this.projects = data.projects;
          this.mouseOverProjectFlags = new Array(this.projects.length).fill(false)
          console.log(this.projects);
        } else {
          this.alertService.error(data.message, false, 3000);
          window.scrollTo(0, 0);
        }
      });
  }

  /**
   * Load project clicked on front-end
   */
  loadProject(index) {

    sessionStorage.setItem('currentProject', JSON.stringify(this.projects[index]));

    console.log(this.projects[index]);
    this.router.navigate(['/view-project', this.projects[index]._id]);
  }

  /**
   * Deletes a proejct
   */
  deleteProject(index) {
    if (confirm('Are you sure?')) {
      const user_id = this.getUserIdFromLocalStorage();
      this.userService.deleteProject(user_id, this.projects[index]._id).subscribe(
        data => {
          if (data.success) {
            this.alertService.success('Project Deleted!', false, 2500);
            this.projects = data.projects;
            window.scrollTo(0, 0);
          } else {
            this.alertService.error(data.message, false, 3000);
            window.scrollTo(0, 0);
          }
        });
    }
  }

  /**
   * View script
   */
  viewScript(index) {
    this.viewScriptModalSnippet = '<script type="text/javascript">\n\
    var track_code = "' + this.projects[index].track_code + '";\n\
</script>\n\
<script src="https://evening-dusk-17545.herokuapp.com/public/rx.lite.min.js"></script>\n\
<script src="https://evening-dusk-17545.herokuapp.com/public/rx.lite.dom.ajax.min.js"></script>\n\
<script src="https://evening-dusk-17545.herokuapp.com/public/rx.lite.dom.events.min.js"></script>\n\
<script src="https://evening-dusk-17545.herokuapp.com/public/jwt-decode.min.js"></script>\n\
<script id="contAuthServerScriptTag" src="https://evening-dusk-17545.herokuapp.com/public/keystroke.script.min.js"></script>';
    jQuery('#viewScriptModal').modal('show');
  }

  /** Called on copy success
   *
   */
  copiedOnSuccess() {
    console.log('copied');
    this.copied = true;
    const that = this;
    setTimeout(function () {
      that.copied = false;
    }, 1000);
  }

  /**
   * Toggles the create project modal
   */
  createProjectModal() {
    jQuery('#createProjectModal').modal('toggle');
  }

  /**
   * Creates a project
   */
  createTheProject() {
    this.createTheProjectClicked = true;
    if (this.theNewProjectSiteUrl === '' || this.theNewProjectSiteUrl === undefined) {
      return;
    } else {
      const user_id = this.getUserIdFromLocalStorage();
      this.userService.createProject(user_id, this.theNewProjectSiteUrl).subscribe(
        data => {
          console.log(data);
          jQuery('#createProjectModal').modal('hide');
          this.theNewProjectSiteUrl = '';
          if (data.success) {
            this.alertService.success(data.message, false, 2500);
            window.scrollTo(0, 0);
            if (this.projects !== undefined) {
              this.projects.push(data.project);
            } else {
              this.projects = [data.project];
            }
          } else {
            this.alertService.error(data.message, false, 3000);
            window.scrollTo(0, 0);
          }
        }
      );
    }
  }

  /**
   * Format date
   */
  formatMyDate(myDate) {
    const d = new Date(myDate);
    // return d.toLocaleString().substr(0, 10).concat(', ' + d.toTimeString().substr(0, 5));
    return String(d.getDate()) + '/' + String(d.getMonth() + 1) + '/' + String(d.getFullYear())
      + ', ' + String('0' + d.getHours()).slice(-2) + ':' + String('0' + d.getMinutes()).slice(-2);
  }
}
