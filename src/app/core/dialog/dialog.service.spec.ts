import { TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DialogService } from './dialog.service';

describe('DialogService', () => {
  let service: DialogService;
  let alertCtrlMock: { create: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    alertCtrlMock = {
      create: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        DialogService,
        { provide: AlertController, useValue: alertCtrlMock }
      ]
    });

    service = TestBed.inject(DialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should present confirm dialog and return true when confirmed', async () => {
    const alertElementMock = {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role: undefined })
    };
    alertCtrlMock.create.mockImplementation(async (config: any) => {
      config.buttons[1].handler();
      return alertElementMock;
    });

    const result = await service.confirm({
      title: 'Cerrar sesión',
      message: '¿Estás seguro?',
      confirmText: 'Salir',
      variant: 'danger'
    });

    expect(alertCtrlMock.create).toHaveBeenCalled();
    expect(alertElementMock.present).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should present alert dialog and resolve when dismissed', async () => {
    const alertElementMock = {
      present: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role: 'cancel' })
    };
    alertCtrlMock.create.mockResolvedValue(alertElementMock);

    await service.alert({
      title: 'Información',
      message: 'Operación completada'
    });

    expect(alertCtrlMock.create).toHaveBeenCalled();
    expect(alertElementMock.present).toHaveBeenCalled();
  });
});
