import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProjectSession } from 'src/app/services/session';
import {
  deviceIconName,
  formatRelativeTime,
  formatWatchDuration,
  pagePathShort,
  pageTitleFromUrl,
  pagesLabel,
  pagesVisitedCount,
} from 'src/app/utils/session-display';

@Component({
  selector: 'app-session-recording-card',
  templateUrl: './session-recording-card.component.html',
  styleUrls: ['./session-recording-card.component.scss'],
  standalone: false,
})
export class SessionRecordingCardComponent {
  @Input() session!: ProjectSession;
  @Input() skeleton = false;
  @Output() play = new EventEmitter<ProjectSession>();

  get title(): string {
    return pageTitleFromUrl(this.session?.url);
  }

  get pathHint(): string {
    return pagePathShort(this.session?.url);
  }

  get relativeTime(): string {
    return formatRelativeTime(this.session?.startedAt);
  }

  get durationLabel(): string {
    return formatWatchDuration(this.session?.duration);
  }

  get pagesText(): string {
    return pagesLabel(pagesVisitedCount(this.session || {}));
  }

  get deviceIcon(): string {
    return deviceIconName(this.session?.deviceType);
  }

  get fullUrl(): string {
    return this.session?.url || '';
  }

  onPlay(): void {
    if (this.session) this.play.emit(this.session);
  }
}
