import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/access/splash/splash.module').then((m) => m.SplashPageModule),
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./features/access/login/login.module').then((m) => m.LoginPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./features/folders/pages/folders/folders.module').then((m) => m.FoldersPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'notes/:folderId',
    loadChildren: () => import('./features/notes/notes.module').then((m) => m.NotesPageModule),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadChildren: () => import('./features/settings/pages/settings/settings.module').then((m) => m.SettingsPageModule),
    canActivate: [authGuard]
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
