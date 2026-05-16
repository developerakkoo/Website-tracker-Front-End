import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectContextService } from 'src/app/services/project-context.service';

@Component({
  selector: 'app-heatmaps-hub',
  templateUrl: './heatmaps-hub.page.html',
  styleUrls: ['./heatmaps-hub.page.scss'],
  standalone: false,
})
export class HeatmapsHubPage implements OnInit {
  constructor(
    private projectContext: ProjectContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const projectId = this.projectContext.activeProjectId;
    if (projectId) {
      void this.router.navigate(['/heatmaps', projectId], { replaceUrl: true });
    } else {
      void this.router.navigate(['/select-project'], { replaceUrl: true });
    }
  }
}
