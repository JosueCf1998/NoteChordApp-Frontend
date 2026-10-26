import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

const SCROLL_THRESHOLD = 2;
const COLLAPSE_THRESHOLD = 36;

@Component({
  selector: 'app-animated-page-title',
  templateUrl: './animated-page-title.component.html',
  styleUrls: ['./animated-page-title.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class AnimatedPageTitleComponent {
  @Input() title = '';
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() scrolledChange = new EventEmitter<boolean>();
  isCollapsed = false;
  isScrolled = false;
  titleOpacity = 1;
  private gestureStartY?: number;

  handleScroll(event: Event) {
    const scrollTop = (event as CustomEvent<{ scrollTop: number }>).detail?.scrollTop ?? 0;
    this.updateScroll(scrollTop);
  }

  updateScroll(scrollTop: number) {
    const clampedScroll = Math.max(0, scrollTop);
    const progress = Math.min(1, Math.max(0, clampedScroll / COLLAPSE_THRESHOLD));
    // Degrada suavemente y alcanza opacidad 0 antes de tocar los botones superiores
    this.titleOpacity = Math.max(0, 1 - progress * 1.25);

    this.setScrolled(clampedScroll > SCROLL_THRESHOLD);
    this.setCollapsed(clampedScroll >= COLLAPSE_THRESHOLD);
  }

  handleGestureStart(event: TouchEvent) {
    this.gestureStartY = event.touches[0]?.clientY;
  }

  handleGestureMove(event: TouchEvent) {
    if (this.gestureStartY === undefined) {
      return;
    }
    const currentY = event.touches[0]?.clientY;
    if (currentY === undefined) {
      return;
    }

    const diff = this.gestureStartY - currentY;
    if (diff > 0) {
      const progress = Math.min(1, Math.max(0, diff / COLLAPSE_THRESHOLD));
      this.titleOpacity = Math.max(0, 1 - progress * 1.25);
      if (diff > SCROLL_THRESHOLD) {
        this.setScrolled(true);
      }
      if (diff >= COLLAPSE_THRESHOLD) {
        this.setCollapsed(true);
      }
    }
  }

  async handleGestureEnd(event: TouchEvent) {
    this.gestureStartY = undefined;
    const content = (event.currentTarget as HTMLElement)?.closest('ion-content') as HTMLIonContentElement | null;

    if (!content) {
      return;
    }

    const scrollElement = await content.getScrollElement();
    const maxScroll = scrollElement.scrollHeight - scrollElement.clientHeight;

    // Lógica nativa de Apple Notes:
    // Si el contenido no excede la altura de la pantalla (lista corta sin scroll suficiente),
    // o si el usuario soltó cerca del tope, rebota a 0 y restaura la pantalla exactamente como estaba
    if (maxScroll < COLLAPSE_THRESHOLD || scrollElement.scrollTop <= SCROLL_THRESHOLD) {
      if (scrollElement.scrollTop > 0) {
        await content.scrollToTop(250);
      }
      this.resetToExpanded();
    } else if (scrollElement.scrollTop < COLLAPSE_THRESHOLD) {
      this.setCollapsed(false);
    }
  }

  handleGestureCancel() {
    this.gestureStartY = undefined;
    this.resetToExpanded();
  }

  private resetToExpanded() {
    this.titleOpacity = 1;
    this.setScrolled(false);
    this.setCollapsed(false);
  }

  private setScrolled(isScrolled: boolean) {
    if (this.isScrolled !== isScrolled) {
      this.isScrolled = isScrolled;
      this.scrolledChange.emit(isScrolled);
    }
  }

  private setCollapsed(isCollapsed: boolean) {
    if (this.isCollapsed !== isCollapsed) {
      this.isCollapsed = isCollapsed;
      this.collapsedChange.emit(isCollapsed);
    }
  }
}
