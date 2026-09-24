import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-grouped-list',
  templateUrl: './grouped-list.component.html',
  styleUrls: ['./grouped-list.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class GroupedListComponent {
  @Input() heading = '';
}
