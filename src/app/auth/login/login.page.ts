import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { LoadingController, MenuController, ToastController } from '@ionic/angular';
import { Auth } from 'src/app/services/auth';
import { ProjectContextService } from 'src/app/services/project-context.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!password || !confirm) return null;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  _form!: FormGroup;
  resetForm!: FormGroup;
  showForgotPassword = false;

  constructor(
    private menuController: MenuController,
    private formBuilder: FormBuilder,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private auth: Auth,
    private router: Router,
    private projectContext: ProjectContextService
  ) {
    this.menuController.enable(false);
    this._form = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
    });
    this.resetForm = this.formBuilder.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(4)]],
        confirmPassword: ['', [Validators.required, Validators.minLength(4)]],
      },
      { validators: passwordsMatch }
    );
  }

  ngOnInit() {}

  showLoginForm(): void {
    this.showForgotPassword = false;
  }

  showResetForm(): void {
    const email = this._form.get('email')?.value;
    if (email) {
      this.resetForm.patchValue({ email });
    }
    this.showForgotPassword = true;
  }

  async onSubmit() {
    if (!this._form.valid) return;

    const loading = await this.loadingController.create({
      message: 'Logging in…',
    });
    await loading.present();

    this.auth.login(this._form.value).subscribe({
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
          error.error?.message || 'Invalid email or password. Please try again.';
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

  async onResetPassword() {
    if (!this.resetForm.valid) return;

    const loading = await this.loadingController.create({
      message: 'Updating password…',
    });
    await loading.present();

    const { email, password } = this.resetForm.value;
    this.auth.resetPassword({ email, password }).subscribe({
      next: async () => {
        await loading.dismiss();
        this._form.patchValue({ email, password: '' });
        this.resetForm.reset();
        this.showForgotPassword = false;
        const toast = await this.toastController.create({
          message: 'Password updated. You can sign in with your new password.',
          duration: 4000,
          position: 'bottom',
          color: 'success',
        });
        await toast.present();
      },
      error: async (error: HttpErrorResponse) => {
        await loading.dismiss();
        const message =
          error.error?.message || 'Could not update password. Please try again.';
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
