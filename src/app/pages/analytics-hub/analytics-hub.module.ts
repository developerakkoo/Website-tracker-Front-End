import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SharedModule } from 'src/app/shared/shared.module';
import { AnalyticsHubPageRoutingModule } from './analytics-hub-routing.module';
import { AnalyticsHubPage } from './analytics-hub.page';

@NgModule({
  imports: [CommonModule, IonicModule, SharedModule, AnalyticsHubPageRoutingModule],
  declarations: [AnalyticsHubPage],
})
export class AnalyticsHubPageModule {}
