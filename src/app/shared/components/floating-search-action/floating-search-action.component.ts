import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-floating-search-action',
  templateUrl: './floating-search-action.component.html',
  styleUrls: ['./floating-search-action.component.scss'],
  standalone: false
})
export class FloatingSearchActionComponent {
  @Input() value = '';
  @Input() placeholder = 'Buscar';
  @Input() searchLabel = 'Buscar';
  @Input() actionLabel = 'Agregar';
  @Output() valueChange = new EventEmitter<string>();
  @Output() action = new EventEmitter<void>();
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  updateValue(event: Event) {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  focus() {
    this.searchInput?.nativeElement.focus();
  }
}
