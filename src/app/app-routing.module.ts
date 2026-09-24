import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/splash/splash.page').then((m) => m.SplashPage),
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./features/folders/folders.page').then((m) => m.FoldersPage),
    canActivate: [authGuard]
  },
  {
    path: 'notes-list/:folderId',
    loadComponent: () => import('./features/notes-list/notes-list.page').then((m) => m.NotesListPage),
    canActivate: [authGuard]
  },
  {
    path: 'notes/:folderId/:noteId',
    loadComponent: () => import('./features/notes/notes.page').then((m) => m.NotesPage),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage),
    canActivate: [authGuard]
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search.page').then((m) => m.SearchPage),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
