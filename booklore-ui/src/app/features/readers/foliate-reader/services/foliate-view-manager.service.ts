import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';

export interface ViewEvent {
  type: 'load' | 'relocate' | 'error';
  detail?: any;
}

@Injectable({
  providedIn: 'root'
})
export class FoliateViewManagerService {
  private view: any;
  private eventSubject = new Subject<ViewEvent>();
  public events$ = this.eventSubject.asObservable();

  createView(container: HTMLElement): void {
    this.view = document.createElement('foliate-view');
    this.view.style.width = '100%';
    this.view.style.height = '100%';
    this.view.style.display = 'block';
    container.appendChild(this.view);

    this.attachEventListeners();
  }

  async loadEpub(epubPath: string): Promise<void> {
    if (!this.view) {
      throw new Error('View not created');
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(epubPath);
    if (!response.ok) {
      throw new Error(`EPUB not found: ${response.status}`);
    }

    const blob = await response.blob();
    const file = new File([blob], epubPath.split('/').pop() || 'book.epub', {
      type: 'application/epub+zip'
    });

    await this.view.open(file);
  }

  getRenderer(): any {
    return this.view?.renderer;
  }

  prevPage(): void {
    this.view?.prev();
  }

  nextPage(): void {
    this.view?.next();
  }

  async goToStart(): Promise<void> {
    if (this.view) {
      await this.view.goTo('epubcfi(/6/20!/4,/114/1:238,/154/2/1:7)');
    }
  }

  destroy(): void {
    this.view?.remove();
    this.view = null;
  }

  private attachEventListeners(): void {
    this.view.addEventListener('load', () => {
      this.eventSubject.next({type: 'load'});
    });

    this.view.addEventListener('relocate', (e: any) => {
      this.eventSubject.next({type: 'relocate', detail: e.detail});
    });

    this.view.addEventListener('error', (e: any) => {
      this.eventSubject.next({type: 'error', detail: e.detail});
    });
  }

  /**
   * Returns a flat list of chapters from the EPUB table of contents.
   * Each chapter has a label (name) and href (link to navigate).
   */
  getChapters(): { label: string; href: string }[] {
    if (!this.view?.book?.toc) return [];

    // Recursive helper to flatten nested TOC items
    const flattenToc = (items: any[], result: any[] = []): any[] => {
      for (const item of items) {
        result.push(item);
        if (item.subitems?.length) {
          flattenToc(item.subitems, result);
        }
      }
      return result;
    };

    const flattened = flattenToc(this.view.book.toc);

    return flattened.map(item => ({
      label: item.label,
      href: item.href
    }));
  }
}
