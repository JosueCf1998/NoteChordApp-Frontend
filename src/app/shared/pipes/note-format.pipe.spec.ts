import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';

import { NoteCountPipe, NoteDatePipe, NotePreviewPipe } from './note-format.pipe';

describe('Note Format Pipes', () => {
  describe('NoteCountPipe', () => {
    const pipe = new NoteCountPipe();

    it('should format zero or null count as "Sin notas"', () => {
      expect(pipe.transform(0)).toBe('Sin notas');
      expect(pipe.transform(null)).toBe('Sin notas');
      expect(pipe.transform(undefined)).toBe('Sin notas');
    });

    it('should format 1 note in singular', () => {
      expect(pipe.transform(1)).toBe('1 nota');
    });

    it('should format multiple notes in plural', () => {
      expect(pipe.transform(5)).toBe('5 notas');
    });
  });

  describe('NotePreviewPipe', () => {
    const pipe = new NotePreviewPipe();

    it('should return fallback for empty content', () => {
      expect(pipe.transform('')).toBe('Sin contenido todavía');
      expect(pipe.transform('   ')).toBe('Sin contenido todavía');
      expect(pipe.transform(null)).toBe('Sin contenido todavía');
    });

    it('should collapse multiple spaces into single space and trim', () => {
      expect(pipe.transform('  Hola   mundo  \n  test  ')).toBe('Hola mundo test');
    });
  });

  describe('NoteDatePipe', () => {
    const pipe = new NoteDatePipe();

    it('should return "Guardando…" for null or undefined date', () => {
      expect(pipe.transform(null)).toBe('Guardando…');
      expect(pipe.transform(undefined)).toBe('Guardando…');
    });

    it('should format a recent Timestamp correctly', () => {
      const nowTimestamp = Timestamp.fromDate(new Date());
      const result = pipe.transform(nowTimestamp);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });
});

