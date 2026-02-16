import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AddPage } from './add/add.page';
import { Projects } from 'src/app/services/projects';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.page.html',
  styleUrls: ['./projects.page.scss'],
  standalone:false
})
export class ProjectsPage implements OnInit {

  constructor(private router:Router,
              private projectsService: Projects,
              private modalController: ModalController
  ) { }

  ngOnInit() {
  }

  ionViewDidLoad(){
    this.loadProjects();
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
        
      },
      error:async (error:HttpErrorResponse) =>{
        console.log(error);
        
      }
    })
  }
}
