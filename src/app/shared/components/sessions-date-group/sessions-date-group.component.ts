import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProjectSession } from 'src/app/services/session';
import { SessionDayGroup, SessionsSortState } from 'src/app/utils/session-list.utils';

@Component({
  selector: 'app-sessions-date-group',
  templateUrl: './sessions-date-group.component.html',
  styleUrls: ['./sessions-date-group.component.scss'],
  standalone: false,
})
export class SessionsDateGroupComponent {
  @Input() group!: SessionDayGroup;
  @Input() sort: SessionsSortState = { field: 'startedAt', order: 'desc' };
  @Output() sortChange = new EventEmitter<SessionsSortState>();
  @Output() rowClick = new EventEmitter<ProjectSession>();
  @Output() watchClick = new EventEmitter<ProjectSession>();

  get countLabel(): string {
    const n = this.group?.sessions?.length ?? 0;
    return n === 1 ? '1 recording' : `${n} recordings`;
  }
}
