import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ChordTransposerService } from './chord-transposer.service';

describe('ChordTransposerService - Ellipsis and Card Comments', () => {
  let service: ChordTransposerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChordTransposerService);
  });

  describe('isChordLine', () => {
    it('debe reconocer líneas con acordes simples', () => {
      expect(service.isChordLine('A / C / A /')).toBe(true);
      expect(service.isChordLine('C // F - Em (C/E) / G /')).toBe(true);
    });

    it('debe reconocer líneas de acordes con observaciones o comentarios', () => {
      expect(service.isChordLine('A / C / A / solo guitarra')).toBe(true);
      expect(service.isChordLine('C / G/B / F - C/E / D - G / ... en la 4ta es cromático')).toBe(true);
      expect(service.isChordLine('D / G / A / (corte)')).toBe(true);
    });

    it('no debe reconocer texto común o letra', () => {
      expect(service.isChordLine('Hola cómo estás')).toBe(false);
      expect(service.isChordLine('Esta es una canción')).toBe(false);
    });
  });

  describe('formatLineWithEllipsisComment', () => {
    it('agrega tres puntos automáticamente a texto no musical tras los acordes', () => {
      expect(service.formatLineWithEllipsisComment('A / C / A / solo guitarra'))
        .toBe('A / C / A / ... solo guitarra');
      expect(service.formatLineWithEllipsisComment('C / G / corte'))
        .toBe('C / G / ... corte');
      expect(service.formatLineWithEllipsisComment('A / C / D / C / hola qué tal'))
        .toBe('A / C / D / C / ... hola qué tal');
      expect(service.formatLineWithEllipsisComment('C / A / D / no está comentando nada'))
        .toBe('C / A / D / ... no está comentando nada');
      expect(service.formatLineWithEllipsisComment('A / C / A / 2 veces'))
        .toBe('A / C / A / ... 2 veces');
    });

    it('mantiene los tres puntos si ya fueron escritos por el usuario', () => {
      expect(service.formatLineWithEllipsisComment('A / C / A / ... solo guitarra'))
        .toBe('A / C / A / ... solo guitarra');
    });

    it('no altera líneas que son puramente acordes', () => {
      expect(service.formatLineWithEllipsisComment('A / C / A /'))
        .toBe('A / C / A /');
    });
  });

  describe('formatSectionLineWithEllipsis', () => {
    it('agrega tres puntos si se escribe una nota al lado de la sección', () => {
      expect(service.formatSectionLineWithEllipsis('Intro: guitarra'))
        .toBe('Intro: ... guitarra');
      expect(service.formatSectionLineWithEllipsis('Coro: todos'))
        .toBe('Coro: ... todos');
    });

    it('respeta tres puntos si ya existen al lado de la sección', () => {
      expect(service.formatSectionLineWithEllipsis('Intro: ... guitarra'))
        .toBe('Intro: ... guitarra');
    });

    it('mantiene la sección limpia si no hay texto al lado', () => {
      expect(service.formatSectionLineWithEllipsis('Intro:'))
        .toBe('Intro:');
      expect(service.formatSectionLineWithEllipsis('Intro:   '))
        .toBe('Intro:');
    });
  });
});

