import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-top-navbar',
  templateUrl: './top-navbar.component.html',
  styleUrls: ['./top-navbar.component.scss'],
  standalone: false
})
export class TopNavbarComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() showTitle = false;
  @Input() floatingControls = false;
}
