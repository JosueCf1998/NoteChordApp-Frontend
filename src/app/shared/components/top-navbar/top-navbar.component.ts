import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-top-navbar',
  templateUrl: './top-navbar.component.html',
  styleUrls: ['./top-navbar.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class TopNavbarComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() showTitle = false;
  @Input() floatingControls = false;
}
