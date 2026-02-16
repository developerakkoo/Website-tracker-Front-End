import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Auth } from './auth';
import { environment } from 'src/environments/environment.prod';

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
    return this.Http.get(environment.API_URL + '/projects/');
  }



}
