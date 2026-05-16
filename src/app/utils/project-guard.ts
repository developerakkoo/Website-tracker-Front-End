import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { ProjectContextService } from '../services/project-context.service';

const PROJECT_OPTIONAL_PREFIXES = ['/projects', '/select-project'];

@Injectable({
  providedIn: 'root',
})
export class ProjectGuard implements CanActivate {
  constructor(
    private projectContext: ProjectContextService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean | UrlTree> {
    await this.projectContext.initFromStorage();

    if (this.projectContext.hasActiveProject()) {
      return true;
    }

    const url = this.router.url.split('?')[0];
    if (PROJECT_OPTIONAL_PREFIXES.some((p) => url === p || url.startsWith(p + '/'))) {
      return true;
    }

    return this.router.createUrlTree(['/select-project']);
  }
}
