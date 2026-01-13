import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BookMark} from '../../../../../shared/service/book-mark.service';

@Component({
  selector: 'app-epub-reader-sidebar',
  standalone: true,
  templateUrl: './epub-reader-sidebar.component.html',
  styleUrls: ['./epub-reader-sidebar.component.scss'],
  imports: [CommonModule]
})
export class EpubReaderSidebarComponent {
  @Input() bookCoverUrl: string | null = null;
  @Input() bookTitle: string = '';
  @Input() bookAuthors: string = '';
  @Input() chapters: { label: string; href: string }[] = [];
  @Input() bookmarks: BookMark[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() chapterClick = new EventEmitter<string>();
  @Output() bookmarkClick = new EventEmitter<string>();
  @Output() deleteBookmark = new EventEmitter<number>();

  activeTab: 'chapters' | 'bookmarks' | 'annotation' = 'chapters';
  closing = false;

  private closeWithAnimation(callback?: () => void) {
    this.closing = true;
    setTimeout(() => {
      this.closing = false;
      if (callback) callback();
      this.close.emit();
    }, 250);
  }

  onChapterClick(href: string) {
    this.closeWithAnimation(() => this.chapterClick.emit(href));
  }

  onBookmarkClick(cfi: string) {
    this.closeWithAnimation(() => this.bookmarkClick.emit(cfi));
  }

  onDeleteBookmark(event: MouseEvent, bookmarkId: number) {
    event.stopPropagation();
    this.deleteBookmark.emit(bookmarkId);
  }

  onOverlayClick() {
    this.closeWithAnimation();
  }
}
