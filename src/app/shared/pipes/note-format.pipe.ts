import { Pipe, PipeTransform } from '@angular/core';
import { Timestamp } from 'firebase/firestore';

@Pipe({
  name: 'appNoteCount',
  pure: true,
  standalone: true
})
export class NoteCountPipe implements PipeTransform {
  transform(count: number | null | undefined): string {
    const total = count ?? 0;
    if (total === 0) {
      return 'Sin notas';
    }
    return `${total} ${total === 1 ? 'nota' : 'notas'}`;
  }
}

@Pipe({
  name: 'appNoteDate',
  pure: true,
  standalone: true
})
export class NoteDatePipe implements PipeTransform {
  transform(timestamp: Timestamp | Date | null | undefined): string {
    const date = timestamp instanceof Date
      ? timestamp
      : (timestamp as Timestamp | undefined)?.toDate?.();

    if (!date) {
      return 'Guardando…';
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const noteDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDifference = Math.round((today.getTime() - noteDay.getTime()) / 86400000);

    // Mismo día (hoy): Formato hora '3:56 p.m.'
    if (dayDifference === 0) {
      const formatted = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);

      return formatted.replace('AM', 'a.m').replace('PM', 'p.m');
    }

    // Día anterior (ayer)
    if (dayDifference === 1) {
      return 'Ayer';
    }

    // Últimos 7 días: Nombre del día de la semana (ej. 'Lunes', 'Domingo')
    if (dayDifference > 1 && dayDifference < 7) {
      const weekday = new Intl.DateTimeFormat('es-PE', { weekday: 'long' }).format(date);
      return weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }

    // Fechas más antiguas: Formato corto 'dd/MM/yy' (ej. '26/10/26')
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }).format(date);
  }
}

@Pipe({
  name: 'appNotePreview',
  pure: true,
  standalone: true
})
export class NotePreviewPipe implements PipeTransform {
  transform(content: string | null | undefined): string {
    if (!content) {
      return 'Sin texto adicional';
    }
    // Muestra exclusivamente la segunda línea del documento (primera línea del contenido)
    const lines = content.split('\n');
    const secondLine = lines[0]?.trim() || lines.find((line) => line.trim().length > 0)?.trim() || '';
    return secondLine || 'Sin texto adicional';
  }
}

