import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

const TITLES: Record<string, string> = {
  funnels: 'Funnels',
  journeys: 'User journeys',
  'ai-insights': 'AI insights',
  alerts: 'Alerts',
  settings: 'Settings',
};

@Component({
  selector: 'app-coming-soon',
  templateUrl: './coming-soon.page.html',
  styleUrls: ['./coming-soon.page.scss'],
  standalone: false,
})
export class ComingSoonPage implements OnInit {
  title = 'Coming soon';
  blurb =
    'We’re building this for your workspace. You’ll get analytics-grade workflows without leaving this dashboard.';

  constructor(private router: Router) {}

  ngOnInit(): void {
    const seg = (this.router.url.split('?')[0].split('/').filter(Boolean)[0] || '').toLowerCase();
    if (TITLES[seg]) {
      this.title = TITLES[seg];
    }
  }
}
