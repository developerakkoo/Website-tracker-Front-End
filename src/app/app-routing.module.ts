import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './utils/auth-guard';
import { ProjectGuard } from './utils/project-guard';
import { GuestGuard } from './guest-guard';

const routes: Routes = [
  {
    path: 'Home',
    redirectTo: 'folder/Home',
    pathMatch: 'full',
  },
  {
    path: 'select-project',
    loadChildren: () =>
      import('./pages/select-project/select-project.module').then((m) => m.SelectProjectPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'folder/:id',
    loadChildren: () => import('./folder/folder.module').then((m) => m.FolderPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: '',
    loadChildren: () => import('./auth/login/login.module').then((m) => m.LoginPageModule),
    canActivate: [GuestGuard],
  },
  {
    path: 'register',
    loadChildren: () => import('./auth/register/register.module').then((m) => m.RegisterPageModule),
    canActivate: [GuestGuard],
  },
  {
    path: 'projects',
    loadChildren: () => import('./pages/projects/projects.module').then((m) => m.ProjectsPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'sessions',
    loadChildren: () => import('./pages/sessions-hub/sessions-hub.module').then((m) => m.SessionsHubPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: 'analytics',
    loadChildren: () =>
      import('./pages/analytics-hub/analytics-hub.module').then((m) => m.AnalyticsHubPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: 'analytics/:projectId',
    loadChildren: () =>
      import('./pages/analytics/analytics.module').then((m) => m.AnalyticsPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: 'goals',
    loadChildren: () =>
      import('./pages/goals-hub/goals-hub.module').then((m) => m.GoalsHubPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: 'goals/:projectId',
    loadChildren: () => import('./pages/goals/goals.module').then((m) => m.GoalsPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: 'heatmaps',
    loadChildren: () => import('./pages/heatmaps-hub/heatmaps-hub.module').then((m) => m.HeatmapsHubPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: 'heatmaps/:projectId',
    loadChildren: () => import('./pages/heatmap/heatmap.module').then((m) => m.HeatmapPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: 'replay/:sessionId',
    loadChildren: () => import('./pages/replay/replay.module').then((m) => m.ReplayPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: 'funnels',
    loadChildren: () => import('./pages/coming-soon/coming-soon.module').then((m) => m.ComingSoonPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: 'journeys',
    loadChildren: () => import('./pages/coming-soon/coming-soon.module').then((m) => m.ComingSoonPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: 'ai-insights',
    loadChildren: () => import('./pages/coming-soon/coming-soon.module').then((m) => m.ComingSoonPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: 'alerts',
    loadChildren: () => import('./pages/coming-soon/coming-soon.module').then((m) => m.ComingSoonPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
  {
    path: 'settings',
    loadChildren: () => import('./pages/coming-soon/coming-soon.module').then((m) => m.ComingSoonPageModule),
    canActivate: [AuthGuard, ProjectGuard],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
