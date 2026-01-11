import {Component, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {ReaderNavigationService} from './services/reader-navigation.service';

interface TocItem {
  label: string;
  href: string;
  subitems: any;
  id: number;
}

interface PageItem {
  label: string;
  href: string;
  subitems: any;
  id: number;
}

interface RelocateEventDetail {
  fraction: number;
  section: { current: number; total: number };
  location: { current: number; next: number; total: number };
  time: { section: number; total: number };
  tocItem: TocItem;
  pageItem: PageItem;
  cfi: string;
  range: any;
}

@Component({
  selector: 'app-reader-navbar',
  standalone: true,
  templateUrl: './reader-navbar.component.html',
  styleUrls: ['./reader-navbar.component.scss']
})
export class ReaderNavbarComponent {
  navbarVisible = false;
  showLocationPopover = false;
  private isNavbarHovered = false;

  @Input() progressData: RelocateEventDetail | null = null;
  @Output() progressChange = new EventEmitter<number>();

  constructor(private navigation: ReaderNavigationService) {
  }

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent) {
    const windowHeight = window.innerHeight;
    if (this.showLocationPopover) {
      this.navbarVisible = true;
      return;
    }
    if (event.clientY >= windowHeight - 60) {
      this.navbarVisible = true;
    } else if (!this.isNavbarHovered) {
      this.navbarVisible = false;
      this.showLocationPopover = false;
    }
  }

  onNavbarMouseEnter() {
    this.isNavbarHovered = true;
    this.navbarVisible = true;
  }

  onNavbarMouseLeave() {
    this.isNavbarHovered = false;
    if (!this.showLocationPopover) {
      this.navbarVisible = false;
      this.showLocationPopover = false;
    }
  }

  toggleLocationPopover() {
    this.showLocationPopover = !this.showLocationPopover;
  }

  get currentFraction(): number {
    return this.progressData?.fraction ?? 0;
  }

  get currentPercentage(): number {
    return Math.round(this.currentFraction * 100);
  }

  get timeTotal(): string {
    return this.formatDuration((this.progressData?.time.total ?? 0) * 60);
  }

  get timeSection(): string {
    return this.formatDuration((this.progressData?.time.section ?? 0) * 60);
  }

  get locationCurrent(): number {
    return this.progressData?.location.current ?? 0;
  }

  get locationTotal(): number {
    return this.progressData?.location.total ?? 0;
  }

  get sectionCurrent(): number {
    return this.progressData?.section.current ?? 0;
  }

  get sectionTotal(): number {
    return this.progressData?.section.total ?? 0;
  }

  get currentPage(): string {
    return this.progressData?.pageItem?.label ?? 'N/A';
  }

  onProgressChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const fraction = parseFloat(target.value) / 100;
    this.progressChange.emit(fraction);
  }

  onFirstSection() {
    this.navigation.goToSection(0);
  }

  onPreviousSection(): void {
    const s = this.progressData?.section;
    if (!s || s.current <= 0) return;
    this.navigation.goToSection(s.current - 1);
  }

  onNextSection(): void {
    const s = this.progressData?.section;
    if (!s || s.current >= s.total - 1) return;
    this.navigation.goToSection(s.current + 1);
  }

  onLastSection(): void {
    const s = this.progressData?.section;
    if (!s || s.total <= 0) return;
    this.navigation.goToSection(s.total - 1);
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)} sec`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours} hr ${remainingMinutes} min`
      : `${hours} hr`;
  }
}
