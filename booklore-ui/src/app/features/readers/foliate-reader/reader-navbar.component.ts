import { Component, HostListener, Input } from '@angular/core';

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

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent) {
    const windowHeight = window.innerHeight;
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
    this.navbarVisible = false;
    this.showLocationPopover = false;
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

  get currentCfi(): string {
    return this.progressData?.cfi ?? '';
  }

  get timeTotal(): string {
    return this.formatDuration(this.progressData?.time.total ?? 0);
  }

  get timeSection(): string {
    return this.formatDuration(this.progressData?.time.section ?? 0);
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
    return this.progressData?.pageItem?.label ?? '0';
  }

  get currentChapter(): string {
    return this.progressData?.tocItem?.label ?? '';
  }

  /**
   * Handle progress slider change
   */
  onProgressChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const fraction = parseFloat(target.value) / 100;
    console.log('Navigate to fraction:', fraction);
    // TODO: Implement navigation to fraction
  }

  /**
   * Format duration in seconds to human readable string
   */
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
