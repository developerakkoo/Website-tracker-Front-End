import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppCardComponent } from './components/app-card/app-card.component';
import { AppKpiCardComponent } from './components/app-kpi-card/app-kpi-card.component';
import { AppTopbarComponent } from './components/app-topbar/app-topbar.component';

const COMPONENTS = [AppCardComponent, AppKpiCardComponent, AppTopbarComponent];

@NgModule({
  declarations: COMPONENTS,
  imports: [CommonModule, IonicModule, FormsModule],
  exports: COMPONENTS,
})
export class SharedModule {}
