import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { Data } from './data';
import { ProjectContextService } from './project-context.service';

interface AuthResponse {
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {

  private tokenKey = 'auth_token';

  private _authState = new BehaviorSubject<boolean | null>(null);
  public authState$ = this._authState.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private data: Data,
    private projectContext: ProjectContextService
  ) {
    this.init();
  }

  // 🔹 Initialize auth state on app load
  private async init() {
    const token = await this.data.get(this.tokenKey);
    this._authState.next(!!token);
  }

  // 🔹 Login
  login(body: any): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.API_URL}/auth/login`, body)
      .pipe(
        tap(async (res) => {
          await this.setSession(res.token);
        })
      );
  }

  // 🔹 Register
  register(body: any): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.API_URL}/auth/register`, body)
      .pipe(
        tap(async (res) => {
          await this.setSession(res.token);
        })
      );
  }

  // 🔹 Store Token
  private async setSession(token: string) {
    await this.data.add(this.tokenKey, token);
    this._authState.next(true);
  }

  // 🔹 Logout
  async logout() {
    await this.projectContext.clearActiveProject();
    await this.data.remove(this.tokenKey);
    this._authState.next(false);
    this.router.navigate(['/']);
  }

  // 🔹 Get Token
  async getToken(): Promise<string | null> {
    return await this.data.get(this.tokenKey);
  }

  // 🔹 Proper Auth Check
  async isAuthenticated(): Promise<boolean> {
    const token = await this.data.get(this.tokenKey);
    return !!token;
  }
}
