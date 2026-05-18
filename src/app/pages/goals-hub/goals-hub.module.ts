import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { GoalsHubPageRoutingModule } from './goals-hub-routing.module';
import { GoalsHubPage } from './goals-hub.page';

@NgModule({
  imports: [CommonModule, IonicModule, GoalsHubPageRoutingModule],
  declarations: [GoalsHubPage],
})
export class GoalsHubPageModule {}
