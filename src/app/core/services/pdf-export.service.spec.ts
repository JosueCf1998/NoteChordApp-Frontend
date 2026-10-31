import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PdfExportService, PdfExportOptions } from './pdf-export.service';
import { ChordTransposerService } from './chord-transposer.service';

describe('PdfExportService', () => {
  let service: PdfExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PdfExportService, ChordTransposerService]
    });
    service = TestBed.inject(PdfExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate a valid PDF for a song with chords and sections', () => {
    const options: PdfExportOptions = {
      title: 'Rey de Reyes',
      author: 'Marco Barrientos',
      noteType: 'music',
      originalKey: 'D',
      currentKey: 'E',
      semitoneOffset: 2,
      formattedDate: '30 de octubre de 2026',
      content: `Intro:
E / B / C#m / A /

Estrofa:
En tu presencia hay plenitud de gozo
E / B / A /

Coro:
Rey de reyes, Señor de señores
C#m / B / A / B /`
    };

    const doc = service.generatePdf(options);
    expect(doc).toBeTruthy();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    const blob = doc.output('blob');
    expect(blob).toBeTruthy();
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(100);
  });

  it('should generate a valid PDF for standard notes', () => {
    const options: PdfExportOptions = {
      title: 'Lista de pendientes',
      noteType: 'standard',
      content: `• Comprar cuerdas de guitarra
• Afinar bajo
• Revisar consola`
    };

    const doc = service.generatePdf(options);
    expect(doc).toBeTruthy();
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
