import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { HeatmapsHubPageRoutingModule } from './heatmaps-hub-routing.module';
import { HeatmapsHubPage } from './heatmaps-hub.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    SharedModule,
    HeatmapsHubPageRoutingModule,
  ],
  declarations: [HeatmapsHubPage],
})
export class HeatmapsHubPageModule {}
