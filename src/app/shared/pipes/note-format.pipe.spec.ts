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
      expect(pipe.transform('')).toBe('Sin texto adicional');
      expect(pipe.transform('   ')).toBe('Sin texto adicional');
      expect(pipe.transform(null)).toBe('Sin texto adicional');
    });

    it('should return first non-empty line of content', () => {
      expect(pipe.transform('  Hola mundo  \n  test  ')).toBe('Hola mundo');
    });
  });

  describe('NoteDatePipe', () => {
    const pipe = new NoteDatePipe();

    it('should return "Guardando…" for null or undefined date', () => {
      expect(pipe.transform(null)).toBe('Guardando…');
      expect(pipe.transform(undefined)).toBe('Guardando…');
    });

    it('should format a recent Timestamp correctly (today returns time)', () => {
      const nowTimestamp = Timestamp.fromDate(new Date());
      const result = pipe.transform(nowTimestamp);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.includes('a.m') || result.includes('p.m')).toBe(true);
    });

    it('should return "Ayer" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(pipe.transform(yesterday)).toBe('Ayer');
    });

    it('should return capitalized weekday for notes within last 7 days', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const result = pipe.transform(threeDaysAgo);
      expect(result).toBeTruthy();
      // Should start with uppercase letter
      expect(result[0]).toBe(result[0].toUpperCase());
    });

    it('should return date format for notes older than 7 days', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const result = pipe.transform(tenDaysAgo);
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{2}/);
    });
  });
});

