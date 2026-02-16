import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, MenuController } from '@ionic/angular';
import { Auth } from 'src/app/services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone:false
})
export class LoginPage implements OnInit {

  _form!: FormGroup;
  constructor(private menuController: MenuController,
              private formBuilder: FormBuilder,
              private loadingController: LoadingController,
              private auth:Auth,
              private router:Router
  ) {
    this.menuController.enable(false);
    this._form = this.formBuilder.group({
      email: ['',[Validators.required, Validators.email]],
      password:['',[Validators.required, Validators.min(4)]]
    })
   }

  ngOnInit() {
  }

  async onSubmit(){
    if(this._form.valid){
      let loading = await this.loadingController.create({
        message:'Logging In...'
      })
      await loading.present();
      console.log(this._form.value);
      this.auth.login(this._form.value)
      .subscribe({
        next:async (value:any) =>{
          console.log(value);
          await loading.dismiss();
          this.router.navigate(['folder','Home']);
          
        },
        error:async (error:HttpErrorResponse) =>{
          console.log(error);
          await loading.dismiss();

          
        }
      })
    }
  }



}
