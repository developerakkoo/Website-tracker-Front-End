import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { filter, from, map, switchMap, take } from 'rxjs';
import { Auth } from '../services/auth';
import { ProjectContextService } from '../services/project-context.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private auth: Auth,
    private router: Router,
    private projectContext: ProjectContextService
  ) {}

  canActivate() {
    return this.auth.authState$.pipe(
      filter((state): state is boolean => state !== null),
      take(1),
      switchMap((isLoggedIn) => {
        if (!isLoggedIn) {
          void this.router.navigate(['/']);
          return from([false]);
        }
        return from(this.projectContext.initFromStorage()).pipe(map(() => true));
      })
    );
  }
}
