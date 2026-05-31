import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProjectContextService } from 'src/app/services/project-context.service';
import { ProjectSession, SessionService } from 'src/app/services/session';
import {
  DEFAULT_SESSIONS_FILTERS,
  DEFAULT_SESSIONS_SORT,
  groupSessionsByDay,
  SessionDayGroup,
  SessionsFilterState,
  SessionsSortState,
} from 'src/app/utils/session-list.utils';

@Component({
  selector: 'app-sessions-hub',
  templateUrl: './sessions-hub.page.html',
  styleUrls: ['./sessions-hub.page.scss'],
  standalone: false,
})
export class SessionsHubPage implements OnInit, OnDestroy {
  projectName = '';
  items: ProjectSession[] = [];
  total = 0;
  page = 1;
  limit = 25;
  totalPages = 0;
  loading = true;
  error = '';
  filters: SessionsFilterState = { ...DEFAULT_SESSIONS_FILTERS };
  sort: SessionsSortState = { ...DEFAULT_SESSIONS_SORT };
  readonly pageSizeOptions = [10, 25, 50];

  private sub = new Subscription();

  constructor(
    public projectContext: ProjectContextService,
    private sessionService: SessionService,
    private router: Router
  ) {}

  get dateGroups(): SessionDayGroup[] {
    return groupSessionsByDay(this.items);
  }

  get rangeStart(): number {
    if (this.total === 0) return 0;
    return (this.page - 1) * this.limit + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.limit, this.total);
  }

  get canPrev(): boolean {
    return this.page > 1;
  }

  get canNext(): boolean {
    return this.page < this.totalPages;
  }

  ngOnInit(): void {
    this.sub.add(
      this.projectContext.activeProject$.subscribe(() => {
        this.page = 1;
        this.loadSessions();
      })
    );
    this.loadSessions();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  loadSessions(): void {
    const projectId = this.projectContext.activeProjectId;
    this.projectName = this.projectContext.activeProject?.name ?? '';
    if (!projectId) {
      this.loading = false;
      this.items = [];
      this.total = 0;
      return;
    }

    this.loading = true;
    this.error = '';
    this.sessionService
      .listProjectSessions(projectId, {
        page: this.page,
        limit: this.limit,
        sort: this.sort.field,
        order: this.sort.order,
        search: this.filters.search,
        datePreset: this.filters.datePreset,
        device: this.filters.device,
        minDuration: this.filters.minDurationMs,
        hasRrweb: this.filters.hasRrweb,
        hasRageClicks: this.filters.hasRageClicks,
        hasErrors: this.filters.hasErrors,
        starred: this.filters.starred,
        tag: this.filters.tag,
      })
      .subscribe({
        next: (res) => {
          this.items = res.items ?? [];
          this.total = res.total ?? 0;
          this.page = res.page ?? this.page;
          this.limit = res.limit ?? this.limit;
          this.totalPages = res.totalPages ?? 0;
          this.loading = false;
        },
        error: () => {
          this.error = 'Could not load recordings. Please try again.';
          this.items = [];
          this.total = 0;
          this.loading = false;
        },
      });
  }

  onFiltersChange(filters: SessionsFilterState): void {
    this.filters = filters;
    this.page = 1;
    this.loadSessions();
  }

  onSortChange(sort: SessionsSortState): void {
    this.sort = sort;
    this.page = 1;
    this.loadSessions();
  }

  onPageSizeChange(size: number): void {
    this.limit = size;
    this.page = 1;
    this.loadSessions();
  }

  prevPage(): void {
    if (!this.canPrev) return;
    this.page -= 1;
    this.loadSessions();
  }

  nextPage(): void {
    if (!this.canNext) return;
    this.page += 1;
    this.loadSessions();
  }

  trackByDateKey(_index: number, g: SessionDayGroup): string {
    return g.dateKey;
  }

  openReplay(session: ProjectSession): void {
    const id = session.sessionId;
    if (id) {
      void this.router.navigate(['/replay', id]);
    }
  }
}
