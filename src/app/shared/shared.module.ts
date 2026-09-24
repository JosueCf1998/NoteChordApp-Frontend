import { NgModule } from '@angular/core';

import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { FloatingSearchActionComponent } from './components/floating-search-action/floating-search-action.component';
import { FullScreenLoaderComponent } from './components/full-screen-loader/full-screen-loader.component';
import { SwipeActionsComponent } from './components/swipe-actions/swipe-actions.component';
import { AnimatedPageTitleComponent } from './components/animated-page-title/animated-page-title.component';
import { GroupedListComponent } from './components/grouped-list/grouped-list.component';
import { TopNavbarComponent } from './components/top-navbar/top-navbar.component';
import { CustomAlertComponent } from './components/custom-alert/custom-alert.component';
import { NoteCountPipe, NoteDatePipe, NotePreviewPipe } from './pipes/note-format.pipe';

const SHARED_DIRECTIVES = [
  AnimatedPageTitleComponent,
  ConfirmModalComponent,
  CustomAlertComponent,
  FloatingSearchActionComponent,
  FullScreenLoaderComponent,
  GroupedListComponent,
  SwipeActionsComponent,
  TopNavbarComponent,
  NoteCountPipe,
  NoteDatePipe,
  NotePreviewPipe
];

@NgModule({
  imports: [...SHARED_DIRECTIVES],
  exports: [...SHARED_DIRECTIVES]
})
export class SharedModule {}
