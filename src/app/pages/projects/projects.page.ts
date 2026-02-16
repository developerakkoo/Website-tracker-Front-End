import { Component, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { AddPage } from './add/add.page';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.page.html',
  styleUrls: ['./projects.page.scss'],
  standalone:false
})
export class ProjectsPage implements OnInit {

  constructor(private router:Router,
              private modalController: ModalController
  ) { }

  ngOnInit() {
  }

async presentNewProjectCreateModal() {
  const modal = await this.modalController.create({
  component: AddPage,
  });

  await modal.present();

  const data = await modal.onDidDismiss();
  console.log("Add modal dismissed");
  
  console.log(data)

}

  async loadProjects(){

  }
}
