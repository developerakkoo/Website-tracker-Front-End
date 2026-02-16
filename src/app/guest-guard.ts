import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from './services/auth';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {

  constructor(private auth: Auth, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const isAuth = await this.auth.isAuthenticated();

    if (isAuth) {
      this.router.navigate(['/folder', 'Home']);
      return false;
    }

    return true;
  }
}
