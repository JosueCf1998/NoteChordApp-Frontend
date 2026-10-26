import { describe, expect, it, vi } from 'vitest';
import { CreateNoteModalComponent, CreateNotePayload } from './create-note-modal.component';

describe('CreateNoteModalComponent', () => {
  it('should initialize with music type by default', () => {
    const component = new CreateNoteModalComponent();
    expect(component.selectedType).toBe('music');
    expect(component.title).toBe('');
    expect(component.author).toBe('');
    expect(component.isFormValid).toBe(false);
  });

  it('should update selected type', () => {
    const component = new CreateNoteModalComponent();
    component.setType('standard');
    expect(component.selectedType).toBe('standard');
    component.setType('music');
    expect(component.selectedType).toBe('music');
  });

  it('should validate form only when title is non-empty', () => {
    const component = new CreateNoteModalComponent();
    component.title = '   ';
    expect(component.isFormValid).toBe(false);

    component.title = 'Rey de Reyes';
    expect(component.isFormValid).toBe(true);
  });

  it('should emit created event on modal dismiss with music payload including author', () => {
    const component = new CreateNoteModalComponent();
    component.selectedType = 'music';
    component.title = ' Way Maker ';
    component.author = ' Sinach ';

    let emittedPayload: CreateNotePayload | undefined;
    component.created.subscribe((payload) => {
      emittedPayload = payload;
    });

    component.handleSubmit();
    component.handleDidDismiss();

    expect(emittedPayload).toEqual({
      type: 'music',
      title: 'Way Maker',
      author: 'Sinach'
    });
  });

  it('should emit created event on modal dismiss for standard note omitting author', () => {
    const component = new CreateNoteModalComponent();
    component.selectedType = 'standard';
    component.title = 'Ideas para la reunión';
    component.author = 'Alguien';

    let emittedPayload: CreateNotePayload | undefined;
    component.created.subscribe((payload) => {
      emittedPayload = payload;
    });

    component.handleSubmit();
    component.handleDidDismiss();

    expect(emittedPayload).toEqual({
      type: 'standard',
      title: 'Ideas para la reunión',
      author: undefined
    });
  });

  it('should not emit created event when form is invalid', () => {
    const component = new CreateNoteModalComponent();
    component.title = '';

    const emitSpy = vi.fn();
    component.created.subscribe(emitSpy);

    component.handleSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should reset form on close', () => {
    const component = new CreateNoteModalComponent();
    component.selectedType = 'standard';
    component.title = 'Mi nota';
    component.author = 'Mi autor';

    component.handleClose();

    expect(component.selectedType).toBe('music');
    expect(component.title).toBe('');
    expect(component.author).toBe('');
  });
});

