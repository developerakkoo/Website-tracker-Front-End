import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';
import { Auth } from '../services/auth';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private sessionExpiredToastShown = false;

  constructor(
    private auth: Auth,
    private toastCtrl: ToastController
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return from(this.auth.getToken()).pipe(
      switchMap((token) => {
        const authReq =
          token
            ? req.clone({
                setHeaders: { Authorization: `Bearer ${token}` },
              })
            : req;

        return next.handle(authReq).pipe(
          catchError((err: HttpErrorResponse) => {
            if (err.status === 401 && !this.isAuthAttempt(req.url)) {
              void this.handleUnauthorized();
            }
            return throwError(() => err);
          })
        );
      })
    );
  }

  private isAuthAttempt(url: string): boolean {
    return url.includes('/auth/login') || url.includes('/auth/register');
  }

  private async handleUnauthorized(): Promise<void> {
    if (this.auth.isLoggingOut()) return;
    await this.auth.logout({ expired: true });
    if (!this.sessionExpiredToastShown) {
      this.sessionExpiredToastShown = true;
      const t = await this.toastCtrl.create({
        message: 'Your session expired. Please sign in again.',
        duration: 3500,
        position: 'bottom',
        color: 'warning',
      });
      await t.present();
      setTimeout(() => {
        this.sessionExpiredToastShown = false;
      }, 4000);
    }
  }
}
