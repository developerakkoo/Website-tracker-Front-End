import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HeatmapsHubPage } from './heatmaps-hub.page';

const routes: Routes = [{ path: '', component: HeatmapsHubPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HeatmapsHubPageRoutingModule {}
