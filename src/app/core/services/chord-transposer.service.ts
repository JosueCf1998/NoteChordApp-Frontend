import { Injectable } from '@angular/core';

export interface TransposeResult {
  transposedText: string;
  originalKey: string | null;
  currentKey: string | null;
  semitones: number;
}

const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SCALE  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Preferencia armónica estándar por tonalidad resultante (círculo de quintas):
 * Claves de bemoles: F (5), Bb (10), Eb (3), Ab (8), Db (1)
 * Claves de sostenidos: G (7), D (2), A (9), E (4), B (11), F# (6)
 */
const TARGET_KEY_PREFERS_FLATS: Record<number, boolean> = {
  0: false,  // C: naturales
  1: true,   // Db: 5 bemoles (Bb, Eb, Ab, Db, Gb)
  2: false,  // D: 2 sostenidos (F#, C#)
  3: true,   // Eb: 3 bemoles (Bb, Eb, Ab)
  4: false,  // E: 4 sostenidos (F#, C#, G#, D#)
  5: true,   // F: 1 bemol (Bb)
  6: false,  // F#: 6 sostenidos
  7: false,  // G: 1 sostenido (F#)
  8: true,   // Ab: 4 bemoles (Bb, Eb, Ab, Db)
  9: false,  // A: 3 sostenidos (F#, C#, G#)
  10: true,  // Bb: 2 bemoles (Bb, Eb)
  11: false  // B: 5 sostenidos (F#, C#, G#, D#, A#)
};

// Palabras comunes en español que pueden seguir a la preposición 'A'
const SPANISH_WORDS_AFTER_A = new Set([
  'ti', 'mi', 'dios', 'jesus', 'jesús', 'padre', 'cristo', 'señor', 'senor',
  'el', 'la', 'los', 'las', 'un', 'una', 'tu', 'su', 'nuestro', 'nuestra',
  'cada', 'donde', 'dónde', 'quien', 'quién', 'pesar', 'menos', 'veces'
]);

