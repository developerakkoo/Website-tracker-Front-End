import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  templateUrl: './app-card.component.html',
  styleUrls: ['./app-card.component.scss'],
  standalone: false,
})
export class AppCardComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() padding = true;
}
