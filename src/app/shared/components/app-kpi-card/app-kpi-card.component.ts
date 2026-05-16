import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  templateUrl: './app-kpi-card.component.html',
  styleUrls: ['./app-kpi-card.component.scss'],
  standalone: false,
})
export class AppKpiCardComponent {
  @Input() label = '';
  @Input() value: string | number = '—';
  @Input() hint = '';
  @Input() icon = 'analytics-outline';
  @Input() accent: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' = 'primary';
}
