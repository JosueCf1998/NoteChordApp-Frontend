import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FoldersPage } from './folders.page';

const routes: Routes = [
  {
    path: '',
    component: FoldersPage,
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FoldersPageRoutingModule {}
