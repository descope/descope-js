window.ds_scripts = {
  1300988122: function (){
    if (!this) {
      return;
    }
    const selectEle = this.querySelector('select[data-id]');
    const inputEle = this.querySelector('input[data-id]');
    const hiddenInputEle = this.querySelector('input[data-input]');
    if (!selectEle || !inputEle || !hiddenInputEle) {
      return;
    }
    inputEle.addEventListener('input', (e) => {
      const sanitizedValue = e.target.value.replace(/\D/g, '');
      e.target.value = sanitizedValue;
      hiddenInputEle.value = hiddenInputEle.value.includes('-')
        ? hiddenInputEle.value.replace(/[^-]*$/, sanitizedValue)
        : sanitizedValue;
    });
    selectEle.addEventListener('change', (e) => {
      const option = e.target.options[e.target.selectedIndex];
      const dialCode = option?.getAttribute('data-dial-code');
      hiddenInputEle.value = hiddenInputEle.value.includes('-')
        ? hiddenInputEle.value.replace(/^[^-]+/, dialCode)
        : `${dialCode}-${hiddenInputEle.value}`;
    });
    // we are simulating change event so the default value will take place in the hidden input
    selectEle.dispatchEvent(new Event('change'));
  },
  '-1214869124': function () {
    const kebabCase = (str) =>
      str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    if (!this) {
      return;
    }
    const targetEle = this.querySelector('.descope-input');
    if (!targetEle) {
      return;
    }
    targetEle.addEventListener('input', () => {
      if (targetEle.classList.contains('invalid:input-error')) {
        targetEle.checkValidity();
      }
    });
    targetEle.addEventListener('invalid', () => {
      targetEle.setCustomValidity('');
      targetEle.classList.add('invalid:input-error');
      ['patternMismatch', 'valueMissing'].forEach((type) => {
        if (targetEle.validity[type]) {
          const attrName = `data-errormessage-${kebabCase(type)}`;
          const customMessage = targetEle.getAttribute(attrName);
          if (customMessage) targetEle.setCustomValidity(customMessage);
        }
      });
    });
  },
  '-950746867': function () {
    if (!this) {
      return;
    }
    // eslint-disable-next-line prefer-rest-params
    const context = arguments[0];
    const selectEle = this.querySelector('select[data-id]');
    if (!selectEle) {
      return;
    }
    const isAutoDetect = selectEle.getAttribute('data-auto-detect') === 'true';
    if (isAutoDetect) {
      selectEle.value = context?.geo;
      // we are simulating change event so the new value will take place in the hidden input
      selectEle.dispatchEvent(new Event('change'));
    }
  },
};
