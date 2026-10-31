import { Component, OnDestroy, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewWillLeave, ViewDidEnter, Platform, ActionSheetController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Keyboard } from '@capacitor/keyboard';
import {
  GetNoteByIdUseCase,
  CreateNoteUseCase,
  UpdateNoteUseCase,
  DeleteNoteUseCase
} from '../../core/use-cases/notes';
import { NavigationService } from '../../core/navigation/navigation.service';
import { SharedModule } from '../../shared/shared.module';
import { ChordTransposerService } from '../../core/services/chord-transposer.service';
import { PdfExportService } from '../../core/services/pdf-export.service';

/** Umbral de scroll (px) al que se considera "arriba" y se muestra la fecha. */
const SCROLL_TOP_THRESHOLD = 8;
/** Diferencia mínima de scroll hacia abajo para ocultar la fecha. */
const SCROLL_DOWN_DELTA = 4;
/** Diferencia mínima de scroll hacia arriba (cerca del top) para mostrar la fecha. */
const SCROLL_UP_DELTA = -8;
/** Scroll máximo (px) dentro del cual el scroll rápido arriba muestra la fecha. */
const SCROLL_NEAR_TOP = 120;
/** Milisegundos de inactividad tras dejar de tocar antes de ocultar la fecha. */
const DATE_HIDE_DELAY_MS = 3000;

