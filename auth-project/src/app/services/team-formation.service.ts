import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TeamFormationService {
  private temporaryFormationSubject = new BehaviorSubject<any>(null);
  public temporaryFormation$ = this.temporaryFormationSubject.asObservable();

  private hasUnsavedChangesSubject = new BehaviorSubject<boolean>(false);
  public hasUnsavedChanges$ = this.hasUnsavedChangesSubject.asObservable();

  setTemporaryFormation(formation: any): void {
    this.temporaryFormationSubject.next(formation);
    this.hasUnsavedChangesSubject.next(true);
  }

  getTemporaryFormation(): any {
    return this.temporaryFormationSubject.value;
  }

  clearTemporaryFormation(): void {
    this.temporaryFormationSubject.next(null);
    this.hasUnsavedChangesSubject.next(false);
  }

  hasUnsavedChanges(): boolean {
    return this.hasUnsavedChangesSubject.value;
  }
}
