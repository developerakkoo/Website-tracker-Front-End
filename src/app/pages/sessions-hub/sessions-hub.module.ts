import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { SessionsHubPageRoutingModule } from './sessions-hub-routing.module';
import { SessionsHubPage } from './sessions-hub.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    SharedModule,
    SessionsHubPageRoutingModule,
  ],
  declarations: [SessionsHubPage],
})
export class SessionsHubPageModule {}
