import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AppCardComponent } from './components/app-card/app-card.component';
import { AppKpiCardComponent } from './components/app-kpi-card/app-kpi-card.component';
import { AppTopbarComponent } from './components/app-topbar/app-topbar.component';
import { LineChartComponent } from './components/line-chart/line-chart.component';
import { SessionRecordingCardComponent } from './components/session-recording-card/session-recording-card.component';
import { AppPageToolbarComponent } from './components/app-page-toolbar/app-page-toolbar.component';
import { SessionsFilterBarComponent } from './components/sessions-filter-bar/sessions-filter-bar.component';
import { SessionsTableComponent } from './components/sessions-table/sessions-table.component';
import { SessionsDateGroupComponent } from './components/sessions-date-group/sessions-date-group.component';

const COMPONENTS = [
  AppCardComponent,
  AppKpiCardComponent,
  AppTopbarComponent,
  AppPageToolbarComponent,
  LineChartComponent,
  SessionRecordingCardComponent,
  SessionsFilterBarComponent,
  SessionsTableComponent,
  SessionsDateGroupComponent,
];

@NgModule({
  declarations: COMPONENTS,
  imports: [CommonModule, IonicModule, FormsModule],
  exports: COMPONENTS,
})
export class SharedModule {}
