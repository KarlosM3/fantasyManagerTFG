import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-create-league-modal',
  templateUrl: './create-league-modal.component.html',
  styleUrls: ['./create-league-modal.component.scss']
})
export class CreateLeagueModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter();
  @Output() createLeague = new EventEmitter();

  leagueForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.leagueForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      privacy: ['private', Validators.required],
      maxParticipants: [10, [Validators.required, Validators.min(2), Validators.max(20)]],
      initialBudget: [100000000, [Validators.required, Validators.min(50000000)]]
    });
  }

  onSubmit(): void {
    if (this.leagueForm.valid) {
      this.createLeague.emit(this.leagueForm.value);
      this.leagueForm.reset({
        privacy: 'private',
        maxParticipants: 10,
        initialBudget: 100000000
      });
    } else {
      this.leagueForm.markAllAsTouched();
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
