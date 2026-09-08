import { AfterViewInit, Component, OnInit, ViewChild, inject } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular';

import { NavigationService } from './core/navigation/navigation.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild(IonRouterOutlet, { static: false }) routerOutlet?: IonRouterOutlet;

  readonly themeService = inject(ThemeService);
  private readonly navService = inject(NavigationService);

  ngOnInit() {
    this.navService.initHardwareBackButton();
  }

  ngAfterViewInit() {
    if (this.routerOutlet) {
      this.navService.setRouterOutlet(this.routerOutlet);
    }
  }
}
