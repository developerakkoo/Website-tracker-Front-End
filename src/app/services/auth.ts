import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Data } from './data';
import { ProjectContextService } from './project-context.service';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  private _authState = new BehaviorSubject<boolean | null>(null);
  public authState$ = this._authState.asObservable();

  private _currentUser = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this._currentUser.asObservable();

  private loggingOut = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private data: Data,
    private projectContext: ProjectContextService,
    private menuCtrl: MenuController
  ) {
    void this.init();
  }

  async init(): Promise<void> {
    await this.data.init();
    const token = await this.data.get(this.tokenKey);
    if (!token) {
      this._currentUser.next(null);
      this._authState.next(false);
      return;
    }
    const cached = await this.getCachedUser();
    if (cached) {
      this._currentUser.next(cached);
      this._authState.next(true);
    }
    try {
      await this.refreshSession();
    } catch {
      await this.clearSession(false);
      this._authState.next(false);
    }
  }

  login(body: { email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.API_URL}/auth/login`, body)
      .pipe(tap((res) => void this.applySession(res)));
  }

  register(body: { email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.API_URL}/auth/register`, body)
      .pipe(tap((res) => void this.applySession(res)));
  }

  refreshSession(): Promise<AuthUser> {
    return firstValueFrom(
      this.http.get<AuthUser>(`${environment.API_URL}/auth/me`)
    ).then(async (user) => {
      await this.data.add(this.userKey, user);
      this._currentUser.next(user);
      this._authState.next(true);
      return user;
    });
  }

  async logout(options?: { expired?: boolean }): Promise<void> {
    if (this.loggingOut) return;
    this.loggingOut = true;
    try {
      await this.menuCtrl.close('app-menu');
    } catch {
      /* ignore */
    }
    await this.clearSession(false);
    this._authState.next(false);
    await this.router.navigate(['/'], { replaceUrl: true });
    this.loggingOut = false;
    if (options?.expired) {
      // Toast shown by interceptor
    }
  }

  isLoggingOut(): boolean {
    return this.loggingOut;
  }

  async getToken(): Promise<string | null> {
    return (await this.data.get(this.tokenKey)) ?? null;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return this._currentUser.value ?? (await this.getCachedUser());
  }

  private async getCachedUser(): Promise<AuthUser | null> {
    const u = await this.data.get(this.userKey);
    return u && u.email ? u : null;
  }

  private async applySession(res: AuthResponse): Promise<void> {
    await this.data.add(this.tokenKey, res.token);
    await this.data.add(this.userKey, res.user);
    this._currentUser.next(res.user);
    this._authState.next(true);
  }

  private async clearSession(clearAllStorage: boolean): Promise<void> {
    await this.projectContext.clearActiveProject();
    await this.data.remove(this.tokenKey);
    await this.data.remove(this.userKey);
    this._currentUser.next(null);
    if (clearAllStorage) {
      await this.data.clearAll();
    }
  }
}
