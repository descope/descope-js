import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss', './my-user-profile/my-user-profile.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class AppComponent {}
