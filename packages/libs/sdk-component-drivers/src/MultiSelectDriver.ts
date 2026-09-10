import { BaseDriver } from './BaseDriver';

type MultiSelectItem = {
  label: string;
  value: string;
  description?: string;
};

const renderItemWithDescription = ({
  label,
  value,
  description,
}: MultiSelectItem) => {
  const item = document.createElement('span');
  item.setAttribute('data-name', label);
  item.setAttribute('data-id', value);
  item.style.display = 'flex';
  item.style.flexDirection = 'column';

  const labelEle = document.createElement('span');
  labelEle.textContent = label;
  item.appendChild(labelEle);

  if (description) {
    const descriptionEle = document.createElement('span');
    descriptionEle.textContent = description;
    descriptionEle.style.opacity = '0.6';
    descriptionEle.style.fontSize = '0.85em';
    item.appendChild(descriptionEle);
  }

  return item.outerHTML;
};

export class MultiSelectDriver extends BaseDriver {
  nodeName = 'descope-multi-select-combo-box';

  async setData(data: MultiSelectItem[]) {
    const ele = await this.asyncEle;
    if (!ele) return;

    if (data.some((item) => item.description)) {
      (
        ele as Element & { renderItem?: typeof renderItemWithDescription }
      ).renderItem = renderItemWithDescription;
    }

    ele.setAttribute(
      'data',
      JSON.stringify([...data].sort((a, b) => a.label.localeCompare(b.label))),
    );
  }
}

export type { MultiSelectItem };
