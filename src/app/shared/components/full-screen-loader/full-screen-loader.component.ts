import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-full-screen-loader',
  templateUrl: './full-screen-loader.component.html',
  styleUrls: ['./full-screen-loader.component.scss'],
  standalone: false
})
export class FullScreenLoaderComponent {
  @Input() visible = false;
  @Input() message = 'Cargando…';
}
