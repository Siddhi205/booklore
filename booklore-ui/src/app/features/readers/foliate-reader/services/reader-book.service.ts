import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface BookMetadata {
  coverUrl: string | null;
  title: string;
  authors: string;
}

export interface BookNavigation {
  currentChapterName: string | null;
  chapters: { label: string; href: string }[];
}

@Injectable()
export class ReaderBookService {
  private metadataSubject = new BehaviorSubject<BookMetadata>({
    coverUrl: null,
    title: '',
    authors: ''
  });

  private navigationSubject = new BehaviorSubject<BookNavigation>({
    currentChapterName: null,
    chapters: []
  });

  metadata$ = this.metadataSubject.asObservable();
  navigation$ = this.navigationSubject.asObservable();

  get metadata() {
    return this.metadataSubject.value;
  }

  get navigation() {
    return this.navigationSubject.value;
  }

  setMetadata(metadata: BookMetadata) {
    this.metadataSubject.next(metadata);
  }

  setChapters(chapters: { label: string; href: string }[]) {
    this.navigationSubject.next({
      ...this.navigation,
      chapters
    });
  }

  setCurrentChapter(chapterName: string | null) {
    this.navigationSubject.next({
      ...this.navigation,
      currentChapterName: chapterName
    });
  }
}