export type NoteBlockType = 'title' | 'section' | 'text';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.page.html',
  styleUrls: ['./notes.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, SharedModule]
})
export class NotesPage implements OnDestroy, ViewWillLeave, ViewDidEnter, AfterViewInit {
  @ViewChild('editor', { static: false }) editorRef?: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly navService = inject(NavigationService);
  private readonly platform = inject(Platform);
  private readonly getNoteByIdUseCase = inject(GetNoteByIdUseCase);
  private readonly createNoteUseCase = inject(CreateNoteUseCase);
  private readonly updateNoteUseCase = inject(UpdateNoteUseCase);
  private readonly deleteNoteUseCase = inject(DeleteNoteUseCase);
  private readonly chordTransposer = inject(ChordTransposerService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly pdfExportService = inject(PdfExportService);

  isLocked = false;
  isKeyboardOpen = false;
  isTransposeModalOpen = false;
  semitoneOffset = 0;
  baseContentForTranspose = '';
  detectedOriginalKey: string | null = null;
  preferFlatsForTranspose = false;
  originalKeyPrefersFlats = false;
  private backButtonSub?: Subscription;

  get currentKeyDisplay(): string {
    if (!this.detectedOriginalKey) return '';
    if (this.semitoneOffset === 0) return this.detectedOriginalKey;
    return this.chordTransposer.transposeNote(this.detectedOriginalKey, this.semitoneOffset, false);
  }

  get formatButtonLabel(): string {
    if (this.semitoneOffset === 0) return 'T';
    const isPositive = this.semitoneOffset > 0;
    const abs = Math.abs(this.semitoneOffset);
    const whole = Math.floor(abs / 2);
    const half = abs % 2 === 1;

    const sign = isPositive ? '+' : '-';
    let valueStr = '';
    if (whole > 0 && half) {
      valueStr = `${whole} 1/2`;
    } else if (whole > 0) {
      valueStr = `${whole}`;
    } else {
      valueStr = '1/2';
    }

    return `T: ${sign}${valueStr}`;
  }

  get formatOffsetTag(): string {
    if (this.semitoneOffset === 0) return '';
    const isPositive = this.semitoneOffset > 0;
    const abs = Math.abs(this.semitoneOffset);
    const whole = Math.floor(abs / 2);
    const half = abs % 2 === 1;

    const sign = isPositive ? '+' : '-';
    let valueStr = '';
    if (whole > 0 && half) {
      valueStr = `${whole} ½`;
    } else if (whole > 0) {
      valueStr = `${whole}`;
    } else {
      valueStr = '½';
    }
    return `${sign}${valueStr}`;
  }

  folderId = '';
  noteId = '';
  noteType: 'music' | 'standard' = 'music';
  author = '';
  title = '';
  content = '';
  hasContent = false;
  errorMessage = '';
  isLoading = true;
  isDirty = false;
  isSaving = false;
  private savePromise: Promise<void> | null = null;
  private pendingSaveAgain = false;

  transposeEvent: MouseEvent | CustomEvent | null = null;
  isDeleteConfirmOpen = false;
  isDeleting = false;
  formattedFullDate = '';
  isDateVisible = false;

  private lastScrollTop = 0;
  private gestureStartY?: number;
  private dateHideTimeout?: ReturnType<typeof setTimeout>;

  private readonly saveSubject = new Subject<void>();
  private readonly autoSaveSubscription: Subscription;
  private noteSubscription?: Subscription;
  private readonly routeSubscription: Subscription;

  constructor() {
    if (Capacitor.isNativePlatform()) {
      void Keyboard.addListener('keyboardWillShow', () => {
        this.isKeyboardOpen = true;
      });
      void Keyboard.addListener('keyboardDidShow', () => {
        this.isKeyboardOpen = true;
      });
      void Keyboard.addListener('keyboardWillHide', () => {
        this.isKeyboardOpen = false;
      });
      void Keyboard.addListener('keyboardDidHide', () => {
        this.isKeyboardOpen = false;
      });
    }

    this.autoSaveSubscription = this.saveSubject.pipe(
      debounceTime(800)
    ).subscribe(() => {
      if (this.isDirty) {
        void this.save();
      }
    });

    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const folderId = params.get('folderId') ?? '';
      const noteId = params.get('noteId') ?? '';

      if (folderId !== this.folderId) {
        this.folderId = folderId;
      }

      if (noteId !== this.noteId) {
        this.noteId = noteId;

        if (this.noteId === 'new') {
          this.noteSubscription?.unsubscribe();
          this.noteSubscription = undefined;
          this.noteType = 'music';
          this.author = '';
          this.title = '';
          this.content = '';
          this.baseContentForTranspose = '';
          this.semitoneOffset = 0;
          this.isTransposeModalOpen = false;
          this.hasContent = false;
          this.setEditorContent('', '');
          this.formattedFullDate = this.formatFullDate(new Date());
          this.isLoading = false;
          this.isDirty = false;
        } else {
          this.isLoading = true;
          this.subscribeToNote(this.noteId);
        }
      }
    });
  }

  ngAfterViewInit() {
    if (this.noteId === 'new' && !this.isLoading) {
      this.setEditorContent(this.title, '');
    }
  }

  ionViewDidEnter() {
    if (this.noteId === 'new') {
      setTimeout(() => {
        this.focusEditor();
      }, 150);
    }
  }

  ionViewWillLeave() {
    this.backButtonSub?.unsubscribe();
    void this.handleLeaveOrSave();
  }

  private focusEditor() {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return;

    if (this.title) {
      let p = editor.querySelector('p') as HTMLElement | null;
      if (!p) {
        p = document.createElement('p');
        p.className = 'block-text';
        p.setAttribute('data-block', 'text');
        p.innerHTML = '<br>';
        editor.appendChild(p);
      }
      this.setCursorAtStartOfBlock(p);
      editor.focus();
    } else {
      this.focusTitleLine();
    }
  }

  private focusTitleLine() {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return;
    let h1 = editor.querySelector('h1') as HTMLElement | null;
    if (!h1) {
      this.setEditorContent('', '');
      h1 = editor.querySelector('h1') as HTMLElement | null;
    }
    if (h1) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(h1, 0);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
      editor.focus();
    }
  }

  private getSavedTranspositionOffset(noteId: string): number {
    if (!noteId || noteId === 'new') return 0;
    try {
      const val = localStorage.getItem(`notechord_transpose_${noteId}`);
      if (val !== null) {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return 0;
  }

  private saveTranspositionOffset(noteId: string, offset: number): void {
    if (!noteId || noteId === 'new') return;
    try {
      if (offset === 0) {
        localStorage.removeItem(`notechord_transpose_${noteId}`);
      } else {
        localStorage.setItem(`notechord_transpose_${noteId}`, String(offset));
      }
    } catch {
      // Ignore storage errors
    }
  }

  private removeSavedTranspositionOffset(noteId: string): void {
    if (!noteId || noteId === 'new') return;
    try {
      localStorage.removeItem(`notechord_transpose_${noteId}`);
    } catch {
      // Ignore storage errors
    }
  }

  resetToBaseKey(): void {
    if (this.semitoneOffset === 0) return;
    this.semitoneOffset = 0;
    this.removeSavedTranspositionOffset(this.noteId);
    this.content = this.baseContentForTranspose;
    this.setEditorContent(this.title, this.content);
  }

  private subscribeToNote(noteId: string) {
    this.noteSubscription?.unsubscribe();
    this.noteSubscription = this.getNoteByIdUseCase.execute(noteId).subscribe({
      next: (res) => {
        const note = res.data;
        if (note) {
          this.formattedFullDate = this.formatFullDate(note.updatedAt?.toDate?.() || new Date());
          // Solo poblar el editor en la carga inicial para nunca sobreescribir ni alterar el DOM mientras el usuario edita
          if (this.isLoading) {
            this.noteType = (note.type as any) || 'music';
            this.author = note.author || '';
            this.title = note.title === 'Sin título' ? '' : note.title;
            this.baseContentForTranspose = note.content;
            this.detectedOriginalKey = this.chordTransposer.detectOriginalKey(this.baseContentForTranspose);
            this.originalKeyPrefersFlats = this.chordTransposer.detectAccidentalPreference(this.baseContentForTranspose) || (this.detectedOriginalKey?.includes('b') ?? false);
            this.preferFlatsForTranspose = false;

            const savedOffset = this.getSavedTranspositionOffset(noteId);
            if (savedOffset !== 0 && this.baseContentForTranspose) {
              this.semitoneOffset = savedOffset;
              this.content = this.chordTransposer.transposeText(
                this.baseContentForTranspose,
                this.semitoneOffset,
                false
              );
            } else {
              this.semitoneOffset = 0;
              this.content = this.baseContentForTranspose;
            }

            this.isTransposeModalOpen = false;
            this.setEditorContent(this.title, this.content);
          }
        }
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la nota.';
        this.isLoading = false;
      }
    });
  }

  private isEditorActive(): boolean {
    if (!this.editorRef?.nativeElement) return false;
    const active = document.activeElement;
    return active === this.editorRef.nativeElement || this.editorRef.nativeElement.contains(active);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private setEditorContent(title: string, content: string) {
    setTimeout(() => {
      if (!this.editorRef?.nativeElement) return;
      const el = this.editorRef.nativeElement;

      let displayTitle = title && title !== 'Sin título' ? title : '';
      if (this.author && !displayTitle.includes(' - ')) {
        displayTitle = `${displayTitle} - ${this.author}`;
      }

      const trimmedContent = content || '';
      this.title = title && title !== 'Sin título' ? title : '';
      this.content = trimmedContent;
      this.hasContent = !!(displayTitle || trimmedContent.trim());

      // Línea 1: Siempre <h1> para Título (28px, negrita)
      let html = `<h1 class="block-title" data-block="title">${displayTitle ? this.escapeHtml(displayTitle) : '<br>'}</h1>`;

      // Secciones y Tarjetas de Notas Musicales:
      // Las notas musicales (con '/') se agrupan en una Card completa (.chord-card)
      if (trimmedContent) {
        const lines = trimmedContent.split('\n');
        let inChordCard = false;

        for (const line of lines) {
          const colonIdx = line.indexOf(':');
          const isList = /^(•|\d+\.|[a-zA-Z]\.)\s*/.test(line);
          const hasColon = colonIdx !== -1 && this.noteType === 'music';
          const isChord = this.noteType === 'music' && !hasColon && this.chordTransposer.isChordLine(line);

          if (hasColon) {
            if (inChordCard) {
              html += `</div>`;
              inChordCard = false;
            }
            const formattedSection = this.chordTransposer.formatSectionLineWithEllipsis(line);
            const sectionColon = formattedSection.indexOf(':');
            const prefix = formattedSection.substring(0, sectionColon + 1);
            const suffix = formattedSection.substring(sectionColon + 1);
            html += `<p class="block-section-line" data-block="section"><span class="section-prefix">${this.escapeHtml(prefix)}</span><span class="section-suffix">${suffix ? this.escapeHtml(suffix) : ''}</span></p>`;
          } else if (isChord) {
            // Nota musical con '/' -> agrupar en Card completa
            if (!inChordCard) {
              html += `<div class="chord-card" data-block="chord-card">`;
              inChordCard = true;
            }
            const formattedChord = this.chordTransposer.formatLineWithEllipsisComment(line);
            const { chordPart, commentPart } = this.chordTransposer.splitLineIntoChordsAndComment(formattedChord);
            if (commentPart) {
              html += `<p class="block-chord-line" data-block="chord">${this.escapeHtml(chordPart)}<span class="chord-comment">${this.escapeHtml(commentPart)}</span></p>`;
            } else {
              html += `<p class="block-chord-line" data-block="chord">${this.escapeHtml(formattedChord)}</p>`;
            }
          } else {
            // Texto normal o viñeta -> SIEMPRE fuera de la card
            if (inChordCard) {
              html += `</div>`;
              inChordCard = false;
            }
            if (isList) {
              html += `<p class="block-list-item block-text" data-block="list">${this.escapeHtml(line)}</p>`;
            } else {
              html += `<p class="block-text" data-block="text">${line ? this.escapeHtml(line) : '<br>'}</p>`;
            }
          }
        }

        if (inChordCard) {
          html += `</div>`;
        }
      } else {
        html += `<p class="block-text" data-block="text"><br></p>`;
      }

      el.innerHTML = html;
    }, 0);
  }

  /**
   * Garantiza los 3 formatos dinámicos estilo Apple Notes:
   * 1. Título (h1.block-title, 28px negrita): Primer bloque siempre.
   * 2. Sección (.section-prefix, 22px semibold): Parte izquierda hasta los ':'.
   * 3. Texto (.section-suffix y .block-text, 17px regular): Parte derecha después de los ':' y líneas sin ':'.
   */
  private normalizeBlocks() {
    const editor = this.editorRef?.nativeElement;
    if (!editor) return;

    // 1. El primer bloque es SIEMPRE H1 (Título)
    const firstChild = editor.firstElementChild as HTMLElement | null;
    if (!firstChild) {
      editor.innerHTML = '<h1 class="block-title" data-block="title"><br></h1>';
      return;
    }

    if (firstChild.tagName !== 'H1') {
      const h1 = document.createElement('h1');
      h1.className = 'block-title';
      h1.setAttribute('data-block', 'title');
      h1.innerHTML = firstChild.innerHTML || '<br>';
      firstChild.replaceWith(h1);
    } else {
      if (!firstChild.classList.contains('block-title')) {
        firstChild.className = 'block-title';
      }
      firstChild.setAttribute('data-block', 'title');
    }

    // 2. Extraer de cualquier .chord-card líneas que sean secciones o texto ajeno
    const chordCards = Array.from(editor.querySelectorAll('.chord-card')) as HTMLElement[];
    for (const card of chordCards) {
      const paras = Array.from(card.querySelectorAll('p')) as HTMLElement[];
      if (paras.length === 0) {
        const text = (card.textContent || '').trim();
        if (!text || !this.chordTransposer.isChordLine(text)) {
          const p = document.createElement('p');
          p.className = 'block-text';
          p.setAttribute('data-block', 'text');
          p.innerHTML = text ? this.escapeHtml(text) : '<br>';
          card.replaceWith(p);
        }
        continue;
      }

      for (const p of paras) {
        const text = (p.textContent || '').trim();
        const colonIdx = text.indexOf(':');
        const hasColon = colonIdx !== -1 && this.noteType === 'music';

        // Si la línea tiene ':' (ej. 'Estrofa:'), definitivamente es sección -> extraer fuera
        if (hasColon) {
          card.after(p);
          continue;
        }

        // Si la línea está VACÍA (Enter reciente para escribir abajo en el card):
        // MANTENER DENTRO DEL CARD! No expulsar para permitir escribir la siguiente línea.
        if (!text) {
          p.className = 'block-chord-line';
          p.setAttribute('data-block', 'chord');
          if (!p.childNodes.length || p.innerHTML === '') {
            p.innerHTML = '<br>';
          }
          continue;
        }

        // Línea con contenido dentro del card:
        // Mantener dentro del card y normalizar comentarios con '...' si contiene texto no musical
        p.className = 'block-chord-line';
        p.setAttribute('data-block', 'chord');
        this.normalizeChordLineComment(p);
      }

      if (card.children.length === 0 && !(card.textContent || '').trim()) {
        card.remove();
      }
    }

    // 3. Normalizar bloques dentro del editor
    const topChildren = Array.from(editor.children) as HTMLElement[];
    for (let i = 1; i < topChildren.length; i++) {
      let child = topChildren[i];

      // Convertir cualquier H1 en bloque de texto normal si no es el primero
      if (child.tagName === 'H1') {
        const p = document.createElement('p');
        p.className = 'block-text';
        p.setAttribute('data-block', 'text');
        p.innerHTML = child.innerHTML || '<br>';
        child.replaceWith(p);
        topChildren[i] = p;
        child = p;
      }

      // Si es una card completa de acordes, normalizar sus párrafos internos y fusionar con card anterior si procede
      if (child.classList.contains('chord-card')) {
        const innerParas = Array.from(child.querySelectorAll('p')) as HTMLElement[];
        for (const p of innerParas) {
          p.className = 'block-chord-line';
          p.setAttribute('data-block', 'chord');
          this.normalizeChordLineComment(p);
        }
        const prev = child.previousElementSibling as HTMLElement | null;
        if (prev && prev.classList.contains('chord-card')) {
          while (child.firstChild) {
            prev.appendChild(child.firstChild);
          }
          child.remove();
        }
        continue;
      }

      // Procesar párrafo suelto
      let text = child.textContent || '';

      // Viñetas automáticas (- , . , 1.a)
      if (/^[-.]\s+/.test(text)) {
        this.replacePrefixInBlock(child, '•\u00A0 ');
        text = child.textContent || '';
      }
      const stuckNumMatch = text.match(/^(\d+)\.([^\s].*)$/);
      if (stuckNumMatch) {
        this.replacePrefixInBlock(child, `${stuckNumMatch[1]}.\u00A0 `);
        text = child.textContent || '';
      }
      const stuckLetterMatch = text.match(/^([a-zA-Z])\.([^\s].*)$/);
      if (stuckLetterMatch) {
        this.replacePrefixInBlock(child, `${stuckLetterMatch[1]}.\u00A0 `);
        text = child.textContent || '';
      }

      const isList = /^(•|\d+\.|[a-zA-Z]\.)\s*/.test(text);
      const colonIdx = text.indexOf(':');
      const hasColon = colonIdx !== -1 && this.noteType === 'music';
      const isChord = this.noteType === 'music' && !hasColon && this.chordTransposer.isChordLine(text);

      if (hasColon) {
        child.classList.remove('chord-card', 'block-chord-line', 'block-text', 'block-list-item');
        this.normalizeSectionLine(child);
      } else if (isChord) {
        // REGLA: Detectó nota y '/' -> Agrupar dentro de Card completa
        const selection = window.getSelection();
        let cursorOffset: number | null = null;
        const isFocused = selection && selection.rangeCount && child.contains(selection.anchorNode);
        if (isFocused) {
          const range = selection.getRangeAt(0);
          cursorOffset = this.getTextOffsetInBlock(child, range.startContainer, range.startOffset);
        }

        child.className = 'block-chord-line';
        child.setAttribute('data-block', 'chord');

        const prev = child.previousElementSibling as HTMLElement | null;
        if (prev && prev.classList.contains('chord-card')) {
          prev.appendChild(child);
        } else {
          const card = document.createElement('div');
          card.className = 'chord-card';
          card.setAttribute('data-block', 'chord-card');
          child.replaceWith(card);
          card.appendChild(child);
        }

        if (isFocused && cursorOffset !== null) {
          this.restoreCursorInSimpleBlock(child, cursorOffset);
        }

        this.normalizeChordLineComment(child);
      } else {
        // Texto normal o viñeta -> Fuera de card
        child.classList.remove('chord-card', 'block-chord-line');

        if (child.classList.contains('block-section-line') || child.querySelector('.section-prefix')) {
          const selection = window.getSelection();
          let cursorOffset: number | null = null;
          if (selection && selection.rangeCount && child.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            cursorOffset = this.getTextOffsetInBlock(child, range.startContainer, range.startOffset);
          }

          child.className = isList ? 'block-list-item block-text' : 'block-text';
          child.setAttribute('data-block', isList ? 'list' : 'text');
          child.innerHTML = text ? this.escapeHtml(text) : '<br>';

          if (cursorOffset !== null) {
            this.restoreCursorInSimpleBlock(child, cursorOffset);
          }
        } else {
          if (isList) {
            child.className = 'block-list-item block-text';
            child.setAttribute('data-block', 'list');
          } else {
            child.className = 'block-text';
            child.setAttribute('data-block', 'text');
          }
        }
      }
    }
  }

  /**
   * Normaliza una línea de sección (ej. 'Intro:', 'Intro: ... guitarra').
   * Garantiza que si el usuario escribe notas al lado, inicien con ' ... '
   * pero sin sobreescribir el DOM mientras escribe para preservar espacios y borrado.
   */
  private normalizeSectionLine(block: HTMLElement) {
    const text = block.textContent || '';
    const colonIdx = text.indexOf(':');
    if (colonIdx === -1) return;

    const prefixText = text.substring(0, colonIdx + 1);
    const rawSuffix = text.substring(colonIdx + 1);

    const prefixEl = block.querySelector('.section-prefix') as HTMLElement | null;
    const suffixEl = block.querySelector('.section-suffix') as HTMLElement | null;

    if (prefixEl && suffixEl) {
      if (prefixEl.textContent !== prefixText) {
        prefixEl.textContent = prefixText;
      }

      const suffixText = suffixEl.textContent || '';
      const trimmed = suffixText.trim();
      const withoutDots = trimmed.replace(/^(\.{1,3}|…)\s*/, '');

      // Si el sufijo está vacío o sólo contiene puntos/espacios (el usuario los borró):
      // NO agregar puntos ni modificar el DOM
      if (!withoutDots) {
        if (!trimmed) {
          suffixEl.textContent = '';
        }
        return;
      }

      // Si ya comienza con tres puntos ('...' o '…'), está perfectamente estructurado!
      // NO MODIFICAR innerHTML para permitir que el usuario escriba espacios y borre libremente.
      if (trimmed.startsWith('...') || trimmed.startsWith('…')) {
        return;
      }

      // El usuario escribió texto que no empieza con '...': agregar ' ... '
      const formattedSuffix = ' ... ' + suffixText.trimStart();
      const selection = window.getSelection();
      let cursorOffset: number | null = null;
      if (selection && selection.rangeCount && block.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        cursorOffset = this.getTextOffsetInBlock(block, range.startContainer, range.startOffset);
      }

      suffixEl.textContent = formattedSuffix;

      if (cursorOffset !== null) {
        const diff = formattedSuffix.length - suffixText.length;
        this.setCursorAtTextOffsetInBlock(block, cursorOffset + diff, prefixText.length);
      }
      return;
    }

    // Inicializar estructura de la sección si no existía aún
    const selection = window.getSelection();
    let cursorOffset: number | null = null;
    if (selection && selection.rangeCount && block.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      cursorOffset = this.getTextOffsetInBlock(block, range.startContainer, range.startOffset);
    }

    let formattedSuffix = '';
    const trimmedSuffix = rawSuffix.trim();
    const withoutDots = trimmedSuffix.replace(/^(\.{1,3}|…)\s*/, '');
    if (withoutDots) {
      if (trimmedSuffix.startsWith('...') || trimmedSuffix.startsWith('…')) {
        formattedSuffix = ' ' + rawSuffix.trimStart();
      } else {
        formattedSuffix = ' ... ' + rawSuffix.trimStart();
      }
    }

    block.className = 'block-section-line';
    block.setAttribute('data-block', 'section');
    block.innerHTML = `<span class="section-prefix">${this.escapeHtml(prefixText)}</span><span class="section-suffix">${this.escapeHtml(formattedSuffix)}</span>`;

    if (cursorOffset !== null) {
      const diff = formattedSuffix.length - rawSuffix.length;
      this.setCursorAtTextOffsetInBlock(block, cursorOffset + Math.max(0, diff), prefixText.length);
    }
  }

  /**
   * Normaliza los comentarios no musicales en una línea de acordes
   * (ej. 'A / C / D / C / hola qué tal' -> 'A / C / D / C / <span class="chord-comment">... hola qué tal</span>').
   */
  private normalizeChordLineComment(p: HTMLElement) {
    const rawText = p.textContent || '';
    if (!rawText.trim()) return;

    const commentEl = p.querySelector('.chord-comment') as HTMLElement | null;
    if (commentEl) {
      const commentText = commentEl.textContent || '';
      const trimmed = commentText.trim();
      const withoutDots = trimmed.replace(/^(\.{1,3}|…)\s*/, '');
      if (!withoutDots) {
        // No hay palabras reales en el comentario (usuario borró el texto o los puntos)
        commentEl.remove();
        return;
      }
      // Si ya comienza con '...' o '…', YA ESTÁ ESTRUCTURADO!
      // NO TOCAR el DOM para permitir espacios y borrado natural con Backspace.
      if (trimmed.startsWith('...') || trimmed.startsWith('…')) {
        return;
      }
      const formatted = ' ... ' + commentText.trimStart();
      const selection = window.getSelection();
      let cursorOffset: number | null = null;
      if (selection && selection.rangeCount && p.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        cursorOffset = this.getTextOffsetInBlock(p, range.startContainer, range.startOffset);
      }
      commentEl.textContent = formatted;
      if (cursorOffset !== null) {
        const diff = formatted.length - commentText.length;
        this.restoreCursorInSimpleBlock(commentEl, cursorOffset + diff);
      }
      return;
    }

    // Si aún no tiene el span .chord-comment
    const { chordPart, commentPart } = this.chordTransposer.splitLineIntoChordsAndComment(rawText);
    const trimmedComment = commentPart.trim();
    const withoutDots = trimmedComment.replace(/^(\.{1,3}|…)\s*/, '');
    if (!withoutDots) return; // Si no hay palabras reales de comentario, no crear el span!

    let formattedComment = '';
    if (trimmedComment.startsWith('...') || trimmedComment.startsWith('…')) {
      formattedComment = ' ' + commentPart.trimStart();
    } else {
      formattedComment = ' ... ' + commentPart.trimStart();
    }

    const selection = window.getSelection();
    let cursorOffset: number | null = null;
    if (selection && selection.rangeCount && p.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      cursorOffset = this.getTextOffsetInBlock(p, range.startContainer, range.startOffset);
    }

    p.innerHTML = `${this.escapeHtml(chordPart)}<span class="chord-comment">${this.escapeHtml(formattedComment)}</span>`;

    if (cursorOffset !== null) {
      const diff = formattedComment.length - commentPart.length;
      const targetOffset = cursorOffset + Math.max(0, diff);
      this.restoreCursorInChordLine(p, targetOffset, chordPart.length);
    }
  }

  private restoreCursorInChordLine(p: HTMLElement, targetOffset: number, chordPartLength: number): void {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();

    const commentEl = p.querySelector('.chord-comment') as HTMLElement | null;
    if (targetOffset >= chordPartLength && commentEl && commentEl.firstChild) {
      const offsetInComment = targetOffset - chordPartLength;
      const maxLen = commentEl.firstChild.textContent?.length || 0;
      range.setStart(commentEl.firstChild, Math.min(offsetInComment, maxLen));
    } else if (p.firstChild && p.firstChild.nodeType === Node.TEXT_NODE) {
      const maxLen = p.firstChild.textContent?.length || 0;
      range.setStart(p.firstChild, Math.min(targetOffset, maxLen));
    } else {
      range.selectNodeContents(p);
      range.collapse(false);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private getTextOffsetInBlock(root: Node, targetContainer: Node, targetOffset: number): number {
    let offset = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      if (node === targetContainer) {
        return offset + targetOffset;
      }
      offset += node.textContent?.length || 0;
      node = walker.nextNode();
    }

    if (targetContainer.nodeType === Node.ELEMENT_NODE) {
      const children = Array.from(targetContainer.childNodes);
      let count = 0;
      for (let i = 0; i < targetOffset && i < children.length; i++) {
        count += children[i].textContent?.length || 0;
      }
      return offset + count;
    }

    return offset;
  }

  private setCursorAtTextOffsetInBlock(root: HTMLElement, targetOffset: number, prefixLength: number): void {
    const selection = window.getSelection();
    if (!selection) return;

    const prefixSpan = root.querySelector('.section-prefix') as HTMLElement | null;
    const suffixSpan = root.querySelector('.section-suffix') as HTMLElement | null;
    const range = document.createRange();

    if (targetOffset >= prefixLength && suffixSpan) {
      const suffixOffset = targetOffset - prefixLength;
      if (!suffixSpan.firstChild) {
        const textNode = document.createTextNode('');
        suffixSpan.appendChild(textNode);
      }
      const targetNode = suffixSpan.firstChild!;
      range.setStart(targetNode, Math.min(suffixOffset, targetNode.textContent?.length || 0));
    } else if (prefixSpan && prefixSpan.firstChild) {
      range.setStart(prefixSpan.firstChild, Math.min(targetOffset, prefixSpan.firstChild.textContent?.length || 0));
    } else {
      range.selectNodeContents(root);
      range.collapse(false);
    }

    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private restoreCursorInSimpleBlock(block: HTMLElement, targetOffset: number): void {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    const textNode = block.firstChild;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      range.setStart(textNode, Math.min(targetOffset, textNode.textContent?.length || 0));
    } else {
      range.selectNodeContents(block);
      range.collapse(false);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private syncFromEditor() {
    if (!this.editorRef?.nativeElement) return;
    const editor = this.editorRef.nativeElement;
    const h1 = editor.querySelector('h1');
    const fullTitle = h1?.textContent?.trim() || '';

    // Detección de " - ": si el usuario escribe "Titulo - Autor"
    const sepIdx = fullTitle.indexOf(' - ');
    if (sepIdx !== -1) {
      this.title = fullTitle.substring(0, sepIdx).trim();
      this.author = fullTitle.substring(sepIdx + 3).trim();
    } else {
      this.title = fullTitle;
      this.author = '';
    }

    const bodyLines: string[] = [];
    for (const child of Array.from(editor.children) as HTMLElement[]) {
      if (child.tagName === 'H1') continue;
      if (child.tagName === 'DIV' && (child.classList.contains('section-card') || child.classList.contains('chord-card'))) {
        const subParas = child.querySelectorAll('p');
        if (subParas.length > 0) {
          for (const cardChild of Array.from(subParas)) {
            const raw = cardChild.textContent || '';
            bodyLines.push(this.chordTransposer.formatLineWithEllipsisComment(raw));
          }
        } else {
          const raw = child.textContent || '';
          bodyLines.push(this.chordTransposer.formatLineWithEllipsisComment(raw));
        }
      } else {
        const raw = child.textContent || '';
        if (child.classList.contains('block-section-line') || raw.includes(':')) {
          bodyLines.push(this.chordTransposer.formatSectionLineWithEllipsis(raw));
        } else {
          bodyLines.push(raw);
        }
      }
    }

    this.content = bodyLines.join('\n');
    this.hasContent = !!(fullTitle || this.content.trim());
  }

  private getClosestBlock(node: Node | null, root: HTMLElement): HTMLElement | null {
    let curr: Node | null = node;
    while (curr && curr !== root) {
      if (curr.nodeType === Node.ELEMENT_NODE) {
        const el = curr as HTMLElement;
        if (el.tagName === 'H1' || el.tagName === 'P') {
          return el;
        }
      }
      curr = curr.parentNode;
    }
    return null;
  }

  private getTextBeforeCursorInBlock(block: HTMLElement, range: Range): string {
    const preRange = range.cloneRange();
    preRange.selectNodeContents(block);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString();
  }

  private replacePrefixInBlock(block: HTMLElement, newPrefix: string): void {
    const existingText = block.textContent || '';
    const cleanedText = existingText.replace(/^([-.]|\d+\.?|[a-zA-Z]\.?)\s*/, '');
    const fullText = newPrefix + cleanedText;

    block.className = 'block-list-item block-text';
    block.setAttribute('data-block', 'list');
    block.innerHTML = this.escapeHtml(fullText);

    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    const textNode = block.firstChild;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      range.setStart(textNode, Math.min(newPrefix.length, textNode.textContent?.length || 0));
    } else {
      range.selectNodeContents(block);
      range.collapse(false);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private setCursorAtStartOfBlock(block: HTMLElement): void {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    if (block.firstChild && block.firstChild.nodeType === Node.TEXT_NODE) {
      range.setStart(block.firstChild, 0);
    } else {
      range.setStart(block, 0);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  private setCursorAtEndOfBlock(block: HTMLElement): void {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    if (block.firstChild && block.firstChild.nodeType === Node.TEXT_NODE) {
      const len = block.firstChild.textContent?.length || 0;
      range.setStart(block.firstChild, len);
    } else {
      range.selectNodeContents(block);
      range.collapse(false);
    }
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  onEditorKeydown(event: KeyboardEvent) {
    if (this.isLocked) {
      event.preventDefault();
      return;
    }
    const editor = this.editorRef?.nativeElement;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);

    const h1 = editor.querySelector('h1');
    const currentBlock = this.getClosestBlock(range.startContainer, editor);

    // ─── 1. Disparador de viñetas numéricas y alfabéticas con PUNTO "." ("1.", "a.") ───
    if (event.key === '.' && currentBlock && currentBlock !== h1 && range.collapsed) {
      const textBefore = this.getTextBeforeCursorInBlock(currentBlock, range);

      // "1" + "." -> "1.\u00A0 "
      const numMatch = textBefore.match(/^(\d+)$/);
      if (numMatch) {
        event.preventDefault();
        this.replacePrefixInBlock(currentBlock, `${numMatch[1]}.\u00A0 `);
        this.onEditorInput();
        return;
      }

      // "a" o "A" + "." -> "a.\u00A0 "
      const letterMatch = textBefore.match(/^([a-zA-Z])$/);
      if (letterMatch) {
        event.preventDefault();
        this.replacePrefixInBlock(currentBlock, `${letterMatch[1]}.\u00A0 `);
        this.onEditorInput();
        return;
      }
    }

    // ─── 2. Disparador de viñetas con ESPACIO ("- ", ". ", "1. ", "a. ") y tres puntos tras ":" ───
    if (event.key === ' ' && currentBlock && currentBlock !== h1 && range.collapsed) {
      const textBefore = this.getTextBeforeCursorInBlock(currentBlock, range);

      // Si se da espacio tras los dos puntos ':' en notas musicales (ej. 'Intro:' + ESPACIO -> 'Intro: ... ')
      if (this.noteType === 'music') {
        const prefixEl = currentBlock.querySelector('.section-prefix') as HTMLElement | null;
        const suffixEl = currentBlock.querySelector('.section-suffix') as HTMLElement | null;

        // Subcaso A: Bloque ya estructurado con .section-prefix
        if (prefixEl) {
          const suffixText = suffixEl?.textContent || '';
          if (textBefore.trimEnd().endsWith(':') || !suffixText.trim()) {
            event.preventDefault();
            if (suffixEl) {
              suffixEl.textContent = ' ... ';
              this.setCursorAtEndOfBlock(suffixEl);
            } else {
              const newSuffix = document.createElement('span');
              newSuffix.className = 'section-suffix';
              newSuffix.textContent = ' ... ';
              currentBlock.appendChild(newSuffix);
              this.setCursorAtEndOfBlock(newSuffix);
            }
            this.onEditorInput();
            return;
          }
        }

        // Subcaso B: Párrafo de texto plano donde se escribió 'Intro:' y se da ESPACIO
        if (textBefore.trimEnd().endsWith(':')) {
          const fullText = currentBlock.textContent || '';
          const colonIdx = fullText.indexOf(':');
          if (colonIdx !== -1) {
            event.preventDefault();
            const prefixText = fullText.substring(0, colonIdx + 1);
            const rawAfterColon = fullText.substring(colonIdx + 1).trim();

            currentBlock.className = 'block-section-line';
            currentBlock.setAttribute('data-block', 'section');

            const suffixContent = rawAfterColon ? ` ... ${rawAfterColon}` : ' ... ';
            currentBlock.innerHTML = `<span class="section-prefix">${this.escapeHtml(prefixText)}</span><span class="section-suffix">${this.escapeHtml(suffixContent)}</span>`;

            const suffixSpan = currentBlock.querySelector('.section-suffix') as HTMLElement;
            if (rawAfterColon) {
              this.setCursorAtTextOffsetInBlock(currentBlock, prefixText.length + 5, prefixText.length);
            } else {
              this.setCursorAtEndOfBlock(suffixSpan);
            }
            this.onEditorInput();
            return;
          }
        }
      }

      // "- " o ". " -> Viñeta de punto negro "•\u00A0 "
      if (textBefore === '-' || textBefore === '.') {
        event.preventDefault();
        this.replacePrefixInBlock(currentBlock, '•\u00A0 ');
        this.onEditorInput();
        return;
      }

      // "1. " o cualquier número seguido de "." -> Viñeta numérica
      const numMatch = textBefore.match(/^(\d+)\.$/);
      if (numMatch) {
        event.preventDefault();
        this.replacePrefixInBlock(currentBlock, `${numMatch[1]}.\u00A0 `);
        this.onEditorInput();
        return;
      }

      // "a. " o "A. " -> Viñeta alfabética
      const letterMatch = textBefore.match(/^([a-zA-Z])\.$/);
      if (letterMatch) {
        event.preventDefault();
        this.replacePrefixInBlock(currentBlock, `${letterMatch[1]}.\u00A0 `);
        this.onEditorInput();
        return;
      }
    }

    // ─── 2. Manejo de ENTER en viñetas y bloques generales ─────────────────
    if (event.key === 'Enter' && !event.shiftKey) {
      if (currentBlock && currentBlock !== h1) {
        const fullBlockText = (currentBlock.textContent || '').trimEnd();

        // Detectar si el bloque actual es una viñeta
        const bulletMatch = fullBlockText.match(/^•\s*(.*)$/);
        const numMatch = fullBlockText.match(/^(\d+)\.\s*(.*)$/);
        const letterMatch = fullBlockText.match(/^([a-zA-Z])\.\s*(.*)$/);

        // Caso A: Viñeta con punto negro
        if (bulletMatch) {
          event.preventDefault();
          const itemContent = bulletMatch[1].trim();

          if (!itemContent) {
            // Viñeta vacía: salir de la lista
            currentBlock.className = 'block-text';
            currentBlock.setAttribute('data-block', 'text');
            currentBlock.innerHTML = '<br>';
            this.setCursorAtStartOfBlock(currentBlock);
            this.onEditorInput();
            return;
          }

          // Viñeta con contenido: crear siguiente elemento con '•\u00A0 '
          const p = document.createElement('p');
          p.className = 'block-list-item block-text';
          p.setAttribute('data-block', 'list');
          p.innerHTML = '•&nbsp; ';
          currentBlock.after(p);
          this.setCursorAtEndOfBlock(p);
          this.onEditorInput();
          return;
        }

        // Caso B: Viñeta numérica "1. ", "2. ", etc.
        if (numMatch) {
          event.preventDefault();
          const itemContent = numMatch[2].trim();

          if (!itemContent) {
            // Número vacío: salir de la lista
            currentBlock.className = 'block-text';
            currentBlock.setAttribute('data-block', 'text');
            currentBlock.innerHTML = '<br>';
            this.setCursorAtStartOfBlock(currentBlock);
            this.onEditorInput();
            return;
          }

          const nextNum = parseInt(numMatch[1], 10) + 1;
          const p = document.createElement('p');
          p.className = 'block-list-item block-text';
          p.setAttribute('data-block', 'list');
          p.innerHTML = `${nextNum}.&nbsp; `;
          currentBlock.after(p);
          this.setCursorAtEndOfBlock(p);
          this.onEditorInput();
          return;
        }

        // Caso C: Viñeta alfabética "a. ", "b. ", etc.
        if (letterMatch) {
          event.preventDefault();
          const itemContent = letterMatch[2].trim();

          if (!itemContent) {
            // Letra vacía: salir de la lista
            currentBlock.className = 'block-text';
            currentBlock.setAttribute('data-block', 'text');
            currentBlock.innerHTML = '<br>';
            this.setCursorAtStartOfBlock(currentBlock);
            this.onEditorInput();
            return;
          }

          const charCode = letterMatch[1].charCodeAt(0);
          const nextLetter = String.fromCharCode(charCode + 1);
          const p = document.createElement('p');
          p.className = 'block-list-item block-text';
          p.setAttribute('data-block', 'list');
          p.innerHTML = `${nextLetter}.&nbsp; `;
          currentBlock.after(p);
          this.setCursorAtEndOfBlock(p);
          this.onEditorInput();
          return;
        }
      }

      // Enter para título, secciones y bloques
      if (currentBlock) {
        event.preventDefault();
        range.setEnd(currentBlock, currentBlock.childNodes.length);
        const extracted = range.extractContents();
        const extractedText = extracted.textContent || '';
        const currentText = currentBlock.textContent || '';
        const colonIdx = currentText.indexOf(':');

        // Activación de Card de Notas Musicales cuando la línea tiene ':' y se da salto de línea (Enter) en canciones
        if (colonIdx !== -1 && currentBlock !== h1 && this.noteType === 'music') {
          // El bloque actual es la Sección (ej. Intro:, Estrofa:, Coro:)
          currentBlock.className = 'block-section-line';
          currentBlock.setAttribute('data-block', 'section');
          const formatted = this.chordTransposer.formatSectionLineWithEllipsis(currentText);
          const fColonIdx = formatted.indexOf(':');
          const prefix = formatted.substring(0, fColonIdx + 1);
          const suffix = formatted.substring(fColonIdx + 1);
          currentBlock.innerHTML = `<span class="section-prefix">${this.escapeHtml(prefix)}</span><span class="section-suffix">${suffix ? this.escapeHtml(suffix) : ''}</span>`;

          // Si el bloque estaba dentro de una card de acordes existente, moverlo fuera de ella
          const parentChordCard = currentBlock.closest('.chord-card') as HTMLElement | null;
          let insertAnchor: HTMLElement = currentBlock;
          if (parentChordCard) {
            parentChordCard.after(currentBlock);
            insertAnchor = currentBlock;
          }

          // Debajo de la sección, se crea el siguiente bloque para notas/acordes o texto
          const p = document.createElement('p');
          p.className = 'block-text';
          p.setAttribute('data-block', 'text');
          p.innerHTML = extractedText.trim() ? this.escapeHtml(extractedText) : '<br>';

          insertAnchor.after(p);

          this.setCursorAtStartOfBlock(p);
          this.onEditorInput();
          return;
        }

        // Si se presiona Enter dentro de una chord-card
        const parentChordCard = currentBlock.closest('.chord-card') as HTMLElement | null;
        if (parentChordCard) {
          const currentText = (currentBlock.textContent || '').trim();
          // SEGUNDO ENTER: Salir del cuadro si se presiona Enter en una línea que ya está vacía
          if (!currentText) {
            const p = document.createElement('p');
            p.className = 'block-text';
            p.setAttribute('data-block', 'text');
            p.innerHTML = '<br>';

            if (parentChordCard.children.length > 1) {
              currentBlock.remove();
              parentChordCard.after(p);
            } else {
              parentChordCard.replaceWith(p);
            }

            // Insertar fuera de la tarjeta, justo debajo
            this.setCursorAtStartOfBlock(p);
            this.onEditorInput();
            return;
          } else {
            // PRIMER ENTER: Crear nueva línea dentro de la misma tarjeta para escribir acordes abajo
            if (this.noteType === 'music') {
              const raw = currentBlock.textContent || '';
              const formattedLine = this.chordTransposer.formatLineWithEllipsisComment(raw);
              const { chordPart, commentPart } = this.chordTransposer.splitLineIntoChordsAndComment(formattedLine);
              if (commentPart) {
                currentBlock.innerHTML = `${this.escapeHtml(chordPart)}<span class="chord-comment">${this.escapeHtml(commentPart)}</span>`;
              } else if (raw !== chordPart) {
                currentBlock.innerHTML = this.escapeHtml(chordPart);
              }
            }

            const p = document.createElement('p');
            p.className = 'block-chord-line';
            p.setAttribute('data-block', 'chord');
            p.innerHTML = extractedText.trim() ? this.escapeHtml(extractedText) : '<br>';

            if (!currentBlock.childNodes.length || currentBlock.innerHTML === '') {
              currentBlock.innerHTML = '<br>';
            }

            currentBlock.after(p);
            this.setCursorAtStartOfBlock(p);
            this.onEditorInput();
            return;
          }
        }

        // Enter normal (sin ':')
        const p = document.createElement('p');
        p.className = 'block-text';
        p.setAttribute('data-block', 'text');
        if (extractedText.trim().length > 0 || extracted.querySelector('img, span, b, i, strong, em')) {
          p.appendChild(extracted);
        } else {
          p.innerHTML = '<br>';
        }

        if (!currentBlock.childNodes.length || currentBlock.innerHTML === '') {
          currentBlock.innerHTML = '<br>';
        }

        currentBlock.after(p);

        const newRange = document.createRange();
        if (p.firstChild && p.firstChild.nodeType === Node.TEXT_NODE) {
          newRange.setStart(p.firstChild, 0);
        } else {
          newRange.setStart(p, 0);
        }
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        this.onEditorInput();
        return;
      }
    }

    // ─── 3. Manejo de BACKSPACE en viñetas, comentarios y combinación de bloques ───────
    if (event.key === 'Backspace' && currentBlock && currentBlock !== h1 && range.collapsed) {
      // Caso 3.1: Borrado de comentarios de notas (... comentario)
      const chordComment = currentBlock.querySelector('.chord-comment') as HTMLElement | null;
      if (chordComment && (chordComment === range.startContainer || chordComment.contains(range.startContainer))) {
        const commentText = chordComment.textContent || '';
        const trimmedComment = commentText.trim();
        const withoutDots = trimmedComment.replace(/^(\.{1,3}|…)\s*/, '');
        const offsetInComment = this.getTextOffsetInBlock(chordComment, range.startContainer, range.startOffset);
        const dotsEnd = commentText.indexOf('...') !== -1 ? commentText.indexOf('...') + 3 : (commentText.indexOf('…') !== -1 ? commentText.indexOf('…') + 1 : 0);

        // Si sólo quedan los tres puntos (o está vacío), o el cursor está sobre o justo tras los tres puntos:
        if (!withoutDots || offsetInComment <= dotsEnd + 1) {
          event.preventDefault();
          chordComment.remove();
          this.setCursorAtEndOfBlock(currentBlock);
          this.onEditorInput();
          return;
        }
      }

      // Caso 3.2: Borrado de sufijo de sección (Intro: ... comentario)
      const sectionSuffix = currentBlock.querySelector('.section-suffix') as HTMLElement | null;
      if (sectionSuffix && (sectionSuffix === range.startContainer || sectionSuffix.contains(range.startContainer))) {
        const suffixText = sectionSuffix.textContent || '';
        const trimmedSuffix = suffixText.trim();
        const withoutDots = trimmedSuffix.replace(/^(\.{1,3}|…)\s*/, '');
        const offsetInSuffix = this.getTextOffsetInBlock(sectionSuffix, range.startContainer, range.startOffset);
        const dotsEnd = suffixText.indexOf('...') !== -1 ? suffixText.indexOf('...') + 3 : (suffixText.indexOf('…') !== -1 ? suffixText.indexOf('…') + 1 : 0);

        // Si sólo quedan los tres puntos (o está vacío), o el cursor está sobre o justo tras los tres puntos:
        if (!withoutDots || offsetInSuffix <= dotsEnd + 1) {
          event.preventDefault();
          sectionSuffix.textContent = '';
          const prefixEl = currentBlock.querySelector('.section-prefix') as HTMLElement | null;
          if (prefixEl) {
            this.setCursorAtEndOfBlock(prefixEl);
          } else {
            this.setCursorAtStartOfBlock(currentBlock);
          }
          this.onEditorInput();
          return;
        }
      }

      const fullText = currentBlock.textContent || '';
      const listMatch = fullText.match(/^(•\s*|\d+\.\s*|[a-zA-Z]\.\s*)/);

      // Si es una viñeta y el cursor está justo tras el prefijo (o al inicio):
      if (listMatch) {
        const prefixLen = listMatch[0].length;
        const textBeforeCursor = this.getTextBeforeCursorInBlock(currentBlock, range);

        if (textBeforeCursor.length <= prefixLen) {
          event.preventDefault();
          const remainder = fullText.substring(prefixLen);
          currentBlock.className = 'block-text';
          currentBlock.setAttribute('data-block', 'text');
          currentBlock.innerHTML = remainder ? this.escapeHtml(remainder) : '<br>';
          this.setCursorAtStartOfBlock(currentBlock);
          this.onEditorInput();
          return;
        }
      }

      // Backspace al inicio de una línea normal (combinar con la anterior)
      const prevBlock = currentBlock?.previousElementSibling as HTMLElement | null;
      if (prevBlock && range.startOffset === 0) {
        event.preventDefault();
        const textToMerge = (currentBlock.textContent || '').trim();
        const targetBlock = prevBlock.classList.contains('chord-card')
          ? (prevBlock.lastElementChild as HTMLElement || prevBlock)
          : prevBlock;

        const prevLen = targetBlock.textContent?.length || 0;

        if (targetBlock.innerHTML === '<br>') {
          targetBlock.innerHTML = '';
        }

        if (textToMerge) {
          targetBlock.appendChild(document.createTextNode(textToMerge));
        } else if (!targetBlock.childNodes.length) {
          targetBlock.innerHTML = '<br>';
        }

        currentBlock.remove();

        const newRange = document.createRange();
        const targetNode = targetBlock.lastChild || targetBlock;
        if (targetNode.nodeType === Node.TEXT_NODE) {
          newRange.setStart(targetNode, Math.min(prevLen, targetNode.textContent?.length || 0));
        } else {
          newRange.setStart(targetBlock, targetBlock.childNodes.length);
        }
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        this.onEditorInput();
        return;
      }
    }
  }

  onEditorKeyup(event: KeyboardEvent) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) {
      return;
    }
    this.normalizeBlocks();
    this.syncFromEditor();
  }

  onEditorInput() {
    if (this.isLocked) return;
    this.isDirty = true;
    this.normalizeBlocks();
    this.syncFromEditor();
    if (this.semitoneOffset !== 0) {
      this.baseContentForTranspose = this.chordTransposer.transposeText(
        this.content,
        -this.semitoneOffset,
        this.originalKeyPrefersFlats
      );
    } else {
      this.baseContentForTranspose = this.content;
      this.detectedOriginalKey = this.chordTransposer.detectOriginalKey(this.baseContentForTranspose);
      this.originalKeyPrefersFlats = this.chordTransposer.detectAccidentalPreference(this.baseContentForTranspose) || (this.detectedOriginalKey?.includes('b') ?? false);
    }
    this.saveSubject.next();
  }

  onEditorPaste(event: ClipboardEvent) {
    if (this.isLocked) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    if (!text) return;

    const editor = this.editorRef?.nativeElement;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      document.execCommand('insertText', false, text);
      this.onEditorInput();
      return;
    }

    const range = selection.getRangeAt(0);
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText.split('\n');

    if (lines.length === 1) {
      // 1 sola línea: insertar en la posición actual del cursor
      range.deleteContents();
      const textNode = document.createTextNode(lines[0]);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      this.onEditorInput();
      return;
    }

    // Múltiples líneas: separar en bloques independientes
    const currentBlock = this.getClosestBlock(range.startContainer, editor);
    if (!currentBlock) {
      document.execCommand('insertText', false, text);
      this.onEditorInput();
      return;
    }

    range.deleteContents();
    const firstLineNode = document.createTextNode(lines[0]);
    range.insertNode(firstLineNode);

    let lastInserted: HTMLElement = currentBlock;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const p = document.createElement('p');
      const colonIdx = line.indexOf(':');
      const isList = /^(•|\d+\.|[a-zA-Z]\.)\s*/.test(line);
      if (colonIdx !== -1) {
        const prefix = line.substring(0, colonIdx + 1);
        const suffix = line.substring(colonIdx + 1);
        p.className = 'block-section-line';
        p.setAttribute('data-block', 'section');
        p.innerHTML = `<span class="section-prefix">${this.escapeHtml(prefix)}</span><span class="section-suffix">${suffix ? this.escapeHtml(suffix) : ''}</span>`;
      } else if (isList) {
        p.className = 'block-list-item block-text';
        p.setAttribute('data-block', 'list');
        p.innerHTML = line ? this.escapeHtml(line) : '<br>';
      } else {
        p.className = 'block-text';
        p.setAttribute('data-block', 'text');
        p.innerHTML = line ? this.escapeHtml(line) : '<br>';
      }
      lastInserted.after(p);
      lastInserted = p;
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(lastInserted);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);

    this.onEditorInput();
  }

  onEditorFocus() {
    this.isKeyboardOpen = true;
  }

  onEditorBlur() {
    setTimeout(() => {
      if (!this.isEditorActive()) {
        this.isKeyboardOpen = false;
      }
    }, 150);
  }

  dismissKeyboard() {
    this.isKeyboardOpen = false;
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.editorRef?.nativeElement?.blur();
    if (Capacitor.isNativePlatform()) {
      void Keyboard.hide().catch(() => {});
    }
  }

  openKeyboard() {
    if (this.isLocked) return;
    this.isKeyboardOpen = true;
    const editor = this.editorRef?.nativeElement;
    if (!editor) return;
    const lastChild = editor.lastElementChild || editor;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(lastChild);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.focus();
    if (Capacitor.isNativePlatform()) {
      void Keyboard.show().catch(() => {});
    }
  }

  onScreenClick(event: MouseEvent) {
    if (this.isLocked) return;

    // Si el clic es sobre controles interactivos (botones, fab, modal, etc.), no intervenir
    const target = event.target as HTMLElement | null;
    if (target?.closest('ion-button, ion-fab, app-top-navbar, app-transpose-modal, app-base-modal')) {
      return;
    }

    const isClickOnText = target && (
      target.tagName === 'P' ||
      target.tagName === 'H1' ||
      target.tagName === 'SPAN' ||
      target.classList.contains('block-chord-line') ||
      target.classList.contains('block-text') ||
      target.classList.contains('block-title') ||
      target.classList.contains('block-section-line') ||
      target.classList.contains('section-prefix') ||
      target.classList.contains('section-suffix') ||
      target.classList.contains('chord-comment')
    );

    // Si el teclado está abierto: un clic en el espacio libre/pantalla lo CIERRA
    if (this.isKeyboardOpen || this.isEditorActive()) {
      if (!isClickOnText || target === event.currentTarget || target?.classList.contains('editor-container') || target?.classList.contains('editor-wrapper')) {
        event.preventDefault();
        event.stopPropagation();
        this.dismissKeyboard();
      }
      return;
    }

    // Si el teclado está cerrado: un clic en el espacio libre/pantalla lo ABRE
    if (!isClickOnText || target === event.currentTarget || target?.classList.contains('editor-container') || target?.classList.contains('editor-wrapper')) {
      this.openKeyboard();
    }
  }

  // ─── Scroll / Gesture handlers ────────────────────────────────────────────

  handleScroll(event: Event) {
    const scrollTop = (event as CustomEvent<{ scrollTop: number }>).detail?.scrollTop ?? 0;
    const delta = scrollTop - this.lastScrollTop;

    if (scrollTop <= SCROLL_TOP_THRESHOLD && delta <= 0) {
      this.setDateVisible(true);
    } else if (delta > SCROLL_DOWN_DELTA) {
      this.setDateVisible(false);
    } else if (delta < SCROLL_UP_DELTA && scrollTop < SCROLL_NEAR_TOP) {
      this.setDateVisible(true);
    }

    this.lastScrollTop = Math.max(0, scrollTop);
  }

  handleGestureStart(event: TouchEvent) {
    this.gestureStartY = event.touches[0]?.clientY;
  }

  handleGestureMove(event: TouchEvent) {
    const currentY = event.touches[0]?.clientY;

    if (this.gestureStartY !== undefined && currentY !== undefined) {
      const deltaY = currentY - this.gestureStartY;
      if (deltaY > 10 && this.lastScrollTop <= 12) {
        this.setDateVisible(true);
      } else if (deltaY < -10) {
        this.setDateVisible(false);
      }
    }
  }

  handleGestureEnd() {
    this.gestureStartY = undefined;
    if (this.isDateVisible && this.lastScrollTop > SCROLL_TOP_THRESHOLD) {
      clearTimeout(this.dateHideTimeout);
      this.dateHideTimeout = setTimeout(() => {
        this.setDateVisible(false);
      }, DATE_HIDE_DELAY_MS);
    }
  }

  handleGestureCancel() {
    this.gestureStartY = undefined;
  }

  private setDateVisible(visible: boolean) {
    if (this.isDateVisible !== visible) {
      this.isDateVisible = visible;
    }
  }

  // ─── Lock Mode ────────────────────────────────────────────────────────────

  toggleLock() {
    if (!this.hasContent && !this.isLocked) return;
    this.isLocked = !this.isLocked;
    if (this.isLocked) {
      this.editorRef?.nativeElement?.blur();
      void this.actionSheetController.dismiss().catch(() => {});
      this.backButtonSub?.unsubscribe();
      this.backButtonSub = this.platform.backButton.subscribeWithPriority(9999, () => {
        // Bloquear retroceso de hardware mientras esté en modo bloqueo
      });
    } else {
      this.backButtonSub?.unsubscribe();
      this.backButtonSub = undefined;
    }
  }

  // ─── Options Action Sheet ──────────────────────────────────────────────────

  async openOptions() {
    if (!this.hasContent || this.isLocked) return;

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const isMusic = this.noteType === 'music';
    const sheetHeader = this.title ? this.title : (isMusic ? 'Partitura' : 'Nota');

    const sheet = await this.actionSheetController.create({
      header: sheetHeader,
      cssClass: 'note-options-action-sheet',
      buttons: [
        {
          text: isMusic ? 'Compartir PDF de partitura' : 'Compartir como PDF',
          icon: 'document-text-outline',
          handler: () => {
            void this.sharePdf();
          }
        },
        {
          text: 'Compartir texto',
          icon: 'share-outline',
          handler: () => {
            void this.shareText();
          }
        },
        {
          text: isMusic ? 'Eliminar partitura' : 'Eliminar nota',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.openDeleteConfirm();
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel',
          icon: 'close-outline'
        }
      ]
    });

    await sheet.present();
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  onFormatClick(event?: Event) {
    if (!this.hasContent || this.isLocked) return;
    this.transposeEvent = (event as MouseEvent) ?? null;
    this.openTransposeModal();
  }

  openTransposeModal() {
    this.syncFromEditor();
    if (this.semitoneOffset === 0) {
      this.baseContentForTranspose = this.content;
    }
    this.detectedOriginalKey = this.chordTransposer.detectOriginalKey(this.baseContentForTranspose);
    this.originalKeyPrefersFlats = this.chordTransposer.detectAccidentalPreference(this.baseContentForTranspose) || (this.detectedOriginalKey?.includes('b') ?? false);
    this.preferFlatsForTranspose = false; // Conversiones con sostenidos
    this.isTransposeModalOpen = true;
  }

  closeTransposeModal() {
    this.isTransposeModalOpen = false;
    this.transposeEvent = null;
  }

  onTransposeApplied(finalSemitones: number) {
    this.semitoneOffset = finalSemitones;
    this.saveTranspositionOffset(this.noteId, this.semitoneOffset);
    this.closeTransposeModal();
  }

  onTransposeCancelled() {
    this.closeTransposeModal();
  }

  onSemitonesChange(newSemitones: number) {
    this.semitoneOffset = newSemitones;
    this.saveTranspositionOffset(this.noteId, this.semitoneOffset);
    if (!this.baseContentForTranspose) {
      this.baseContentForTranspose = this.content;
    }
    // Si regresa a 0 semitones, restaurar exactamente el contenido original base
    if (this.semitoneOffset === 0) {
      this.content = this.baseContentForTranspose;
      this.setEditorContent(this.title, this.content);
      return;
    }

    const transposed = this.chordTransposer.transposeText(
      this.baseContentForTranspose,
      this.semitoneOffset,
      false // usar sostenidos para conversiones
    );
    this.content = transposed;
    this.setEditorContent(this.title, this.content);
  }

  async sharePdf() {
    if (this.isLocked) return;
    this.syncFromEditor();

    await this.pdfExportService.exportAndSharePdf({
      title: this.title || (this.noteType === 'music' ? 'Partitura' : 'Nota'),
      author: this.author,
      content: this.content,
      noteType: this.noteType,
      originalKey: this.detectedOriginalKey,
      currentKey: this.currentKeyDisplay,
      semitoneOffset: this.semitoneOffset,
      formattedDate: this.formattedFullDate
    });
  }

  async shareText() {
    if (this.isLocked) return;
    this.syncFromEditor();
    const shareTitle = this.title || (this.noteType === 'music' ? 'Partitura' : 'Nota');
    const shareText = `${this.title ? this.title + '\n\n' : ''}${this.content}`;

    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: shareTitle,
          text: shareText
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn('Error al compartir texto nativo:', err);
        }
        return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn('Error al compartir texto:', err);
        }
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText);
      } catch (clipErr) {
        console.warn('No se pudo copiar al portapapeles:', clipErr);
      }
    }
  }

  /** Alias para mantener compatibilidad con llamadas existentes */
  shareNote() {
    return this.sharePdf();
  }

  async createAnotherNote() {
    if (this.isLocked) return;
    await this.handleLeaveOrSave();
    this.noteId = 'new';
    this.title = '';
    this.content = '';
    this.isDirty = false;
    this.hasContent = false;
    this.setEditorContent('', '');
    this.formattedFullDate = this.formatFullDate(new Date());
    this.location.replaceState(`/notes/${this.folderId}/new`);
    this.noteSubscription?.unsubscribe();
    this.noteSubscription = undefined;
    setTimeout(() => {
      this.focusTitleLine();
    }, 100);
  }

  openDeleteConfirm() {
    if (this.isLocked) return;
    this.isDeleteConfirmOpen = true;
  }

  closeDeleteConfirm() {
    this.isDeleteConfirmOpen = false;
  }

  async confirmDelete() {
    this.isDeleting = true;
    this.isDirty = false;
    try {
      if (this.noteId !== 'new') {
        this.removeSavedTranspositionOffset(this.noteId);
        const res = await this.deleteNoteUseCase.execute({ id: this.noteId });
        if (!res.success) {
          this.errorMessage = res.message || 'No se pudo eliminar la nota.';
          return;
        }
      }
      this.isDeleteConfirmOpen = false;
      await this.navService.back();
    } catch {
      this.errorMessage = 'No se pudo eliminar la nota.';
    } finally {
      this.isDeleting = false;
    }
  }

  async save(forcedContent?: string): Promise<void> {
    if (!forcedContent) {
      this.syncFromEditor();
    }
    const trimmedTitle = this.title.trim();

    const rawContent = forcedContent ?? this.content;
    // A la base de datos SIEMPRE se persiste en la tonalidad base original,
    // preservando al 100% todos los textos, acordes y comentarios modificados
    let contentToSave = rawContent;
    if (this.semitoneOffset !== 0 && rawContent) {
      if (this.isDirty) {
        contentToSave = this.chordTransposer.transposeText(
          rawContent,
          -this.semitoneOffset,
          this.originalKeyPrefersFlats
        );
        this.baseContentForTranspose = contentToSave;
      } else {
        contentToSave = this.baseContentForTranspose || rawContent;
      }
    } else {
      this.baseContentForTranspose = rawContent;
      contentToSave = rawContent;
    }
    const trimmedContent = contentToSave.trim();

    if (!trimmedTitle && !trimmedContent) {
      return;
    }

    if (this.isSaving) {
      this.pendingSaveAgain = true;
      return this.savePromise ?? Promise.resolve();
    }

    this.isSaving = true;
    this.savePromise = (async () => {
      try {
        const titleToSave = trimmedTitle || 'Sin título';

        if (this.noteId === 'new') {
          const res = await this.createNoteUseCase.execute({
            folderId: this.folderId,
            title: titleToSave,
            content: contentToSave,
            author: this.author ? this.author : undefined,
            type: this.noteType
          });
          if (!res.success || !res.data) {
            this.errorMessage = res.message || 'No se pudo crear la nota.';
            return;
          }
          const note = res.data;
          this.noteId = note.id;
          this.isDirty = false;
          if (this.semitoneOffset !== 0) {
            this.saveTranspositionOffset(this.noteId, this.semitoneOffset);
          }
          this.location.replaceState(`/notes/${this.folderId}/${note.id}`);
          this.subscribeToNote(note.id);
        } else {
          const res = await this.updateNoteUseCase.execute({
            id: this.noteId,
            title: titleToSave,
            content: contentToSave,
            author: this.author ? this.author : undefined,
            type: this.noteType
          });
          if (!res.success) {
            this.errorMessage = res.message || 'No se pudo guardar la nota.';
            return;
          }
          this.isDirty = false;
          if (this.semitoneOffset === 0) {
            this.detectedOriginalKey = this.chordTransposer.detectOriginalKey(this.baseContentForTranspose);
          }
        }
      } catch {
        this.errorMessage = 'No se pudo guardar la nota.';
      } finally {
        this.isSaving = false;
        this.savePromise = null;
        if (this.pendingSaveAgain) {
          this.pendingSaveAgain = false;
          if (this.isDirty) {
            void this.save();
          }
        }
      }
    })();

    return this.savePromise;
  }

  private async handleLeaveOrSave(): Promise<void> {
    if (this.isDeleting) return;

    if (this.isTransposeModalOpen) {
      this.isTransposeModalOpen = false;
    }

    this.syncFromEditor();

    // Guardar el offset de transposición para restaurarlo cuando vuelva a entrar a la nota
    if (this.noteId && this.noteId !== 'new') {
      this.saveTranspositionOffset(this.noteId, this.semitoneOffset);
    }

    // Si el usuario modificó texto o acordes mientras estaba transpuesta,
    // actualizar baseContentForTranspose antes de persistir en base de datos
    if (this.semitoneOffset !== 0) {
      if (this.isDirty && this.content) {
        this.baseContentForTranspose = this.chordTransposer.transposeText(
          this.content,
          -this.semitoneOffset,
          this.originalKeyPrefersFlats
        );
      }
    } else {
      this.baseContentForTranspose = this.content;
    }

    if (this.isSaving && this.savePromise) {
      await this.savePromise;
    }

    const isEmpty = !this.title.trim() && !this.content.trim();

    if (isEmpty) {
      this.isDirty = false;
      if (this.noteId !== 'new') {
        this.removeSavedTranspositionOffset(this.noteId);
        try {
          await this.deleteNoteUseCase.execute({ id: this.noteId });
        } catch {
          // Si falla la eliminación silenciosa, no bloquear la navegación
        }
      }
      return;
    }

    if (this.isDirty) {
      await this.save(this.baseContentForTranspose);
    }
  }

  async backToNotes() {
    if (this.isLocked) return;
    await this.handleLeaveOrSave();
    return this.navService.back();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private formatFullDate(date: Date): string {
    const day = date.getDate();
    const month = new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(date);
    const year = date.getFullYear();
    const time = new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
    return `${day} de ${month} de ${year} a las ${time}`;
  }

  ngOnDestroy() {
    if (Capacitor.isNativePlatform()) {
      void Keyboard.removeAllListeners();
    }
    this.backButtonSub?.unsubscribe();
    clearTimeout(this.dateHideTimeout);
    void this.handleLeaveOrSave();
    this.autoSaveSubscription.unsubscribe();
    this.noteSubscription?.unsubscribe();
    this.routeSubscription.unsubscribe();
  }
}
