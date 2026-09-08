import { TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DialogService } from './dialog.service';

describe('DialogService', () => {
  let service: DialogService;
  let modalCtrlMock: { create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    modalCtrlMock = {
      create: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        DialogService,
        { provide: ModalController, useValue: modalCtrlMock }
      ]
    });

    service = TestBed.inject(DialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should present confirm modal and return true when confirmed', async () => {
    const modalElementMock = {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: true })
    };
    modalCtrlMock.create.mockResolvedValue(modalElementMock);

    const result = await service.confirm({
      title: 'Cerrar sesión',
      message: '¿Estás seguro?',
      confirmText: 'Salir',
      variant: 'danger'
    });

    expect(modalCtrlMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cssClass: 'custom-alert-modal',
        componentProps: expect.objectContaining({
          title: 'Cerrar sesión',
          isConfirm: true,
          variant: 'danger'
        })
      })
    );
    expect(modalElementMock.present).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should present alert modal and resolve when dismissed', async () => {
    const modalElementMock = {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: undefined })
    };
    modalCtrlMock.create.mockResolvedValue(modalElementMock);

    await service.alert({
      title: 'Información',
      message: 'Operación completada'
    });

    expect(modalCtrlMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cssClass: 'custom-alert-modal',
        componentProps: expect.objectContaining({
          title: 'Información',
          isConfirm: false
        })
      })
    );
    expect(modalElementMock.present).toHaveBeenCalled();
  });
});
