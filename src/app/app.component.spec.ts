import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';

import { AppComponent } from './app.component';
import { ThemeService } from './core/theme/theme.service';

describe('AppComponent', () => {
  const themeServiceMock = {
    appearance: 'system'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [
        { provide: ThemeService, useValue: themeServiceMock }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .overrideComponent(AppComponent, {
      set: { template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>' }
    })
    .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});
