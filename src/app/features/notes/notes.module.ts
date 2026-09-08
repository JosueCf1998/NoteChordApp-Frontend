import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { NotesPageRoutingModule } from './notes-routing.module';
import { NotesPage } from './pages/note-list/notes.page';
import { NoteEditorPage } from './pages/note-editor/note-editor.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, NotesPageRoutingModule, SharedModule],
  declarations: [NotesPage, NoteEditorPage]
})
export class NotesPageModule {}
