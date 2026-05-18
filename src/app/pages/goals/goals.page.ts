import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';
import {
  GoalPageRow,
  GoalsService,
  GoalsSummary,
  GoalsTimeseries,
} from 'src/app/services/goals.service';
import { Projects } from 'src/app/services/projects';
import { ProjectContextService } from 'src/app/services/project-context.service';
import { Subject, catchError, finalize, forkJoin, of, takeUntil } from 'rxjs';

type DaysKey = '7D' | '30D' | '90D';

@Component({
  selector: 'app-goals',
  templateUrl: './goals.page.html',
  styleUrls: ['./goals.page.scss'],
  standalone: false,
})
export class GoalsPage implements OnInit, OnDestroy {
  projectId = '';
  projectName = '';
  selectedDaysKey: DaysKey = '7D';
  readonly daysMap: Record<DaysKey, number> = { '7D': 7, '30D': 30, '90D': 90 };

  isLoading = false;
  loadFailed = false;
  summary: GoalsSummary | null = null;
  timeseries: GoalsTimeseries | null = null;
  pages: GoalPageRow[] = [];
  selectedGoalKey = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private goals: GoalsService,
    private projects: Projects,
    private projectContext: ProjectContextService,
    private toastCtrl: ToastController
  ) {}

  get selectedDays(): number {
    return this.daysMap[this.selectedDaysKey];
  }

  get xLabelStep(): number {
    return this.selectedDays <= 7 ? 1 : 7;
  }

  get chartData() {
    return this.timeseries?.clicks || [];
  }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') || '';
    if (!this.projectId) return;

    this.projects.getProjectById(this.projectId).subscribe({
      next: (p) => {
        this.projectName = p?.name || 'Project';
        void this.projectContext.setActiveProject(p);
      },
    });

    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDaysChange(key: DaysKey): void {
    this.selectedDaysKey = key;
    this.load();
  }

  onGoalSelect(key: string): void {
    this.selectedGoalKey = key;
    this.loadTimeseriesAndPages();
  }

  load(): void {
    this.isLoading = true;
    this.loadFailed = false;

    this.goals
      .getSummary(this.projectId, this.selectedDays)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => {
          this.loadFailed = true;
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((summary) => {
        this.summary = summary;
        if (!summary?.goals?.length) {
          this.selectedGoalKey = '';
          this.timeseries = null;
          this.pages = [];
          return;
        }
        if (!this.selectedGoalKey || !summary.goals.some((g) => g.key === this.selectedGoalKey)) {
          this.selectedGoalKey = summary.goals[0].key;
        }
        this.loadTimeseriesAndPages();
      });
  }

  loadTimeseriesAndPages(): void {
    if (!this.projectId || !this.selectedGoalKey) return;

    forkJoin({
      timeseries: this.goals
        .getTimeseries(this.projectId, this.selectedGoalKey, this.selectedDays)
        .pipe(catchError(() => of(null))),
      pages: this.goals
        .getPages(this.projectId, this.selectedGoalKey, this.selectedDays)
        .pipe(catchError(() => of(null))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ timeseries, pages }) => {
        this.timeseries = timeseries;
        this.pages = pages?.pages || [];
      });
  }

  formatPct(n: number): string {
    return `${n}%`;
  }

  async copySnippet(key: string): Promise<void> {
    const goal = this.summary?.goals.find((g) => g.key === key);
    const snippet = this.goals.goalSnippet(key, goal?.name);
    try {
      await navigator.clipboard.writeText(snippet);
      await this.showToast('Snippet copied to clipboard', 'success');
    } catch {
      await this.showToast('Could not copy snippet', 'danger');
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2500, color, position: 'bottom' });
    await t.present();
  }
}
