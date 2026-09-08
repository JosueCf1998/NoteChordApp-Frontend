import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CustomAlertComponent } from './custom-alert.component';

describe('CustomAlertComponent', () => {
  let component: CustomAlertComponent;
  let fixture: ComponentFixture<CustomAlertComponent>;
  let modalCtrlMock: { dismiss: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    modalCtrlMock = {
      dismiss: vi.fn().mockResolvedValue(true)
    };

    await TestBed.configureTestingModule({
      declarations: [CustomAlertComponent],
      providers: [
        { provide: ModalController, useValue: modalCtrlMock }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dismiss with false on cancel', async () => {
    await component.cancel();
    expect(modalCtrlMock.dismiss).toHaveBeenCalledWith(false, 'cancel');
  });

  it('should dismiss with true on confirm', async () => {
    await component.confirm();
    expect(modalCtrlMock.dismiss).toHaveBeenCalledWith(true, 'confirm');
  });
});

