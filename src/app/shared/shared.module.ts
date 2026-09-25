import { NgModule } from '@angular/core';

import { FloatingSearchActionComponent } from './components/floating-search-action/floating-search-action.component';
import { FullScreenLoaderComponent } from './components/full-screen-loader/full-screen-loader.component';
import { SwipeActionsComponent } from './components/swipe-actions/swipe-actions.component';
import { AnimatedPageTitleComponent } from './components/animated-page-title/animated-page-title.component';
import { GroupedListComponent } from './components/grouped-list/grouped-list.component';
import { TopNavbarComponent } from './components/top-navbar/top-navbar.component';
import { BaseModalComponent } from './components/base-modal/base-modal.component';
import { ActionMenuComponent, ActionMenuItem, ActionMenuRole } from './components/action-menu/action-menu.component';
import { TransposeModalComponent } from './components/transpose-modal/transpose-modal.component';
import { NoteCountPipe, NoteDatePipe, NotePreviewPipe } from './pipes/note-format.pipe';

const SHARED_DIRECTIVES = [
  ActionMenuComponent,
  AnimatedPageTitleComponent,
  BaseModalComponent,
  FloatingSearchActionComponent,
  FullScreenLoaderComponent,
  GroupedListComponent,
  SwipeActionsComponent,
  TopNavbarComponent,
  TransposeModalComponent,
  NoteCountPipe,
  NoteDatePipe,
  NotePreviewPipe
];

@NgModule({
  imports: [...SHARED_DIRECTIVES],
  exports: [...SHARED_DIRECTIVES]
})
export class SharedModule {}

export { ActionMenuComponent, ActionMenuItem, ActionMenuRole } from './components/action-menu/action-menu.component';
export { TransposeModalComponent } from './components/transpose-modal/transpose-modal.component';
