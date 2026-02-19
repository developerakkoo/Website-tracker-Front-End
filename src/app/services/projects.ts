import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Auth } from './auth';
import { environment } from 'src/environments/environment.prod';

export interface ProjectStatus {
  installed: boolean;
  lastSeen: string | null;
  lastUrl: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class Projects {
  
  
  constructor(private Http: HttpClient,
              private auth:Auth
  ){}

  
  createNewProject(body:any){
    return this.Http.post(environment.API_URL + '/projects/',body);
  }
  
  getUserProjects(){
    return this.Http.get<any[]>(environment.API_URL + '/projects/');
  }

  getProjectById(projectId: string): Observable<any>{
    return this.Http.get<any>(environment.API_URL + '/projects/' + projectId);
  }

  getProjectStatus(projectId: string): Observable<ProjectStatus>{
    return this.Http.get<ProjectStatus>(environment.API_URL + '/projects/' + projectId + '/status');
  }

}
