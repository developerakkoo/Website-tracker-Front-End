import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GoalsHubPage } from './goals-hub.page';

const routes: Routes = [{ path: '', component: GoalsHubPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GoalsHubPageRoutingModule {}
