import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

export interface ReaderState {
  lineHeight: number;
  justify: boolean;
  hyphenate: boolean;
  maxColumnCount: number;
  gap: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReaderStateService {
  private readonly initialState: ReaderState = {
    lineHeight: 1.5,
    justify: false,
    hyphenate: true,
    maxColumnCount: 2,
    gap: 0.05
  };

  private stateSubject = new BehaviorSubject<ReaderState>(this.initialState);
  public state$ = this.stateSubject.asObservable();

  get currentState(): ReaderState {
    return this.stateSubject.value;
  }

  updateLineHeight(delta: number): void {
    const current = this.currentState.lineHeight;
    const newValue = Math.max(0.8, Math.min(3, current + delta));
    this.updateState({lineHeight: newValue});
  }

  updateMaxColumnCount(delta: number): void {
    const current = this.currentState.maxColumnCount;
    const newValue = Math.max(1, Math.min(10, current + delta));
    this.updateState({maxColumnCount: newValue});
  }

  updateGap(delta: number): void {
    const current = this.currentState.gap;
    const newValue = Math.max(0, Math.min(0.5, current + delta));
    this.updateState({gap: newValue});
  }

  toggleJustify(): void {
    this.updateState({justify: !this.currentState.justify});
  }

  toggleHyphenate(): void {
    this.updateState({hyphenate: !this.currentState.hyphenate});
  }

  setJustify(justify: boolean): void {
    this.updateState({justify});
  }

  private updateState(partial: Partial<ReaderState>): void {
    this.stateSubject.next({...this.currentState, ...partial});
  }
}

