import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {BookMarkService} from '../../../../shared/service/book-mark.service';

export interface BookmarkContext {
  bookId: number;
  cfi: string;
  title: string;
}

@Injectable()
export class ReaderBookmarkService {
  private currentCFI: string | null = null;
  private currentChapterName: string | null = null;

  constructor(private bookMarkService: BookMarkService) {
  }

  updateCurrentPosition(cfi: string, chapterName?: string): void {
    this.currentCFI = cfi;
    if (chapterName) {
      this.currentChapterName = chapterName;
    }
  }

  createBookmarkAtCurrentPosition(bookId: number): Observable<boolean> {
    const cfi = this.currentCFI;
    if (!cfi) {
      console.error('Could not get current CFI - please navigate to a page first');
      return of(false);
    }

    const title = this.currentChapterName || 'Bookmark';

    return this.bookMarkService.createBookmark({bookId, cfi, title}).pipe(
      map(() => {
        console.log('Bookmark created successfully:', {bookId, cfi, title});
        return true;
      }),
      catchError((error) => {
        console.error('Failed to create bookmark:', error);
        return of(false);
      })
    );
  }

  reset(): void {
    this.currentCFI = null;
    this.currentChapterName = null;
  }
}
