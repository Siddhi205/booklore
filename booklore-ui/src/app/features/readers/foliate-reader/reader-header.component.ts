import {Component, EventEmitter, HostListener, Input, Output} from '@angular/core';

@Component({
  selector: 'app-reader-header',
  standalone: true,
  templateUrl: './reader-header.component.html',
  styleUrls: ['./reader-header.component.scss']
})
export class ReaderHeaderComponent {
  @Input() currentChapterName: string | null = null;
  @Input() currentTheme: any;
  @Output() showChapters = new EventEmitter<void>();
  @Output() showControls = new EventEmitter<void>();
  @Output() createBookmark = new EventEmitter<void>();

  headerVisible = false;
  private isHeaderHovered = false;

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent) {
    if (event.clientY <= 40) {
      this.headerVisible = true;
    } else if (!this.isHeaderHovered) {
      this.headerVisible = false;
    }
  }

  onHeaderMouseEnter() {
    this.isHeaderHovered = true;
    this.headerVisible = true;
  }

  onHeaderMouseLeave() {
    this.isHeaderHovered = false;
    this.headerVisible = false;
  }
}
