import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from './services/auth';
import { ProjectContextService } from './services/project-context.service';

@Injectable({
  providedIn: 'root',
})
export class GuestGuard implements CanActivate {
  constructor(
    private auth: Auth,
    private router: Router,
    private projectContext: ProjectContextService
  ) {}

  async canActivate(): Promise<boolean> {
    const isAuth = await this.auth.isAuthenticated();

    if (isAuth) {
      await this.projectContext.initFromStorage();
      await this.projectContext.refreshProjects();
      const next = this.projectContext.resolveAfterLogin();
      if (next === 'picker') {
        void this.router.navigate(['/select-project']);
      } else if (next === 'projects') {
        void this.router.navigate(['/projects']);
      } else {
        void this.router.navigate(['/folder', 'Home']);
      }
      return false;
    }

    return true;
  }
}
