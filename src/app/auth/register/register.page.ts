import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, ToastController, MenuController } from '@ionic/angular';
import { Auth } from 'src/app/services/auth';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone:false

})
export class RegisterPage implements OnInit {

  _form!:FormGroup;
  constructor(private auth:Auth,
              private router:Router,
              private menuController: MenuController,
              private formBuilder: FormBuilder,
              private loadingController: LoadingController,
              private toastController: ToastController
  ) { 
    this.menuController.enable(false);
    this._form = this.formBuilder.group({
      email:['',[Validators.required, Validators.email]],
      password:['',[Validators.required, Validators.min(4)]]
    });

  }

  ngOnInit() {
  }

  async onSubmit(){
    if(this._form.valid){
      console.log(this._form.value);

      let loading = await this.loadingController.create({
        message:"Registering you..."
      });

      await loading.present();
      this.auth.register(this._form.value)
      .subscribe({
        next:async(value:any) =>{
          console.log(value);
          await loading.dismiss();
          this.router.navigate(['']);
          
        },
        error:async(error:HttpErrorResponse) =>{
          console.log(error);
          await loading.dismiss();          
        }
      })

    }
  }
}
