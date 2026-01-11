import {Injectable} from '@angular/core';
import {FoliateViewManagerService} from './foliate-view-manager.service';

@Injectable()
export class ReaderNavigationService {
  private touchStartX: number | null = null;
  private touchStartY: number | null = null;

  constructor(private viewManager: FoliateViewManagerService) {
    // Bind handlers to preserve 'this'
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onContainerClick = this.onContainerClick.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
  }

  attachListeners(containerId: string = 'foliate-container') {
    document.addEventListener('keydown', this.onKeyDown);

    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (container) {
        container.addEventListener('click', this.onContainerClick);
        container.addEventListener('touchstart', this.onTouchStart, {passive: true});
        container.addEventListener('touchend', this.onTouchEnd, {passive: false});
      }
    }, 100);
  }

  detachListeners(containerId: string = 'foliate-container') {
    document.removeEventListener('keydown', this.onKeyDown);

    const container = document.getElementById(containerId);
    if (container) {
      container.removeEventListener('click', this.onContainerClick);
      container.removeEventListener('touchstart', this.onTouchStart);
      container.removeEventListener('touchend', this.onTouchEnd);
    }
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'Left') {
      this.viewManager.prevPage();
      event.preventDefault();
    } else if (event.key === 'ArrowRight' || event.key === 'Right') {
      this.viewManager.nextPage();
      event.preventDefault();
    }
  };

  private onContainerClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    if (target.tagName === 'A' || window.getSelection()?.toString()) {
      return;
    }

    const container = event.currentTarget as HTMLElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.4) {
      this.viewManager.prevPage();
    } else if (x > width * 0.6) {
      this.viewManager.nextPage();
    }
  };

  private onTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 1) {
      this.touchStartX = event.touches[0].clientX;
      this.touchStartY = event.touches[0].clientY;
    }
  };

  private onTouchEnd = (event: TouchEvent) => {
    if (event.changedTouches.length === 1 && this.touchStartX !== null && this.touchStartY !== null) {
      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;

      const deltaX = touchEndX - this.touchStartX;
      const deltaY = Math.abs(touchEndY - this.touchStartY);

      if (Math.abs(deltaX) > 50 && deltaY < 50) {
        if (deltaX > 0) {
          this.viewManager.prevPage();
          event.preventDefault();
        } else {
          this.viewManager.nextPage();
          event.preventDefault();
        }
      }
    }
    this.touchStartX = null;
    this.touchStartY = null;
  };
}
