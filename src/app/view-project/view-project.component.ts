import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { UserService } from '../_services/user.service';
import { AlertService } from '../_services/alert.service';
declare var jQuery: any;

@Component({
  selector: 'app-view-project',
  templateUrl: './view-project.component.html',
  styleUrls: ['./view-project.component.css']
})
export class ViewProjectComponent implements OnInit, AfterViewInit {

  // Project Summary (At the top below the jumbotron)
  ProjectSummary: any;

  // Subjects Summary at the bottom (the table)
  SubjectsSummary: any;

  _projectId: any; // This is the id in which we will send queries to the back-end
  currentProject: any; // This is the current project clicked before


  currentProjectSiteURL_backup = ''; // used as backup in case of cancel at site url edit

  // Flags
  activateSiteURLInputFlag = false;
  dashboardLoadingFlag = true; // is true at start
  trainLoadingFlag = false;
  projectChangingFlag = false;
  onProjectSettingsChangeFlag = false;
  noSubjectsFlag = false;

  // How many untrained
  untrained = 0;

  // Sliders etc
  timingLimits = { keyHold: [1, 1], digraphUpDown: [1, 1] };


  // Tool tips
  tooltips = {
    timings_key_hold_range: 'The Training Range for the Key Hold Timings of the Digraphs.',
    timings_di_up_down_range: 'The Training Range for the Up-Down Timings of the Digraphs.\
    Negative Values can exist if the second key is pressed before releasing the first.',
    authentication_threshold: 'This threshold is used in authentication procedure. Higher threshold means more strict authentication.',
    keystroke_collect_period: 'Set how often (per how many seconds) should the logging script send data to the server for testing.',
    totalDigraphs: 'The number of total unique digraphs extracted from subject.',
    top3Digraphs: 'The top 3 digraphs, regarding the frequency of appearance, \
    for the subject. \' \' and \'<-\' represent space and backspace, respectively. '
  }


  constructor(private alertService: AlertService, private router: Router,
    private route: ActivatedRoute, private userService: UserService) { }


  /**
   * Extracts the id project frmo the url
   * Loads the project from session storage or the server
   * Get the dashboard-data of subjects from back-end
   */
  ngOnInit() {

    // Get project-id
    this.route.params.subscribe(params => {
      this._projectId = params['id'];
    });

    // Get currentProject from sessionStorage if available, otherwise load it from server
    if (sessionStorage.getItem('currentProject') !== null) {
      console.log('Loading currentProject from sesionStorage');
      this.currentProject = JSON.parse(sessionStorage.getItem('currentProject')); // load project
      sessionStorage.removeItem('currentProject');
      this.loadSubjectsSummary();
      this.setTimingLimitsSlider();
      this.setLastTrainDate();
    } else {
      console.log('Loading currentProject from server...')
      this.loadProjectFromServer();
    }

    // ~~~~~~~~ DEBUGGING
    // this.currentProject = {
    //   _id: 1235,
    //   date: new Date().toLocaleString(),
    //   siteurl: 'www.lol.com',
    //   track_code: '53456657',
    //   last_train_date: 1511702302493,
    //   enable_keyguard_auth_flag: true,
    //   testing_threshold: 0.6,
    //   keystroke_data_collect_every_n_seconds: 5,
    //   training_algorithm: 'ONE_CLASS_SVM',
    //   training_params: {
    //     ONE_CLASS_SVM: {
    //       gamma: 0.1
    //     },
    //     GMM: {
    //       n_components: 2,
    //       delta: 1.5
    //     }
    //   }, timing_limits: {
    //     digraph_up_down: {
    //       max: 800,
    //       min: -400
    //     },
    //     key_hold: {
    //       max: 400,
    //       min: 0
    //     }
    //   }
    // }
    // this.ProjectSummary = { totalUsers: 5, totalKeystrokes: 12345, lastKeystrokeDate: 1511702303493, totalRejections: 10 }
    // const _tmp = [];
    // let tempobj = {
    //   _id: 'abc12', subject: 'lolas', totalKeystrokes: 1000, firstKeystrokeDate: 1511702302493,
    //   lastKeystrokeDate: 1511702303440, rejections: 0, isTrained: true, totalUniqueDigraphs: 300,
    //   top5Digraphs: [{ digraph: 'KeyESpace', samples: 36 },
    //   { digraph: 'KeyHKeyE', samples: 36 }, { digraph: 'KeyEKeyT', samples: 36 },
    //   { digraph: 'KeyNKeyI', samples: 36 }, { digraph: 'BackspaceBackspace', samples: 36 }],
    //   avgSamplesPerDigraph: 2.1
    // };
    // _tmp.push(tempobj);
    // tempobj = {
    //   _id: 'abc12', subject: 'lolas', totalKeystrokes: 1000, firstKeystrokeDate: 1511702302493,
    //   lastKeystrokeDate: 1511702303440, rejections: 0, isTrained: true, totalUniqueDigraphs: 300,
    //   top5Digraphs: [{ digraph: 'KeyESpace', samples: 36 },
    //   { digraph: 'KeyEBackspace', samples: 36 }, { digraph: 'BackspaceBackspace', samples: 36 },
    //   { digraph: 'KeyEBackspace', samples: 36 }, { digraph: 'KeyTSpace', samples: 36 }],
    //   avgSamplesPerDigraph: 2.1
    // };
    // _tmp.push(tempobj);
    // _tmp.push(tempobj);
    // _tmp.push(tempobj);
    // this.SubjectsSummary = _tmp
    // this.dashboardLoadingFlag = false;
    // console.log(this.currentProject)
    // this.setTimingLimitsSlider()
    // this.howManyAreUntrained()
    // ~~~~~~~~~~~~~~~~~

  }

