import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-grouped-list',
  templateUrl: './grouped-list.component.html',
  styleUrls: ['./grouped-list.component.scss'],
  standalone: false
})
export class GroupedListComponent {
  @Input() heading = '';
}