const CHORD_REGEX = /(?<![a-zA-Z0-9])([A-G](?:#|b)?)(maj7|maj9|maj11|maj13|maj|min7|min9|min|m7b5|m7|m9|m11|m13|m6|m|sus2|sus4|sus|dim7|dim|aug|add9|add2|add4|add|7b5|7#5|7b9|7#9|7sus4|7|9|11|13|6|5|M7|M9|M|ø|\+|-5)?(?:\/([A-G](?:#|b)?))?(?![a-zA-Z0-9])/g;

@Injectable({
  providedIn: 'root'
})
export class ChordTransposerService {

  /**
   * Transporta una nota individual (ej. 'Bb', 'C#', 'F') por un número de semitonos.
   * Por preferencia explícita musical, se utilizan sostenidos (C#, D#, F#, G#, A#).
   */
  transposeNote(note: string, semitones: number, preferFlats = false): string {
    if (!note) return note;
    // Extraer raíz de acordes como 'Bb', 'C#m', etc.
    const rootMatch = note.match(/^([A-G](?:#|b)?)/);
    if (!rootMatch || !(rootMatch[1] in NOTE_TO_SEMITONE)) return note;

    const root = rootMatch[1];
    const rest = note.substring(root.length);
    const base = NOTE_TO_SEMITONE[root];
    const target = (base + semitones + 1200) % 12;
    const scale = preferFlats ? FLAT_SCALE : SHARP_SCALE;
    return scale[target] + rest;
  }

  /**
   * Detecta si el texto original usa predominantemente bemoles (Bb, Eb, etc.) o sostenidos (F#, C#, etc.)
   */
  detectAccidentalPreference(text: string): boolean {
    const flatMatches = text.match(/[A-G]b/g);
    const sharpMatches = text.match(/[A-G]#/g);
    const flatCount = flatMatches ? flatMatches.length : 0;
    const sharpCount = sharpMatches ? sharpMatches.length : 0;
    return flatCount > sharpCount;
  }

  /**
   * Detecta con exactitud la tonalidad o primera nota con la que empieza la canción.
   * Prioriza 'TONALIDAD: [Nota]' (ignorando 'ORIGINAL') y busca el primer acorde real,
   * descartando títulos, letra y falsos positivos gramaticales (como 'A' en español).
   */
  detectOriginalKey(text: string): string | null {
    if (!text) return null;

    const lines = text.split('\n');

    // 1. Buscar si existe una línea 'TONALIDAD: [Nota]' explícita (ej. 'TONALIDAD: Bb', 'TONALIDAD: G')
    for (const line of lines) {
      const match = line.match(/^TONALIDAD:\s*([A-G](?:#|b)?(?:m)?)/i);
      if (match && match[1]) {
        return match[1];
      }
    }

    // 2. Si dice 'TONALIDAD: ORIGINAL' o no hay declaración, buscar el primer acorde musical real
    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine || cleanLine.startsWith('#')) continue;

      // Descartar líneas que sean títulos o letra (palabras normales en minúsculas y sin separadores de acordes '/')
      const words = cleanLine.split(/\s+/);
      const normalWords = words.filter(
        w => /^[a-záéíóúñ]{3,}/i.test(w) && !/^(intro|coro|verso|estrofa|puente|precoro|outro|tonalidad)/i.test(w)
      );
      if (normalWords.length >= 2 && !cleanLine.includes('/')) {
        continue;
      }

      // Si la línea tiene prefijo de sección (ej. 'Intro: Bb / Cm7...'), escanear el contenido
      const colonIdx = cleanLine.indexOf(':');
      const lineToScan = colonIdx !== -1 ? cleanLine.substring(colonIdx + 1) : cleanLine;

      CHORD_REGEX.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = CHORD_REGEX.exec(lineToScan)) !== null) {
        const chord = m[0];
        const root = m[1];
        const quality = m[2] || '';

        // Si es 'A' aislado, verificar que no sea la preposición gramatical española
        if (chord === 'A') {
          const afterMatch = lineToScan.substring(m.index + chord.length).trimStart();
          if (/^(ti|mi|dios|padre|jesus|jesús|cristo|señor|el|la|los|las|un|una|tu|su)\b/i.test(afterMatch)) {
            continue;
          }
        }

        const isMinor = quality.startsWith('m') && !quality.startsWith('maj');
        return isMinor ? `${root}m` : root;
      }
    }

    return null;
  }

  /**
   * Determina si la tonalidad resultante prefiere sostenidos o bemoles armónicamente.
   * Por defecto, para conversiones el usuario solicita mayormente sostenidos.
   */
  determinePreferFlats(originalKey: string | null, semitones: number, defaultPreferFlats = false): boolean {
    // Si el usuario solicitó mayormente sostenidos en conversiones, retornar false salvo en semitones === 0
    if (semitones === 0 && originalKey) {
      return originalKey.includes('b');
    }
    return defaultPreferFlats;
  }

  /**
   * Transporta todos los acordes de un texto completo preservando estructura,
   * comentarios, letra y prefijos de sección.
   */
  transposeText(content: string, semitones: number, forcePreferFlats?: boolean): string {
    if (!content || semitones === 0) return content;

    // Para conversiones, usar sostenidos (preferFlats = false) como regla principal
    const preferFlats = forcePreferFlats !== undefined ? forcePreferFlats : false;

    const lines = content.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Descartar líneas que sean claramente prosa/títulos/letra (>= 2 palabras comunes y sin '/')
      const words = trimmed.split(/\s+/);
      const normalWords = words.filter(
        w => /^[a-záéíóúñ]{3,}/i.test(w) && !/^(intro|coro|verso|estrofa|puente|precoro|outro|tonalidad)/i.test(w)
      );
      if (normalWords.length >= 2 && !trimmed.includes('/')) {
        result.push(line);
        continue;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const prefix = line.substring(0, colonIdx + 1);
        const suffix = line.substring(colonIdx + 1);

        if (prefix.trim().toUpperCase() === 'TONALIDAD:') {
          const trimmedSuffix = suffix.trim();
          if (trimmedSuffix.toUpperCase().includes('ORIGINAL')) {
            // Mantener intacta la línea 'TONALIDAD: ORIGINAL' del usuario para preservar la plantilla base
            result.push(line);
            continue;
          } else {
            const transposedSuffix = this.transposeLineChords(suffix, semitones, preferFlats);
            result.push(`${prefix}${transposedSuffix}`);
          }
        } else {
          const transposedSuffix = this.transposeLineChords(suffix, semitones, preferFlats);
          result.push(`${prefix}${transposedSuffix}`);
        }
      } else {
        result.push(this.transposeLineChords(line, semitones, preferFlats));
      }
    }

    return result.join('\n');
  }

  /**
   * Separa una línea entre la parte de acordes y la parte de comentario o texto adicional
   * para garantizar que notas en comentarios (ej. "... en el segundo G") o instrucciones nunca se alteren.
   */
  private splitLineIntoChordsAndComment(line: string): { chordPart: string; commentPart: string } {
    // Patrón 1: Delimitadores comunes de comentarios como '.....', '...', '…', '--' o '//' seguido de texto
    const commentMatch = line.match(/(\.{3,}|…|--|\/\/\s*(?=[a-zA-ZáéíóúñÁÉÍÓÚÑ]{2,}))\s*(.*)$/);
    if (commentMatch && commentMatch.index !== undefined) {
      return {
        chordPart: line.substring(0, commentMatch.index),
        commentPart: line.substring(commentMatch.index)
      };
    }

    // Patrón 2: Palabras normales en español al final de la línea que no sean acordes ni calidades musicales
    const chordKeywords = new Set(['maj', 'min', 'sus', 'dim', 'aug', 'add']);
    const wordsMatch = line.match(/(?<![a-zA-Z0-9])([a-záéíóúñ]{3,}|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})(?![0-9])(?:\s+.*)?$/);
    if (wordsMatch && wordsMatch.index !== undefined) {
      const word = wordsMatch[1].toLowerCase();
      if (!chordKeywords.has(word)) {
        return {
          chordPart: line.substring(0, wordsMatch.index),
          commentPart: line.substring(wordsMatch.index)
        };
      }
    }

    return { chordPart: line, commentPart: '' };
  }

  /**
   * Transporta los acordes dentro de una sola línea de texto, respetando al 100% comentarios y texto no musical.
   */
  private transposeLineChords(line: string, semitones: number, preferFlats: boolean): string {
    const { chordPart, commentPart } = this.splitLineIntoChordsAndComment(line);

    const transposedChords = chordPart.replace(CHORD_REGEX, (match, root, suffix = '', bass = '', offset, fullString) => {
      // Evitar falso positivo con la preposición 'A' en español
      if (match === 'A') {
        const afterMatch = fullString.substring(offset + match.length).trimStart();
        const nextWordMatch = afterMatch.match(/^([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)/);
        if (nextWordMatch) {
          const nextWord = nextWordMatch[1].toLowerCase();
          if (SPANISH_WORDS_AFTER_A.has(nextWord)) {
            return match; // Es preposición gramatical, no acorde
          }
        }
      }

      const newRoot = this.transposeNote(root, semitones, preferFlats);
      let result = newRoot + suffix;
      if (bass) {
        const newBass = this.transposeNote(bass, semitones, preferFlats);
        result += '/' + newBass;
      }
      return result;
    });

    return transposedChords + commentPart;
  }

  /**
   * Formatea el desplazamiento en semitonos a una representación en tonos legible.
   * Ej: 0 -> 'Original', +1 -> '+1/2 tono', +2 -> '+1 tono', -1 -> '-1/2 tono'
   */
  formatSemitoneOffset(semitones: number): string {
    if (semitones === 0) return 'Original';
    const isPositive = semitones > 0;
    const abs = Math.abs(semitones);
    const whole = Math.floor(abs / 2);
    const half = abs % 2 === 1;

    let text = '';
    if (whole > 0 && half) {
      text = `${whole} 1/2 tonos`;
    } else if (whole > 0) {
      text = whole === 1 ? '1 tono' : `${whole} tonos`;
    } else {
      text = '1/2 tono';
    }

    return `${isPositive ? '+' : '-'}${text}`;
  }
}
