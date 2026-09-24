import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

const COLLAPSE_THRESHOLD = 45;

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
  isCollapsed = false;
  private gestureStartY?: number;

  handleScroll(event: Event) {
    const scrollTop = (event as CustomEvent<{ scrollTop: number }>).detail?.scrollTop ?? 0;
    this.setCollapsed(scrollTop > COLLAPSE_THRESHOLD);
  }

  handleGestureStart(event: TouchEvent) {
    this.gestureStartY = event.touches[0]?.clientY;
  }

  handleGestureMove(_event: TouchEvent) {
    // Scroll events handle collapse state at the appropriate threshold
  }

  async handleGestureEnd(event: TouchEvent) {
    this.gestureStartY = undefined;
    const content = event.currentTarget as HTMLIonContentElement | null;

    if (!content) {
      return;
    }

    const scrollElement = await content.getScrollElement();

    if (scrollElement.scrollTop <= COLLAPSE_THRESHOLD || scrollElement.scrollHeight <= scrollElement.clientHeight + 1) {
      this.setCollapsed(false);
    }
  }

  handleGestureCancel() {
    this.gestureStartY = undefined;
    this.setCollapsed(false);
  }

  private setCollapsed(isCollapsed: boolean) {
    if (this.isCollapsed !== isCollapsed) {
      this.isCollapsed = isCollapsed;
      this.collapsedChange.emit(isCollapsed);
    }
  }
}
