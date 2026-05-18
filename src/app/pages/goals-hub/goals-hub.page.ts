import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectContextService } from 'src/app/services/project-context.service';

@Component({
  selector: 'app-goals-hub',
  templateUrl: './goals-hub.page.html',
  styleUrls: ['./goals-hub.page.scss'],
  standalone: false,
})
export class GoalsHubPage implements OnInit {
  constructor(
    private projectContext: ProjectContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const projectId = this.projectContext.activeProjectId;
    if (projectId) {
      void this.router.navigate(['/goals', projectId], { replaceUrl: true });
    } else {
      void this.router.navigate(['/select-project'], { replaceUrl: true });
    }
  }
}
