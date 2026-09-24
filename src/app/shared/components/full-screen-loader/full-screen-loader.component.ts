import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-full-screen-loader',
  templateUrl: './full-screen-loader.component.html',
  styleUrls: ['./full-screen-loader.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class FullScreenLoaderComponent {
  @Input() visible = false;
  @Input() message = 'Cargando…';
}
