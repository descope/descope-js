import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-custom-welcome-screen',
  templateUrl: './custom-welcome-screen.component.html',
  styleUrls: ['./custom-welcome-screen.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class CustomWelcomeScreenComponent {
  @Input() errorText: string;
  @Output() formUpdate = new EventEmitter<any>();
  @Output() buttonClick = new EventEmitter<void>();

  form = {
    name: '',
    email: ''
  };

  updateForm() {
    this.formUpdate.emit(this.form);
  }

  onSubmit(event: Event) {
    event.preventDefault();
    this.buttonClick.emit();
  }
}
