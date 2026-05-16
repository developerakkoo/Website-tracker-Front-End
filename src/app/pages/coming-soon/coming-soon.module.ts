import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { ComingSoonPageRoutingModule } from './coming-soon-routing.module';
import { ComingSoonPage } from './coming-soon.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    RouterModule,
    SharedModule,
    ComingSoonPageRoutingModule,
  ],
  declarations: [ComingSoonPage],
})
export class ComingSoonPageModule {}
