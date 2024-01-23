import { BaseDriver } from './BaseDriver';

export class NotificationDriver extends BaseDriver {

  nodeName = 'descope-notification';

  close() {
    this.ele?.removeAttribute('opened');
  }

  show() {
    this.ele?.setAttribute('opened', 'true');
  }

  setContent(template: HTMLTemplateElement) {
    this.ele.innerHTML = '';
    this.ele.appendChild(template.content.cloneNode(true));
  }

  remove() {
    this.ele?.remove();
  }
}
