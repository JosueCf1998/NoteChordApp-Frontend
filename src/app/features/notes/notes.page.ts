import { Component, OnDestroy, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewWillLeave, ViewDidEnter, Platform } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import {
  GetNoteByIdUseCase,
  CreateNoteUseCase,
  UpdateNoteUseCase,
  DeleteNoteUseCase
} from '../../core/use-cases/notes';
import { NavigationService } from '../../core/navigation/navigation.service';
import { SharedModule, ActionMenuItem } from '../../shared/shared.module';

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

  isLocked = false;
  private backButtonSub?: Subscription;

  folderId = '';
  noteId = '';
  title = '';
  content = '';
  hasContent = false;
  errorMessage = '';
  isLoading = true;
  isDirty = false;
  isSaving = false;
  private savePromise: Promise<void> | null = null;
  private pendingSaveAgain = false;

  isOptionsOpen = false;
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
          this.title = '';
          this.content = '';
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
      this.setEditorContent('', '');
    }
  }

  ionViewDidEnter() {
    if (this.noteId === 'new') {
      setTimeout(() => {
        this.focusTitleLine();
      }, 150);
    }
  }

  ionViewWillLeave() {
    this.backButtonSub?.unsubscribe();
    void this.handleLeaveOrSave();
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

  private subscribeToNote(noteId: string) {
    this.noteSubscription?.unsubscribe();
    this.noteSubscription = this.getNoteByIdUseCase.execute(noteId).subscribe({
      next: (res) => {
        const note = res.data;
        if (note) {
          this.formattedFullDate = this.formatFullDate(note.updatedAt?.toDate?.() || new Date());
          const isFocused = this.isEditorActive();
          // NUNCA sobreescribir el HTML si el usuario está en el editor para evitar que el cursor salte al inicio
          if (!isFocused && !this.isDirty && !this.isSaving) {
            this.title = note.title === 'Sin título' ? '' : note.title;
            this.content = note.content;
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

      const trimmedTitle = title && title !== 'Sin título' ? title : '';
      const trimmedContent = content || '';

      this.hasContent = !!(trimmedTitle || trimmedContent.trim());

      // Línea 1: Siempre <h1> para Título (28px, negrita)
      let html = `<h1 class="block-title" data-block="title">${trimmedTitle ? this.escapeHtml(trimmedTitle) : '<br>'}</h1>`;

      // Líneas siguientes: si contienen ':', parte izquierda es Sección (22px semibold) y derecha Texto (17px regular)
      if (trimmedContent) {
        const lines = trimmedContent.split('\n');
        for (const line of lines) {
          const colonIdx = line.indexOf(':');
          const isList = /^(•|\d+\.|[a-zA-Z]\.)\s*/.test(line);
          if (colonIdx !== -1) {
            const prefix = line.substring(0, colonIdx + 1);
            const suffix = line.substring(colonIdx + 1);
            html += `<p class="block-section-line" data-block="section"><span class="section-prefix">${this.escapeHtml(prefix)}</span><span class="section-suffix">${suffix ? this.escapeHtml(suffix) : ''}</span></p>`;
          } else if (isList) {
            html += `<p class="block-list-item block-text" data-block="list">${this.escapeHtml(line)}</p>`;
          } else {
            html += `<p class="block-text" data-block="text">${line ? this.escapeHtml(line) : '<br>'}</p>`;
          }
        }
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

    const children = Array.from(editor.children) as HTMLElement[];
    if (children.length === 0) {
      editor.innerHTML = '<h1 class="block-title" data-block="title"><br></h1>';
      return;
    }

    // El primer bloque es SIEMPRE H1 (Título)
    if (children[0].tagName !== 'H1') {
      const h1 = document.createElement('h1');
      h1.className = 'block-title';
      h1.setAttribute('data-block', 'title');
      h1.innerHTML = children[0].innerHTML || '<br>';
      children[0].replaceWith(h1);
    } else {
      if (!children[0].classList.contains('block-title')) {
        children[0].className = 'block-title';
      }
      children[0].setAttribute('data-block', 'title');
    }

    // A partir del segundo bloque:
    for (let i = 1; i < children.length; i++) {
      let child = children[i];
      let text = child.textContent || '';

      // Si por error el navegador creó un H1 abajo, lo convertimos a párrafo
      if (child.tagName === 'H1') {
        const p = document.createElement('p');
        p.innerHTML = child.innerHTML || '<br>';
        child.replaceWith(p);
        children[i] = p;
        child = p;
      }

      // Convertir automáticamente '- ' o '. ' a '•\u00A0 ' si viene de teclado virtual o pegado
      if (/^[-.]\s+/.test(text)) {
        this.replacePrefixInBlock(child, '•\u00A0 ');
        text = child.textContent || '';
      }

      // Separar números o letras pegados al punto (ej. "1.a" o "a.algo")
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
      if (isList) {
        child.classList.add('block-list-item');
        child.setAttribute('data-block', 'list');
      } else {
        child.classList.remove('block-list-item');
        if (child.getAttribute('data-block') === 'list') {
          child.setAttribute('data-block', 'text');
        }
      }

      const colonIdx = text.indexOf(':');
      const hasColon = colonIdx !== -1;

      if (hasColon) {
        const prefixText = text.substring(0, colonIdx + 1);
        const suffixText = text.substring(colonIdx + 1);

        const prefixEl = child.querySelector('.section-prefix');
        const isAlreadyStructured = prefixEl?.textContent === prefixText;

        if (!isAlreadyStructured) {
          const selection = window.getSelection();
          let cursorOffset: number | null = null;
          if (selection && selection.rangeCount && child.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            cursorOffset = this.getTextOffsetInBlock(child, range.startContainer, range.startOffset);
          }

          child.className = 'block-section-line';
          child.setAttribute('data-block', 'section');
          child.innerHTML = `<span class="section-prefix">${this.escapeHtml(prefixText)}</span><span class="section-suffix">${suffixText ? this.escapeHtml(suffixText) : ''}</span>`;

          if (cursorOffset !== null) {
            this.setCursorAtTextOffsetInBlock(child, cursorOffset, prefixText.length);
          }
        }
      } else {
        // No tiene dos puntos: asegurar que sea formato texto normal (17px regular)
        if (child.classList.contains('block-section-line') || child.querySelector('.section-prefix')) {
          const selection = window.getSelection();
          let cursorOffset: number | null = null;
          if (selection && selection.rangeCount && child.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            cursorOffset = this.getTextOffsetInBlock(child, range.startContainer, range.startOffset);
          }

          child.className = 'block-text';
          child.setAttribute('data-block', 'text');
          child.innerHTML = text ? this.escapeHtml(text) : '<br>';

          if (cursorOffset !== null) {
            this.restoreCursorInSimpleBlock(child, cursorOffset);
          }
        } else if (!child.classList.contains('block-text')) {
          child.classList.add('block-text');
          child.setAttribute('data-block', 'text');
        }
      }
    }
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
    const titleText = h1?.textContent?.trim() || '';

    const bodyLines: string[] = [];
    let child = h1?.nextElementSibling;
    while (child) {
      bodyLines.push(child.textContent || '');
      child = child.nextElementSibling;
    }

    this.title = titleText;
    this.content = bodyLines.join('\n');
    this.hasContent = !!(this.title || this.content.trim());
  }

  private getClosestBlock(node: Node | null, root: HTMLElement): HTMLElement | null {
    let curr: Node | null = node;
    while (curr && curr !== root) {
      if (curr.nodeType === Node.ELEMENT_NODE && curr.parentElement === root) {
        return curr as HTMLElement;
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

    // ─── 2. Disparador de viñetas con ESPACIO ("- ", ". ", "1. ", "a. ") ───
    if (event.key === ' ' && currentBlock && currentBlock !== h1 && range.collapsed) {
      const textBefore = this.getTextBeforeCursorInBlock(currentBlock, range);

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

      // Enter normal para título y otros bloques
      if (currentBlock) {
        event.preventDefault();
        range.setEnd(currentBlock, currentBlock.childNodes.length);
        const extracted = range.extractContents();
        const extractedText = extracted.textContent || '';
        const colonIdx = extractedText.indexOf(':');
        const p = document.createElement('p');

        if (colonIdx !== -1) {
          const prefix = extractedText.substring(0, colonIdx + 1);
          const suffix = extractedText.substring(colonIdx + 1);
          p.className = 'block-section-line';
          p.setAttribute('data-block', 'section');
          p.innerHTML = `<span class="section-prefix">${this.escapeHtml(prefix)}</span><span class="section-suffix">${suffix ? this.escapeHtml(suffix) : ''}</span>`;
        } else {
          p.className = 'block-text';
          p.setAttribute('data-block', 'text');
          if (extractedText.trim().length > 0 || extracted.querySelector('img, span, b, i, strong, em')) {
            p.appendChild(extracted);
          } else {
            p.innerHTML = '<br>';
          }
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

    // ─── 3. Manejo de BACKSPACE en viñetas y combinación de bloques ───────
    if (event.key === 'Backspace' && currentBlock && currentBlock !== h1 && range.collapsed) {
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
        const textToMerge = currentBlock.textContent || '';
        const prevLen = prevBlock.textContent?.length || 0;

        if (prevBlock.innerHTML === '<br>') {
          prevBlock.innerHTML = '';
        }

        if (textToMerge) {
          prevBlock.appendChild(document.createTextNode(textToMerge));
        } else if (!prevBlock.childNodes.length) {
          prevBlock.innerHTML = '<br>';
        }

        currentBlock.remove();

        const newRange = document.createRange();
        const targetNode = prevBlock.lastChild || prevBlock;
        if (targetNode.nodeType === Node.TEXT_NODE) {
          newRange.setStart(targetNode, Math.min(prevLen, targetNode.textContent?.length || 0));
        } else {
          newRange.setStart(prevBlock, prevBlock.childNodes.length);
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

  onContainerClick(event: MouseEvent) {
    if (this.isLocked) return;
    if (event.target === event.currentTarget && this.editorRef?.nativeElement) {
      const editor = this.editorRef.nativeElement;
      const lastChild = editor.lastElementChild || editor;
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(lastChild);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
      editor.focus();
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
      this.closeOptions();
      this.backButtonSub?.unsubscribe();
      this.backButtonSub = this.platform.backButton.subscribeWithPriority(9999, () => {
        // Bloquear retroceso de hardware mientras esté en modo bloqueo
      });
    } else {
      this.backButtonSub?.unsubscribe();
      this.backButtonSub = undefined;
    }
  }

  // ─── Options popover ──────────────────────────────────────────────────────

  readonly noteMenuItems: ActionMenuItem[] = [
    {
      id: 'share',
      label: 'Compartir nota',
      icon: 'share-outline',
      handler: () => this.shareNote()
    },
    {
      id: 'delete',
      label: 'Eliminar nota',
      icon: 'trash-outline',
      role: 'danger',
      handler: () => this.openDeleteConfirm()
    }
  ];

  openOptions() {
    if (!this.hasContent || this.isLocked) return;
    this.isOptionsOpen = true;
  }

  closeOptions() {
    this.isOptionsOpen = false;
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  onFormatClick() {
    if (!this.hasContent || this.isLocked) return;
    // Sin acción por ahora según lo solicitado
  }

  shareNote() {
    if (this.isLocked) return;
    if (navigator.share) {
      void navigator.share({
        title: this.title || 'Nota',
        text: `${this.title ? this.title + '\n\n' : ''}${this.content}`
      });
    }
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
    this.closeOptions();
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

  async save(): Promise<void> {
    this.syncFromEditor();
    const trimmedTitle = this.title.trim();
    const trimmedContent = this.content.trim();

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
            content: this.content
          });
          if (!res.success || !res.data) {
            this.errorMessage = res.message || 'No se pudo crear la nota.';
            return;
          }
          const note = res.data;
          this.noteId = note.id;
          this.isDirty = false;
          this.location.replaceState(`/notes/${this.folderId}/${note.id}`);
          this.subscribeToNote(note.id);
        } else {
          const res = await this.updateNoteUseCase.execute({
            id: this.noteId,
            title: titleToSave,
            content: this.content
          });
          if (!res.success) {
            this.errorMessage = res.message || 'No se pudo guardar la nota.';
            return;
          }
          this.isDirty = false;
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

    if (this.isSaving && this.savePromise) {
      await this.savePromise;
    }

    this.syncFromEditor();
    const isEmpty = !this.title.trim() && !this.content.trim();

    if (isEmpty) {
      this.isDirty = false;
      if (this.noteId !== 'new') {
        try {
          await this.deleteNoteUseCase.execute({ id: this.noteId });
        } catch {
          // Si falla la eliminación silenciosa, no bloquear la navegación
        }
      }
      return;
    }

    if (this.isDirty) {
      await this.save();
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
    this.backButtonSub?.unsubscribe();
    clearTimeout(this.dateHideTimeout);
    void this.handleLeaveOrSave();
    this.autoSaveSubscription.unsubscribe();
    this.noteSubscription?.unsubscribe();
    this.routeSubscription.unsubscribe();
  }
}
