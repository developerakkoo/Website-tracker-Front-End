import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Projects } from 'src/app/services/projects';

@Component({
  selector: 'app-add',
  templateUrl: './add.page.html',
  styleUrls: ['./add.page.scss'],
  standalone:false
})
export class AddPage implements OnInit {

  form!:FormGroup;
  constructor(private formBuilder: FormBuilder,
              private loadingController: LoadingController,
              private toastController: ToastController,
              private projectsService:Projects,
              private modalController: ModalController
  ) {
    this.form = this.formBuilder.group({
      name:['',[Validators.required]]
    })
   }

  ngOnInit() {
  }

  dismiss(){
    this.modalController.dismiss();
  }
  async onSubmit(){
    if(this.form.valid){
      console.log(this.form.value);
      let loading = await this.loadingController.create({
        message:"Creating project..."
      });

      await loading.present();

      this.projectsService.createNewProject(this.form.value)
      .subscribe({
        next:async (value:any) =>{
          await loading.dismiss();
          console.log(value);
          this.modalController.dismiss();
          
        },
        error:async(error:HttpErrorResponse) =>{
          await loading.dismiss();
          console.log(error);
          
        }
          })
    }
  }
}
