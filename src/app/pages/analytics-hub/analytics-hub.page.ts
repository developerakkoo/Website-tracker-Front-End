import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectContextService } from 'src/app/services/project-context.service';

@Component({
  selector: 'app-analytics-hub',
  templateUrl: './analytics-hub.page.html',
  styleUrls: ['./analytics-hub.page.scss'],
  standalone: false,
})
export class AnalyticsHubPage implements OnInit {
  constructor(
    private projectContext: ProjectContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const projectId = this.projectContext.activeProjectId;
    if (projectId) {
      void this.router.navigate(['/analytics', projectId], { replaceUrl: true });
    } else {
      void this.router.navigate(['/select-project'], { replaceUrl: true });
    }
  }
}
