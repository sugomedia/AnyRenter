import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  aktYear = new Date().getFullYear();

  constructor(private router: Router) {}

  login(){
    this.router.navigate(['/dashboard']);
  }
}
