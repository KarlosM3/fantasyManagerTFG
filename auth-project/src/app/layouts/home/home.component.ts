import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  userName: string = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.getUserName();
    console.log('Nombre de usuario obtenido:', this.userName); // Para depuración
  }

  navegarA(ruta: string) {
    this.router.navigate(['/layouts/' + ruta]);
  }
}
