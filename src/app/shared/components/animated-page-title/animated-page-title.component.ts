import { Component, EventEmitter, Input, Output } from '@angular/core';

const COLLAPSE_THRESHOLD = 4;
const GESTURE_THRESHOLD = 6;

@Component({
  selector: 'app-animated-page-title',
  templateUrl: './animated-page-title.component.html',
  styleUrls: ['./animated-page-title.component.scss'],
  standalone: false
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

  handleGestureMove(event: TouchEvent) {
    const currentY = event.touches[0]?.clientY;

    if (this.gestureStartY !== undefined && currentY !== undefined && this.gestureStartY - currentY > GESTURE_THRESHOLD) {
      this.setCollapsed(true);
    }
  }

  async handleGestureEnd(event: TouchEvent) {
    this.gestureStartY = undefined;
    const content = event.currentTarget as HTMLIonContentElement | null;

    if (!content) {
      return;
    }

    const scrollElement = await content.getScrollElement();

    if (scrollElement.scrollHeight <= scrollElement.clientHeight + 1) {
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
