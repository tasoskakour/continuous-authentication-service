import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { GlobalEventsManagerService } from '../_services/global-events-manager.service';


@Injectable()
export class AuthGuard implements CanActivate {

    constructor(private router: Router) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot ) {
        if (localStorage.getItem('currentUser')) {
            return true;
        }

        this.router.navigate(['/login'], { queryParams: { returnUrl: state.url }});
        return false;
    }
}

// The auth guard is used to prevent unauthenticated users from accessing restricted routes,
// in this example it's used in app.routing.ts to protect the home page route.
//  For more information
// about angular 2 guards you can check out this post on the thoughtram blog.