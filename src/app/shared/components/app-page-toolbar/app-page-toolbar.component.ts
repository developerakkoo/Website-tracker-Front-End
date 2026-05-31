import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-toolbar',
  templateUrl: './app-page-toolbar.component.html',
  styleUrls: ['./app-page-toolbar.component.scss'],
  standalone: false,
})
export class AppPageToolbarComponent {
  @Input() backHref = '';
  @Input() backLabel = 'Back';
  @Input() title = '';
  @Input() subtitle = '';
}
