import { BaseDriver } from './BaseDriver';

type MultiSelectOption = {
  label: string;
  value: string;
  description?: string;
};

type RenderItemInput = {
  displayName?: string;
  value: string;
  label: string;
  description?: string;
};

type MultiSelectComboBoxElement = HTMLElement & {
  renderItem: (item: RenderItemInput) => string;
};

// Mirrors the combo-box's own default item rendering (name/value/label), plus
// a description line rendered beneath the label. The chip and filtering logic
// read the item's `data-name`/`data-id` attributes, not its markup, so adding
// the description here doesn't affect the selected-item chips.
const renderItemWithDescription = ({
  displayName,
  value,
  label,
  description,
}: RenderItemInput) => {
  const ele = document.createElement('span');
  ele.setAttribute('data-name', label);
  ele.setAttribute('data-id', value);
  ele.setAttribute(
    'style',
    'display: flex; flex-direction: column; gap: 0.125rem;',
  );

  const nameEle = document.createElement('span');
  nameEle.textContent = displayName || label;
  ele.appendChild(nameEle);

  if (description) {
    const descriptionEle = document.createElement('span');
    descriptionEle.setAttribute(
      'style',
      'font-size: 0.75em; opacity: 0.65; white-space: normal;',
    );
    descriptionEle.textContent = description;
    ele.appendChild(descriptionEle);
  }

  return ele.outerHTML;
};

export class MultiSelectDriver extends BaseDriver {
  nodeName = 'descope-multi-select-combo-box';

  async setData(data: MultiSelectOption[]) {
    const ele = await this.asyncEle;
    if (!ele) return;

    ele.setAttribute('data', JSON.stringify(data.sort()));

    if (data.some(({ description }) => description)) {
      (ele as MultiSelectComboBoxElement).renderItem =
        renderItemWithDescription;
    }
  }
}
