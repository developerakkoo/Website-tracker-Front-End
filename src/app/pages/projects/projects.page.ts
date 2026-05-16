import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AddPage } from './add/add.page';
import { Projects } from 'src/app/services/projects';
import { ProjectContextService } from 'src/app/services/project-context.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.page.html',
  styleUrls: ['./projects.page.scss'],
  standalone:false
})
export class ProjectsPage implements OnInit {

  projects:any[] = [];
  activeProjectId: string | null = null;

  constructor(
    private router: Router,
    private projectsService: Projects,
    private modalController: ModalController,
    private projectContext: ProjectContextService
  ) {}

  ngOnInit() {
    this.activeProjectId = this.projectContext.activeProjectId;
    this.loadProjects();
  }

  ionViewWillEnter() {
    this.activeProjectId = this.projectContext.activeProjectId;
    this.loadProjects();
  }

  async navigateToDetails(project: { _id: string; name?: string }) {
    await this.projectContext.setActiveProject(project);
    this.activeProjectId = project._id;
    void this.router.navigate(['/projects/details', project._id]);
  }

  isActiveProject(projectId: string): boolean {
    return this.activeProjectId === projectId;
  }
async presentNewProjectCreateModal() {
  const modal = await this.modalController.create({
  component: AddPage,
  });

  await modal.present();

  const data = await modal.onDidDismiss();
  console.log("Add modal dismissed");
  
  console.log(data)
  this.loadProjects();

}

  async loadProjects(){
    this.projectsService.getUserProjects()
    .subscribe({
      next:async (value:any) =>{
        console.log(value);
        this.projects = value;
        
      },
      error:async (error:HttpErrorResponse) =>{
        console.log(error);
        this.projects = [];
        
      }
    })
  }
}
