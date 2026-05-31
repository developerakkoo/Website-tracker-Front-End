import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  DEFAULT_SESSIONS_FILTERS,
  SessionsDatePreset,
  SessionsDeviceFilter,
  SessionsFilterState,
} from 'src/app/utils/session-list.utils';

@Component({
  selector: 'app-sessions-filter-bar',
  templateUrl: './sessions-filter-bar.component.html',
  styleUrls: ['./sessions-filter-bar.component.scss'],
  standalone: false,
})
export class SessionsFilterBarComponent implements OnInit, OnDestroy {
  @Input() filters: SessionsFilterState = { ...DEFAULT_SESSIONS_FILTERS };
  @Output() filtersChange = new EventEmitter<SessionsFilterState>();

  searchInput = '';
  private search$ = new Subject<string>();
  private sub = new Subscription();

  readonly datePresets: { value: SessionsDatePreset; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: 'all', label: 'All time' },
  ];

  readonly deviceOptions: { value: SessionsDeviceFilter; label: string }[] = [
    { value: '', label: 'All devices' },
    { value: 'desktop', label: 'Desktop' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'tablet', label: 'Tablet' },
  ];

  readonly durationOptions: { value: number; label: string }[] = [
    { value: 0, label: 'Any duration' },
    { value: 10000, label: '10 sec+' },
    { value: 30000, label: '30 sec+' },
    { value: 60000, label: '1 min+' },
  ];

  ngOnInit(): void {
    this.searchInput = this.filters.search;
    this.sub.add(
      this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((q) => {
        this.emit({ ...this.filters, search: q });
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  onSearchInput(value: string): void {
    this.searchInput = value;
    this.search$.next(value);
  }

  onDatePreset(value: SessionsDatePreset): void {
    this.emit({ ...this.filters, datePreset: value });
  }

  onDevice(value: SessionsDeviceFilter): void {
    this.emit({ ...this.filters, device: value });
  }

  onMinDuration(value: number): void {
    this.emit({ ...this.filters, minDurationMs: value });
  }

  toggleChip(key: 'hasRrweb' | 'hasRageClicks' | 'hasErrors' | 'starred'): void {
    this.emit({ ...this.filters, [key]: !this.filters[key] });
  }

  private emit(next: SessionsFilterState): void {
    this.filters = next;
    this.filtersChange.emit(next);
  }
}
