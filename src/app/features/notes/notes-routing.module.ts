import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { NotesPage } from './pages/note-list/notes.page';
import { NoteEditorPage } from './pages/note-editor/note-editor.page';

const routes: Routes = [
  {
    path: '',
    component: NotesPage
  },
  {
    path: ':noteId',
    component: NoteEditorPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NotesPageRoutingModule {}
