import { Injectable } from '@angular/core';
import { Http, Headers, Response } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map'

@Injectable()
export class AuthenticationService {
    constructor(private http: Http) { }

    login(username: string, password: string) {
        const headers = new Headers();
        headers.append('Content-Type', 'application/json' );
        // console.log('post request with: ' + JSON.stringify({ username: username, password: password }));
        return this.http.post('/api/authenticate', JSON.stringify({ username: username, password: password }),{headers: headers})
            .map((response: Response) =>{
                // login successful if there's a jwt token in the response
                //  console.log(response.json().message);
                let user = response.json();
                console.log('apantisi apton server sto authenticate:', user);
                if (user && user.token) {
                    // store user details and jwt token in local storage to keep user logged in between page refreshes
                    localStorage.setItem('currentUser', JSON.stringify(user));
                }
                return response.json(); // return the observable (as response.json)
            });


    }

    logout() {
        // remove user from local storage to log user out
        localStorage.removeItem('currentUser');

    }

    // Checks if a user is logged in by looking at local stoarage.

    // ALLAZW GIA DEBBUGGING TO TRUE ME FALSE!!
    isUserLoggedIn() {
        if (localStorage.getItem('currentUser')) {
            return true;
        }else {
            return false;
        }
    }
}

// The authentication service is used to login and logout of the application,
// to login it posts the users credentials to the api and checks the response for a JWT token,
// if there is one it means authentication was successful so the user details including the
// token are added to local storage.

// The logged in user details are stored in local storage so the user will stay logged in if
//  they refresh the browser and also between browser sessions until they logout. If you don't
//  want the user to stay logged in between refreshes or sessions the behaviour could easily be
//  changed by storing user details somewhere less persistent such as session storage or in a property
//   of the authentication service.