import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnalyticsHubPage } from './analytics-hub.page';

const routes: Routes = [{ path: '', component: AnalyticsHubPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AnalyticsHubPageRoutingModule {}
