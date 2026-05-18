import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, MenuController, ToastController } from '@ionic/angular';
import { Auth } from 'src/app/services/auth';
import { ProjectContextService } from 'src/app/services/project-context.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit {
  _form!: FormGroup;

  constructor(
    private auth: Auth,
    private router: Router,
    private menuController: MenuController,
    private formBuilder: FormBuilder,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private projectContext: ProjectContextService
  ) {
    this.menuController.enable(false);
    this._form = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
    });
  }

  ngOnInit() {}

  async onSubmit() {
    if (!this._form.valid) return;

    const loading = await this.loadingController.create({
      message: 'Creating your account…',
    });
    await loading.present();

    this.auth.register(this._form.value).subscribe({
      next: async () => {
        await loading.dismiss();
        await this.projectContext.refreshProjects();
        const next = this.projectContext.resolveAfterLogin();
        if (next === 'picker') {
          void this.router.navigate(['/select-project']);
        } else if (next === 'projects') {
          void this.router.navigate(['/projects']);
        } else {
          void this.router.navigate(['/folder', 'Home']);
        }
      },
      error: async (error: HttpErrorResponse) => {
        await loading.dismiss();
        const message =
          error.error?.message || 'Could not create account. Please try again.';
        const toast = await this.toastController.create({
          message,
          duration: 3500,
          position: 'bottom',
          color: 'danger',
        });
        await toast.present();
      },
    });
  }
}