  /** Enables tolltips
   *
   */
  ngAfterViewInit() {
    this.activateToolTips();
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
   * Load the project from the server if it is not available from sessionStorage
   */
  loadProjectFromServer() {
    const _id = this.getUserIdFromLocalStorage();
    this.userService.getProject(_id, this._projectId).subscribe(
      data => {
        if (data.success) {
          this.currentProject = data.project;
          this.loadSubjectsSummary();
          this.setTimingLimitsSlider();
          this.setLastTrainDate();
        } else {
          this.alertService.error(data.message, false, 3000);
          window.scrollTo(0, 0);
        }
      });
  }

  /**
   * Get the dashboard data from subjects from back-end wrapper
   */
  loadSubjectsSummary() {
    const user_id = this.getUserIdFromLocalStorage();
    this.userService.loadSubjectsSummary(user_id, this._projectId).subscribe(
      data => {
        if (data.success) {
          this.SubjectsSummary = data.summary;
          this.ProjectSummary = this.constructProjectSummary(data.summary);
          this.dashboardLoadingFlag = false;
          this.howManyAreUntrained();
          // console.log(data)
          // console.log(this.ProjectSummary);

        } else {

          if (data.val === 'no-subjects') {
            window.scrollTo(0, 0);
            this.alertService.warn('Heads Up: You don\'t have any dashboard data yet!', false, 2500);
            this.noSubjectsFlag = true;
            this.dashboardLoadingFlag = false;
          } else {
            this.alertService.error(data.message, false, 3000);
            this.noSubjectsFlag = true;
            this.dashboardLoadingFlag = false;
            window.scrollTo(0, 0);
          }

        }
        this.activateToolTips();
      });
  }

  /**
   * Given the subjects summary it constructs the projets summary
   */
  constructProjectSummary(subjects_summary) {
    const _tmp = { totalUsers: 0, totalKeystrokes: 0, lastKeystrokeDate: 0, totalRejections: 0, IsAuthEnabled: 0 }
    _tmp.totalUsers = subjects_summary.length;
    _tmp.totalKeystrokes = this.arrSum(subjects_summary.map(function (s) {
      return s.totalKeystrokes;
    }));
    const _t = subjects_summary.map(function (s) {
      return Number(s.lastKeystrokeDate);
    })
    _tmp.lastKeystrokeDate = this.arrMax(_t)
    _tmp.totalRejections = this.arrSum(subjects_summary.map(function (s) {
      return s.rejections;
    }));
    return _tmp;
  }

  /**
   * Train project
   */
  train() {

    const user_id = this.getUserIdFromLocalStorage();

    this.trainLoadingFlag = true;

    // Load limits from sliders
    this.currentProject.timing_limits.key_hold.min = this.timingLimits.keyHold[0];
    this.currentProject.timing_limits.key_hold.max = this.timingLimits.keyHold[1];
    this.currentProject.timing_limits.digraph_up_down.min = this.timingLimits.digraphUpDown[0];
    this.currentProject.timing_limits.digraph_up_down.max = this.timingLimits.digraphUpDown[1];

    // Send back the whole project with the new settings
    this.userService.train(user_id, this._projectId, this.currentProject).subscribe(
      data => {
        if (data.success) {
          this.trainLoadingFlag = false;
          console.log(data);
          window.scrollTo(0, 0);
          this.alertService.success(data.message, false, 2500);
          this.untrained = 0;
          for (let i = 0; i < this.SubjectsSummary.length; i++) {
            this.SubjectsSummary.isTrained = true;
          }
          this.currentProject.last_train_date = new Date();
          this.activateToolTips(1000);
        } else {
          this.trainLoadingFlag = false;
          console.log('Failed at loadSubjectsSummary()');
          console.log(data);
          window.scrollTo(0, 0);
          this.alertService.error('ERROR: ' + data.message, false, 3000);
        }
      });

  }

  /**
   *
   */
  changeProjectSettings() {
    const user_id = this.getUserIdFromLocalStorage();
    this.projectChangingFlag = true;
    this.userService.changeProject(user_id, this._projectId, this.currentProject).subscribe(
      data => {
        if (data.success) {
          this.onProjectSettingsChangeFlag = false;
          this.projectChangingFlag = false;
          this.activateSiteURLInputFlag = false;
          if (data.track_code_changed_flag) {
            this.currentProject.track_code = data.project.track_code;
          }
          window.scrollTo(0, 0);
          this.alertService.success(data.message, false, 2500);
        } else {
          this.onProjectSettingsChangeFlag = false;
          this.projectChangingFlag = false;
          console.log(data);
          window.scrollTo(0, 0);
          this.alertService.error('ERROR: ' + data.message, false, 3000);
        }
      });
  }

  /**
   * Toggle
   */
  toggleKeyguardAuthFlag() {
    this.currentProject.enable_keyguard_auth_flag = !this.currentProject.enable_keyguard_auth_flag;
  }

  /**
   * Delete All Subjects Data
   */
  deleteSubjects() {
    if (confirm('Are you sure?')) {
      const user_id = this.getUserIdFromLocalStorage();
      this.projectChangingFlag = true;
      this.userService.deleteSubjectsData(user_id, this._projectId).subscribe(
        data => {
          if (data.success) {
            this.projectChangingFlag = false;
            window.scrollTo(0, 0);
            this.alertService.success(data.message, false, 2500);
          } else {
            this.projectChangingFlag = false;
            console.log(data);
            window.scrollTo(0, 0);
            this.alertService.error('ERROR: ' + data.message, false, 3000);
          }
        }
      );
    }
  }

  /**
   * Delete one subject's data
   */
  deleteSubjectData(index) {
    if (confirm('Are you sure?')) {

      const subject_id = this.SubjectsSummary[index]._id;
      const user_id = this.getUserIdFromLocalStorage();

      this.userService.deleteSubjectData(user_id, subject_id, this._projectId).subscribe(
        data => {
          if (data.success) {
            if (data.train_date_reset) {
              this.SubjectsSummary = undefined; // clear it
              this.currentProject.lastTrainDate_genStat = '';
              window.scrollTo(0, 0);
              this.alertService.success('Subject deleted succesfully!', false, 1500);
              this.alertService.warn('Heads up you do not have any subjects data yet!', false, 2500);
            } else {
              this.dashboardLoadingFlag = true;
              this.SubjectsSummary = undefined;
              this.loadSubjectsSummary();
              window.scrollTo(0, 0);
              this.alertService.success('Subject deleted succesfully!', false, 2500);
            }
          } else {
            window.scrollTo(0, 0);
            this.alertService.error(data.message, false, 3000);
          }
        });
    }
  }

  /**
   * Download one subjects data
   */
  downloadSubjectsData(index) {

    const user_id = this.getUserIdFromLocalStorage();
    const subject_id = this.SubjectsSummary[index]._id;
    this.userService.downloadSubjectsData(user_id, subject_id, this._projectId);

  }


  /**
   * Sets training slider
   */
  setTimingLimitsSlider() {
    this.timingLimits.keyHold[0] = this.currentProject.timing_limits.key_hold.min;
    this.timingLimits.keyHold[1] = this.currentProject.timing_limits.key_hold.max;
    this.timingLimits.digraphUpDown[0] = this.currentProject.timing_limits.digraph_up_down.min;
    this.timingLimits.digraphUpDown[1] = this.currentProject.timing_limits.digraph_up_down.max;
  }
  /**
   *
   */
  setLastTrainDate() {
    if (this.currentProject.last_train_date === undefined) {
      this.currentProject.last_train_date = ''
    }
  }

  /** Calcs how many untrained
   *
   */
  howManyAreUntrained() {
    for (let i = 0; i < this.SubjectsSummary.length; i++) {
      if (this.SubjectsSummary[i].isTrained === false) {
        this.untrained++;
      }
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

  /**
   * Enables tooltips after fixed (default = 2) seconds
   */
  activateToolTips(ms = 2000) {
    setTimeout(function () { jQuery('[data-toggle="tooltip"]').tooltip(); }, ms);
  }


  /**
   * Activates subject name on hover
   */
  activateSubjectName(e, i) {
    jQuery(jQuery('.subject-name')[i]).css({ 'visibility': 'visible', 'left': e.layerX + 'px' });
    const that = this;
    setTimeout(function () {
      that.deactivateSubjectName(i);
    }, 1600)
  }
  /**
   * Deactivate subject name 
   */
  deactivateSubjectName(i) {
    jQuery(jQuery('.subject-name')[i]).css('visibility', 'hidden');
  }

  /**
   * Returns the sum of array
   */
  arrSum(arr) {
    let s = 0
    for (let i = 0; i < arr.length; i++) {
      s += arr[i];
    }
    return s
  }

  /**
   * Find the max of an array
   */
  arrMax(arr) {
    let max = -1;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > max) {
        max = arr[i]
      }
    }
    return max
  }

  /**
   * Format a digraph string, for example from KeyHKeyE -> he
   */
  formatMyDigraphStr(digraph) {
    let firstKey = '';
    let secondKey = '';
    let secondKeyIndexStart;
    // First key
    if (digraph.substr(0, 3) === 'Key') {
      // First key is a simple character
      firstKey = digraph[3].toLowerCase();
      secondKeyIndexStart = 4;
    } else {
      // First key is not a simple character
      for (let i = 1; i < digraph.length; i++) {
        if (digraph[i] === digraph[i].toUpperCase()) {
          secondKeyIndexStart = i;
          break;
        }
      }
      firstKey = digraph.substr(0, secondKeyIndexStart);
    }

    // Second key
    if (digraph.substr(secondKeyIndexStart, 3) === 'Key') {
      secondKey = digraph[digraph.length - 1].toLowerCase();
    } else {
      secondKey = digraph.substr(secondKeyIndexStart);
    }

    // Special cases for non space or backspace
    if (firstKey === 'Space') {
      firstKey = ' ';
    } else if (firstKey === 'Backspace') {
      firstKey = '<-'
    }
    if (secondKey === 'Space') {
      secondKey = ' ';
    } else if (secondKey === 'Backspace') {
      secondKey = '<-'
    }

    return firstKey + secondKey;
  }

  /**
   * Shows time below of date
   */
  showTimeBelowDate(dateStr) {
    const commaInd = dateStr.indexOf(',');
    return dateStr.substring(0, commaInd) + '\n' + dateStr.substr(commaInd + 1);
  }
}

