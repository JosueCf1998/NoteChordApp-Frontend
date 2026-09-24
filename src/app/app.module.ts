import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { ServiceWorkerModule } from '@angular/service-worker';
import { appPageTransition } from './core/navigation/page-transition';

import { FolderRepository } from './core/repositories/folder.repository';
import { FirestoreFolderRepository } from './core/repositories/firestore-folder.repository';
import { NoteRepository } from './core/repositories/note.repository';
import { FirestoreNoteRepository } from './core/repositories/firestore-note.repository';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot({
      swipeBackEnabled: true,
      animated: true,
      backButtonText: '',
      navAnimation: appPageTransition
    }),
    AppRoutingModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: FolderRepository, useClass: FirestoreFolderRepository },
    { provide: NoteRepository, useClass: FirestoreNoteRepository }
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
