import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  settings = {
    appTitle : 'AnyRenter',
    author: {
      name: 'Sugomedia Bt.',
      web: 'https://www.sugomedia.hu',
      email: 'info@sugomedia.hu',
      phone: '06703166512'
    }
  }
}
