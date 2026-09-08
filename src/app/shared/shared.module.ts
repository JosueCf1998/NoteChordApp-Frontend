import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { FloatingSearchActionComponent } from './components/floating-search-action/floating-search-action.component';
import { FullScreenLoaderComponent } from './components/full-screen-loader/full-screen-loader.component';
import { SwipeActionsComponent } from './components/swipe-actions/swipe-actions.component';
import { AnimatedPageTitleComponent } from './components/animated-page-title/animated-page-title.component';
import { GroupedListComponent } from './components/grouped-list/grouped-list.component';
import { TopNavbarComponent } from './components/top-navbar/top-navbar.component';
import { NoteCountPipe, NoteDatePipe, NotePreviewPipe } from './pipes/note-format.pipe';

@NgModule({
  declarations: [
    AnimatedPageTitleComponent,
    ConfirmModalComponent,
    FloatingSearchActionComponent,
    FullScreenLoaderComponent,
    GroupedListComponent,
    SwipeActionsComponent,
    TopNavbarComponent,
    NoteCountPipe,
    NoteDatePipe,
    NotePreviewPipe
  ],
  imports: [CommonModule, IonicModule],
  exports: [
    AnimatedPageTitleComponent,
    ConfirmModalComponent,
    FloatingSearchActionComponent,
    FullScreenLoaderComponent,
    GroupedListComponent,
    SwipeActionsComponent,
    TopNavbarComponent,
    NoteCountPipe,
    NoteDatePipe,
    NotePreviewPipe
  ]
})
export class SharedModule {}
