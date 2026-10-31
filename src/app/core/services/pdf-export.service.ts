import { Injectable, inject } from '@angular/core';
import { jsPDF } from 'jspdf';
import { ChordTransposerService } from './chord-transposer.service';

export interface PdfExportOptions {
  title: string;
  author?: string;
  content: string;
  noteType: 'music' | 'standard';
  originalKey?: string | null;
  currentKey?: string | null;
  semitoneOffset?: number;
  formattedDate?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {
  private readonly chordTransposer = inject(ChordTransposerService);

  /**
   * Genera y comparte (o descarga) un PDF con diseño profesional editorial.
   */
  async exportAndSharePdf(options: PdfExportOptions): Promise<{ success: boolean; method: 'shared' | 'downloaded' }> {
    const doc = this.generatePdf(options);
    const safeTitle = (options.title || (options.noteType === 'music' ? 'Partitura' : 'Nota'))
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '_');
    const filename = `${safeTitle || 'NoteChord'}.pdf`;

    const blob = doc.output('blob');
    const file = new File([blob], filename, { type: 'application/pdf' });

    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          title: options.title || 'Partitura',
          files: [file]
        });
        return { success: true, method: 'shared' };
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { success: false, method: 'shared' };
        }
        console.warn('Error en navigator.share con PDF, usando descarga directa:', err);
      }
    }

    // Fallback: descarga directa en navegadores web o entornos sin Web Share Files API
    doc.save(filename);
    return { success: true, method: 'downloaded' };
  }

  /**
   * Construye el documento jsPDF con layout premium estilo Apple / Editorial.
   */
  generatePdf(options: PdfExportOptions): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 18;
    const marginTop = 18;
    const marginBottom = 20;
    const contentWidth = pageWidth - marginX * 2; // 174mm

    let currentY = marginTop;

    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - marginBottom) {
        doc.addPage();
        currentY = marginTop + 10; // Espacio extra para running header
        return true;
      }
      return false;
    };

    // ─── 1. CABECERA PRINCIPAL (Página 1) ────────────────────────────────────

    // Mini distintivo de app "NoteChord" arriba a la derecha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(49, 100, 244); // #3164f4
    doc.text('NOTECHORD', pageWidth - marginX, currentY + 3, { align: 'right' });

    // Título de la nota / partitura
    const rawTitle = options.title.trim() || (options.noteType === 'music' ? 'Sin título' : 'Nota');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // #0f172a
    const titleLines = doc.splitTextToSize(rawTitle, contentWidth - 40);
    doc.text(titleLines, marginX, currentY + 4);
    currentY += titleLines.length * 8 + 1;

    // Autor / Artista
    if (options.author && options.author.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(71, 85, 105); // #475569
      doc.text(options.author.trim(), marginX, currentY + 2);
      currentY += 7;
    }

    // Chips / Badges de metadatos (Tono, Transporte, Fecha)
    const hasKey = options.noteType === 'music' && (options.currentKey || options.originalKey);
    const hasDate = !!options.formattedDate;

    if (hasKey || hasDate) {
      currentY += 2;
      let badgeX = marginX;

      if (hasKey) {
        const keyLabel = options.currentKey || options.originalKey || '';
        const offset = options.semitoneOffset ?? 0;
        let badgeText = `Tono: ${keyLabel}`;
        if (offset !== 0 && options.originalKey) {
          const formattedOffset = this.chordTransposer.formatSemitoneOffset(offset);
          badgeText = `Tono: ${keyLabel}  (Base: ${options.originalKey}  ${formattedOffset})`;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const textW = doc.getTextWidth(badgeText);
        const badgeW = textW + 8;
        const badgeH = 6;

        // Fondo de cápsula azul suave
        doc.setFillColor(237, 242, 255); // #edf2ff
        doc.setDrawColor(199, 210, 254); // #c7d2fe
        doc.setLineWidth(0.3);
        doc.roundedRect(badgeX, currentY, badgeW, badgeH, 1.8, 1.8, 'FD');

        doc.setTextColor(37, 99, 235); // #2563eb
        doc.text(badgeText, badgeX + 4, currentY + 4.2);

        badgeX += badgeW + 4;
      }

      if (hasDate) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184); // #94a3b8
        doc.text(options.formattedDate || '', badgeX + 2, currentY + 4.2);
      }

      currentY += 9;
    }

    // Línea divisoria elegante
    currentY += 1;
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setLineWidth(0.4);
    doc.line(marginX, currentY, marginX + contentWidth, currentY);
    currentY += 6;

    // ─── 2. CONTENIDO (Bloques, Acordes, Secciones, Letras) ──────────────────

    const rawLines = (options.content || '').split('\n');

    let i = 0;
    while (i < rawLines.length) {
      const line = rawLines[i];
      const trimmed = line.trim();

      // Línea vacía
      if (!trimmed) {
        currentY += 3.5;
        i++;
        continue;
      }

      const isSection = options.noteType === 'music' && (trimmed.includes(':') || /^\[.*\]$/.test(trimmed));
      const isChord = options.noteType === 'music' && this.chordTransposer.isChordLine(trimmed);

      if (isSection) {
        // ENCABEZADO DE SECCIÓN (ej. Intro:, Estrofa:, Coro:)
        checkPageBreak(14);
        currentY += 2;

        const colonIdx = trimmed.indexOf(':');
        const prefix = colonIdx !== -1 ? trimmed.substring(0, colonIdx + 1).trim() : trimmed;
        const suffix = colonIdx !== -1 ? trimmed.substring(colonIdx + 1).trim() : '';

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        const prefixWidth = doc.getTextWidth(prefix);
        const pillWidth = prefixWidth + 7;
        const pillHeight = 6.2;

        // Cápsula azul para el tag de sección
        doc.setFillColor(237, 242, 255); // #edf2ff
        doc.setDrawColor(199, 210, 254); // #c7d2fe
        doc.setLineWidth(0.3);
        doc.roundedRect(marginX, currentY, pillWidth, pillHeight, 2, 2, 'FD');

        doc.setTextColor(37, 99, 235); // #2563eb
        doc.text(prefix, marginX + 3.5, currentY + 4.4);

        // Texto adicional al lado del tag (si existiera)
        if (suffix) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10.5);
          doc.setTextColor(71, 85, 105);
          doc.text(suffix, marginX + pillWidth + 3, currentY + 4.4);
        }

        currentY += pillHeight + 3.5;
        i++;
      } else if (isChord) {
        // AGRUPACIÓN DE LÍNEAS DE ACORDES EN UNA TARJETA COMPLETA
        const chordLinesGroup: string[] = [];
        while (i < rawLines.length && this.chordTransposer.isChordLine(rawLines[i].trim())) {
          chordLinesGroup.push(rawLines[i].trim());
          i++;
        }

        const lineHeight = 6.5;
        const cardPaddingY = 4;
        const cardHeight = cardPaddingY * 2 + chordLinesGroup.length * lineHeight - 1.5;

        checkPageBreak(cardHeight + 4);

        // Fondo de Card para acordes: gris claro moderno con bordes redondeados
        doc.setFillColor(248, 250, 252); // #f8fafc
        doc.setDrawColor(226, 232, 240); // #e2e8f0
        doc.setLineWidth(0.35);
        doc.roundedRect(marginX, currentY, contentWidth, cardHeight, 3.5, 3.5, 'FD');

        // Renderizado del texto de los acordes en courier negrita espaciado
        doc.setFont('courier', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42); // #0f172a

        let chordY = currentY + cardPaddingY + 4.5;
        for (const chordStr of chordLinesGroup) {
          // Normalizar espacios alrededor de las barras '/'
          const formattedChords = chordStr
            .replace(/\s*\/\s*/g, ' / ')
            .trim();
          doc.text(formattedChords, marginX + 6, chordY);
          chordY += lineHeight;
        }

        currentY += cardHeight + 4;
      } else {
        // TEXTO REGULAR / LETRA DE LA CANCIÓN / LISTAS
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59); // #1e293b

        const isBullet = /^(•|\d+\.|-)\s*/.test(trimmed);
        const textIndent = isBullet ? 4 : 0;
        const wrapped = doc.splitTextToSize(trimmed, contentWidth - textIndent);

        const needed = wrapped.length * 5.5 + 2;
        checkPageBreak(needed);

        doc.text(wrapped, marginX + textIndent, currentY + 4.2);
        currentY += wrapped.length * 5.5 + 1.5;
        i++;
      }
    }

    // ─── 3. ENCABEZADO Y PIE DE PÁGINA GLOBAL (Todas las páginas) ─────────────

    const totalPages = doc.getNumberOfPages();

    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      // Running Header en páginas 2 en adelante
      if (p > 1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184); // #94a3b8
        const runningText = `${rawTitle}${options.author ? ' — ' + options.author : ''}`;
        doc.text(runningText, marginX, marginTop - 5);
        doc.text(`Página ${p}`, pageWidth - marginX, marginTop - 5, { align: 'right' });

        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.25);
        doc.line(marginX, marginTop - 2, pageWidth - marginX, marginTop - 2);
      }

      // Footer en todas las páginas
      const footerY = pageHeight - marginBottom + 8;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, footerY - 4, marginX + contentWidth, footerY - 4);

      // Izquierda: Marca de la app
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('NoteChord', marginX, footerY);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 174, 192);
      doc.text(' • Partituras & Notas', marginX + doc.getTextWidth('NoteChord'), footerY);

      // Derecha: Contador de páginas
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${p} de ${totalPages}`, pageWidth - marginX, footerY, { align: 'right' });
    }

    return doc;
  }
}

