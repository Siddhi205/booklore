import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FoliateLoaderService {
  private scriptLoaded = false;

  async loadFoliateScript(): Promise<void> {
    if (this.scriptLoaded || customElements.get('foliate-view')) {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = '/assets/foliate/view.js';
      script.onload = () => {
        this.scriptLoaded = true;
        setTimeout(resolve, 100);
      };
      script.onerror = () => reject(new Error('Failed to load foliate.js'));
      document.head.appendChild(script);
    });
  }

  async waitForCustomElement(): Promise<void> {
    await customElements.whenDefined('foliate-view');
  }
}

