import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewEncapsulation
} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ChordTransposerService } from '../../../core/services/chord-transposer.service';

@Component({
  selector: 'app-transpose-modal',
  templateUrl: './transpose-modal.component.html',
  styleUrls: ['./transpose-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class TransposeModalComponent {
  @Input() isOpen = false;
  @Input() trigger = 'note-format-trigger';
  @Input() semitones = 0;
  @Input() originalKey: string | null = null;
  @Input() preferFlats = false;

  @Output() readonly semitonesChange = new EventEmitter<number>();
  @Output() readonly applied = new EventEmitter<number>();
  @Output() readonly cancelled = new EventEmitter<void>();
  @Output() readonly closed = new EventEmitter<void>();

  readonly Math = Math;

  constructor(private chordTransposer: ChordTransposerService) {}

  get currentKey(): string | null {
    if (!this.originalKey) return null;
    if (this.semitones === 0) return this.originalKey;
    return this.chordTransposer.transposeNote(this.originalKey, this.semitones, false);
  }

  get formattedOffset(): string {
    return this.chordTransposer.formatSemitoneOffset(this.semitones);
  }

  get toneOffsetDisplay(): string {
    if (this.semitones === 0) return '0';
    const isPositive = this.semitones > 0;
    const abs = Math.abs(this.semitones);
    const whole = Math.floor(abs / 2);
    const half = abs % 2 === 1;

    const sign = isPositive ? '+' : '-';
    if (whole > 0 && half) {
      return `${sign}${whole} 1/2`;
    } else if (whole > 0) {
      return `${sign}${whole}`;
    } else {
      return `${sign}1/2`;
    }
  }

  get semitoneHintDisplay(): string {
    if (this.semitones === 0) return 'Tono original';
    const abs = Math.abs(this.semitones);
    const sign = this.semitones > 0 ? '+' : '-';
    return `${sign}${abs} semitono${abs === 1 ? '' : 's'}`;
  }

  get unitLabel(): string {
    const abs = Math.abs(this.semitones);
    if (abs === 0) return 'Tono original';
    return abs === 1 ? '½ tono' : `${abs} semitonos`;
  }

  decrease(): void {
    const next = this.semitones - 1;
    this.semitones = next;
    this.semitonesChange.emit(next);
  }

  increase(): void {
    const next = this.semitones + 1;
    this.semitones = next;
    this.semitonesChange.emit(next);
  }

  reset(): void {
    if (this.semitones === 0) return;
    this.semitones = 0;
    this.semitonesChange.emit(0);
  }

  apply(): void {
    this.applied.emit(this.semitones);
    this.closed.emit();
  }

  cancel(): void {
    this.cancelled.emit();
    this.closed.emit();
  }

  onDidDismiss(): void {
    this.closed.emit();
  }
}
