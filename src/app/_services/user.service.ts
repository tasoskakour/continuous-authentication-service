import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';

import { User } from '../_models/index';

@Injectable()
export class UserService {
    constructor(private http: Http) { }

    getAll() {
        return this.http.get('/api/users', this.jwt()).map((response: Response) => response.json());
    }

    getById(id: number) {
        return this.http.get('/api/users/' + id, this.jwt()).map((response: Response) => response.json());
    }

    create(user: User) {
        return this.http.post('/api/users', user, this.jwt()).map((response: Response) => response.json());
    }

    update(user: User) {
        return this.http.put('/api/users/' + user._id, user, this.jwt()).map((response: Response) => response.json());
    }

    delete(id: number) {
        return this.http.delete('/api/users/' + id, this.jwt()).map((response: Response) => response.json());
    }

    createProject(user_id: string, siteurl: any) {
        return this.http.post('/api/project/' + user_id,
            { siteurl: siteurl }, this.jwt()).map((response: Response) => response.json());
    }

    getProject(user_id: string, project_id: string) {
        return this.http.get('/api/project/' + user_id + '/' + project_id, this.jwt()).map((response: Response) => response.json());
    }

    deleteProject(user_id: string, project_id: string) {
        return this.http.delete('/api/project/' + user_id + '/' + project_id, this.jwt()).map((response: Response) => response.json());
    }

    loadProjects(id: string) {
        return this.http.get('/api/projects/' + id, this.jwt()).map((response: Response) => response.json());
    }

    loadDashboardData(user_id: string, project_id: string) {
        return this.http.get('/api/dashboard_data/' + user_id + '/' + project_id, this.jwt()).map((response: Response) => response.json());
    }

    loadSubjectsSummary(user_id: string, project_id: string) {
        return this.http.get('/dash/get-subjects-summary/' + user_id + '/'
            + project_id, this.jwt()).map((response: Response) => response.json());
    }

    train(user_id: string, project_id: string, currentProject: any) {
        return this.http.post('/dash/train/' + user_id + '/' + project_id,
            { project: currentProject }, this.jwt()).map((response: Response) => response.json());
    }

    changeProject(user_id: string, project_id: string, project: any) {
        return this.http.put('/api/project/' + user_id + '/' + project_id, { project: project },
            this.jwt()).map((response: Response) => response.json());
    }

    deleteSubjectsData(user_id: string, project_id: string) {
        return this.http.delete('/api/dashboard_data/' + user_id + '/' + project_id,
            this.jwt()).map((response: Response) => response.json());
    }

    deleteSubjectData(user_id: string, subject_id: string, project_id: string) {
        return this.http.delete('/api/subject_data/' + user_id + '/' + subject_id + '/' + project_id,
            this.jwt()).map((response: Response) => response.json());
    }

    downloadSubjectsData(user_id: string, subject_id: string, project_id: string) {
        // browser redirect to download file EDW isws to project_id eine axristo
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.token) {
            window.location.href =
                window.location.origin + '/api/subject_data/'
                + user_id + '/' + subject_id + '/' + project_id + '?token=' + currentUser.token;
        }
    }

    getSubjectsGMMData(user_id: string, subject_id: string) {
        return this.http.get('/api/gmm_data/' + user_id + '/' + subject_id, this.jwt()).map((response: Response) => response.json());
    }




    // private helper methods

    private jwt() {
        // create authorization header with jwt token
        // console.log('inside jwt()');
        // console.log(JSON.parse(localStorage.getItem('currentUser')));
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.token) {
            const headers = new Headers();
            headers.append('x-access-token', currentUser.token);
            return new RequestOptions({ headers: headers });
        }
    }
}

// The user service contains a standard set of CRUD methods for managing users,
//  it contains a jwt() method that's used to add the JWT token from local storage to
//   the Authorization header of each http request.