import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProjectSession } from 'src/app/services/session';
import {
  deviceIconName,
  formatDeviceShort,
  formatWatchDuration,
  pagePathShort,
  pageTitleFromUrl,
  pagesLabel,
  pagesVisitedCount,
} from 'src/app/utils/session-display';
import { formatSessionTime, SessionsSortField, SessionsSortState } from 'src/app/utils/session-list.utils';

@Component({
  selector: 'app-sessions-table',
  templateUrl: './sessions-table.component.html',
  styleUrls: ['./sessions-table.component.scss'],
  standalone: false,
})
export class SessionsTableComponent {
  @Input() sessions: ProjectSession[] = [];
  @Input() sort: SessionsSortState = { field: 'startedAt', order: 'desc' };
  @Input() loading = false;
  @Input() skeletonRows = 5;

  @Output() sortChange = new EventEmitter<SessionsSortState>();
  @Output() rowClick = new EventEmitter<ProjectSession>();
  @Output() watchClick = new EventEmitter<ProjectSession>();

  get skeletonSlots(): number[] {
    return Array.from({ length: this.skeletonRows }, (_, i) => i);
  }

  trackBySessionId(_index: number, s: ProjectSession): string {
    return s.sessionId;
  }

  pageTitle(url?: string): string {
    return pageTitleFromUrl(url);
  }

  pagePath(url?: string): string {
    return pagePathShort(url);
  }

  timeLabel(iso: string): string {
    return formatSessionTime(iso);
  }

  durationLabel(ms: number): string {
    return formatWatchDuration(ms);
  }

  pagesText(session: ProjectSession): string {
    return pagesLabel(pagesVisitedCount(session));
  }

  deviceIcon(deviceType?: string): string {
    return deviceIconName(deviceType);
  }

  deviceLabel(deviceType?: string): string {
    return formatDeviceShort(deviceType);
  }

  isSortActive(field: SessionsSortField): boolean {
    return this.sort.field === field;
  }

  sortAria(field: SessionsSortField): string {
    if (!this.isSortActive(field)) return 'none';
    return this.sort.order === 'asc' ? 'ascending' : 'descending';
  }

  sortIcon(field: SessionsSortField): string {
    if (!this.isSortActive(field)) return 'swap-vertical-outline';
    return this.sort.order === 'asc' ? 'arrow-up-outline' : 'arrow-down-outline';
  }

  onHeaderClick(field: SessionsSortField, sortable: boolean): void {
    if (!sortable) return;
    if (this.sort.field === field) {
      const order = this.sort.order === 'desc' ? 'asc' : 'desc';
      this.sortChange.emit({ field, order });
    } else {
      this.sortChange.emit({ field, order: 'desc' });
    }
  }

  onRowClick(session: ProjectSession): void {
    this.rowClick.emit(session);
  }

  onWatch(session: ProjectSession, event: Event): void {
    event.stopPropagation();
    this.watchClick.emit(session);
  }
}
