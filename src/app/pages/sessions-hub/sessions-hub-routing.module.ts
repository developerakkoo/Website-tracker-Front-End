import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SessionsHubPage } from './sessions-hub.page';

const routes: Routes = [{ path: '', component: SessionsHubPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SessionsHubPageRoutingModule {}
