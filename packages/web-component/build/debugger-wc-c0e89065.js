import {
  S as State,
  _ as __classPrivateFieldGet,
  a as __classPrivateFieldSet,
} from './index-e76ada1f.js';

const limitCoordinateToScreenBoundaries = (ele, x, y, boundaries = {}) => {
  var _a, _b, _c, _d;
  return [
    Math.min(
      Math.max(
        x,
        (boundaries.left === 'all'
          ? ele.offsetWidth
          : (_a = boundaries.left) !== null && _a !== void 0
          ? _a
          : 0) - ele.offsetWidth
      ),
      window.innerWidth -
        (boundaries.right === 'all'
          ? ele.offsetWidth
          : (_b = boundaries.right) !== null && _b !== void 0
          ? _b
          : 0)
    ),
    Math.min(
      Math.max(
        y,
        (boundaries.top === 'all'
          ? ele.offsetHeight
          : (_c = boundaries.top) !== null && _c !== void 0
          ? _c
          : 0) - ele.offsetHeight
      ),
      window.innerHeight -
        (boundaries.bottom === 'all'
          ? ele.offsetHeight
          : (_d = boundaries.bottom) !== null && _d !== void 0
          ? _d
          : 0)
    ),
  ];
};
const dragElement = (ele, triggerEle, keepVisible) => {
  let deltaX = 0;
  let deltaY = 0;
  let currentX = 0;
  let currentY = 0;
  function elementDrag(e) {
    e.preventDefault();
    // calculate the new cursor position:
    deltaX = currentX - e.clientX;
    deltaY = currentY - e.clientY;
    currentX = e.clientX;
    currentY = e.clientY;
    // set the element's new position:
    const [left, top] = limitCoordinateToScreenBoundaries(
      ele,
      ele.offsetLeft - deltaX,
      ele.offsetTop - deltaY,
      keepVisible
    );
    // eslint-disable-next-line no-param-reassign
    ele.style.top = `${top}px`;
    // eslint-disable-next-line no-param-reassign
    ele.style.left = `${left}px`;
  }
  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
  function dragMouseDown(e) {
    e.preventDefault();
    // get the mouse cursor position at startup:
    currentX = e.clientX;
    currentY = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }
  if (triggerEle) {
    // if provided, the triggerEle is where you move the div from
    // eslint-disable-next-line no-param-reassign
    triggerEle.onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    // eslint-disable-next-line no-param-reassign
    ele.onmousedown = dragMouseDown;
  }
};
const addOnResize = (ele) => {
  // eslint-disable-next-line no-param-reassign
  ele.onmousemove = (e) => {
    if (
      (e.target.w && e.target.w !== e.target.offsetWidth) ||
      (e.target.h && e.target.h !== e.target.offsetHeight)
    ) {
      ele.onresize(e);
    }
    e.target.w = e.target.offsetWidth;
    e.target.h = e.target.offsetHeight;
  };
};

var _Debugger_instances,
  _Debugger_messagesState,
  _Debugger_rootEle,
  _Debugger_contentEle,
  _Debugger_headerEle,
  _Debugger_eventsCbRefs,
  _Debugger_onNewMessages,
  _Debugger_renderMessages,
  _Debugger_setCollapsibleMessages,
  _Debugger_onWindowResize;
const INITIAL_POS_THRESHOLD = 32;
const INITIAL_WIDTH = 300;
const INITIAL_HEIGHT = 200;
const MIN_SIZE = 200;
const template = document.createElement('template');
template.innerHTML = `
<style>
  .debugger {
    width: ${INITIAL_WIDTH}px;
    height: ${INITIAL_HEIGHT}px;
    background-color: #FAFAFA;
    position: fixed;
    font-family: "Helvetica Neue", sans-serif;
    box-shadow: rgba(0, 0, 0, 0.1) 0px 5px 10px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid lightgrey;
    pointer-events: initial;
    display: flex;
    flex-direction: column;
    min-width: ${MIN_SIZE}px;
    max-width: 600px;
    max-height: calc(100% - ${INITIAL_POS_THRESHOLD * 2}px);
    min-height: ${MIN_SIZE}px;
    resize: both;
  }

  .header {
    padding: 8px 16px;
    display: flex;
    align-items: center;
    background-color: #EEEEEE;
    cursor: move;
    border-bottom: 1px solid #e0e0e0;
  }

  .content {
    font-size: 14px;
    flex-grow: 1;
    overflow: auto;
  }

  .msg {
    border-bottom: 1px solid lightgrey; 
    padding: 8px 16px;
    display: flex;
    gap: 5px;
    background-color: #FAFAFA;
  }

  .msg.collapsible {
    cursor: pointer;
  }

  .empty-state {
    padding: 8px 16px;
    background-color: #FAFAFA;
  }
    

  .msg.collapsible:not(.collapsed) {
    background-color: #F5F5F5;
  }

  .msg_title {
    padding-bottom: 5px;
    display: flex;
    gap: 8px;
    font-weight: 500;
  }

  .msg svg {
    padding: 1px;
    flex-shrink: 0;
    margin-top: -2px;
  }

  .msg_content {
    overflow: hidden;
    flex-grow: 1;
    margin-right:5px;
  }  

  .msg_desc {
    color: #646464;
    cursor: initial;
  }  

  .msg.collapsed .msg_desc {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .msg.collapsible.collapsed .chevron {
    transform: rotate(-45deg) translateX(-2px);
  }

  .msg.collapsible .chevron {
    content: "";
    width:6px;
    height:6px;
    border-bottom: 2px solid grey;
    border-right: 2px solid grey;
    transform: rotate(45deg) translateX(-1px);
    margin: 5px;
    flex-shrink:0;
  }
</style>

<div style="top:${INITIAL_POS_THRESHOLD}px; left:${
  window.innerWidth - INITIAL_WIDTH - INITIAL_POS_THRESHOLD
}px;" class="debugger">
  <div class="header">
    <span>Debugger messages</span>
  </div>
  <div class="content">
    <div class="empty-state">
      No errors detected 👀
    </div>
  </div>
</div>
`;
const icon = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.99984 13.167L8.99984 10.167L11.9998 13.167L13.1665 12.0003L10.1665 9.00033L13.1665 6.00033L11.9998 4.83366L8.99984 7.83366L5.99984 4.83366L4.83317 6.00033L7.83317 9.00033L4.83317 12.0003L5.99984 13.167ZM8.99984 17.3337C7.84706 17.3337 6.76373 17.1148 5.74984 16.677C4.73595 16.2398 3.854 15.6462 3.104 14.8962C2.354 14.1462 1.76039 13.2642 1.32317 12.2503C0.885393 11.2364 0.666504 10.1531 0.666504 9.00033C0.666504 7.84755 0.885393 6.76421 1.32317 5.75033C1.76039 4.73644 2.354 3.85449 3.104 3.10449C3.854 2.35449 4.73595 1.7606 5.74984 1.32283C6.76373 0.885603 7.84706 0.666992 8.99984 0.666992C10.1526 0.666992 11.2359 0.885603 12.2498 1.32283C13.2637 1.7606 14.1457 2.35449 14.8957 3.10449C15.6457 3.85449 16.2393 4.73644 16.6765 5.75033C17.1143 6.76421 17.3332 7.84755 17.3332 9.00033C17.3332 10.1531 17.1143 11.2364 16.6765 12.2503C16.2393 13.2642 15.6457 14.1462 14.8957 14.8962C14.1457 15.6462 13.2637 16.2398 12.2498 16.677C11.2359 17.1148 10.1526 17.3337 8.99984 17.3337ZM8.99984 15.667C10.8609 15.667 12.4373 15.0212 13.729 13.7295C15.0207 12.4378 15.6665 10.8614 15.6665 9.00033C15.6665 7.13921 15.0207 5.56283 13.729 4.27116C12.4373 2.97949 10.8609 2.33366 8.99984 2.33366C7.13873 2.33366 5.56234 2.97949 4.27067 4.27116C2.979 5.56283 2.33317 7.13921 2.33317 9.00033C2.33317 10.8614 2.979 12.4378 4.27067 13.7295C5.56234 15.0212 7.13873 15.667 8.99984 15.667Z" fill="#ED404A"/>
</svg>
`;
class Debugger extends HTMLElement {
  constructor() {
    super();
    _Debugger_instances.add(this);
    _Debugger_messagesState.set(this, new State({ messages: [] }));
    _Debugger_rootEle.set(this, void 0);
    _Debugger_contentEle.set(this, void 0);
    _Debugger_headerEle.set(this, void 0);
    _Debugger_eventsCbRefs.set(this, {
      resize: __classPrivateFieldGet(
        this,
        _Debugger_instances,
        'm',
        _Debugger_onWindowResize
      ).bind(this),
    });
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    __classPrivateFieldSet(
      this,
      _Debugger_rootEle,
      this.shadowRoot.querySelector('.debugger'),
      'f'
    );
    __classPrivateFieldSet(
      this,
      _Debugger_contentEle,
      __classPrivateFieldGet(this, _Debugger_rootEle, 'f').querySelector(
        '.content'
      ),
      'f'
    );
    __classPrivateFieldSet(
      this,
      _Debugger_headerEle,
      __classPrivateFieldGet(this, _Debugger_rootEle, 'f').querySelector(
        '.header'
      ),
      'f'
    );
  }
  updateData(data) {
    __classPrivateFieldGet(this, _Debugger_messagesState, 'f').update(
      (state) => ({
        messages: state.messages.concat(data),
      })
    );
  }
  connectedCallback() {
    dragElement(
      __classPrivateFieldGet(this, _Debugger_rootEle, 'f'),
      __classPrivateFieldGet(this, _Debugger_headerEle, 'f'),
      { top: 'all', bottom: 100, left: 100, right: 100 }
    );
    window.addEventListener(
      'resize',
      __classPrivateFieldGet(this, _Debugger_eventsCbRefs, 'f').resize
    );
    addOnResize(__classPrivateFieldGet(this, _Debugger_rootEle, 'f'));
    __classPrivateFieldGet(this, _Debugger_rootEle, 'f').onresize =
      __classPrivateFieldGet(
        this,
        _Debugger_instances,
        'm',
        _Debugger_setCollapsibleMessages
      ).bind(this);
    __classPrivateFieldGet(this, _Debugger_messagesState, 'f').subscribe(
      __classPrivateFieldGet(
        this,
        _Debugger_instances,
        'm',
        _Debugger_onNewMessages
      ).bind(this)
    );
  }
  disconnectedCallback() {
    __classPrivateFieldGet(this, _Debugger_messagesState, 'f').unsubscribeAll();
    window.removeEventListener(
      'resize',
      __classPrivateFieldGet(this, _Debugger_eventsCbRefs, 'f').resize
    );
  }
}
(_Debugger_messagesState = new WeakMap()),
  (_Debugger_rootEle = new WeakMap()),
  (_Debugger_contentEle = new WeakMap()),
  (_Debugger_headerEle = new WeakMap()),
  (_Debugger_eventsCbRefs = new WeakMap()),
  (_Debugger_instances = new WeakSet()),
  (_Debugger_onNewMessages = function _Debugger_onNewMessages(data) {
    __classPrivateFieldGet(
      this,
      _Debugger_instances,
      'm',
      _Debugger_renderMessages
    ).call(this, data);
    __classPrivateFieldGet(
      this,
      _Debugger_instances,
      'm',
      _Debugger_setCollapsibleMessages
    ).call(this);
  }),
  (_Debugger_renderMessages = function _Debugger_renderMessages(data) {
    __classPrivateFieldGet(this, _Debugger_contentEle, 'f').innerHTML =
      data.messages
        .map(
          (message) => `
    <div class="msg">
      ${icon}
      <div class="msg_content">
        <div class="msg_title">
          ${message.title}
        </div>
        <div class="msg_desc">
          ${message.description}
        </div>
      </div>
      <div class="chevron"></div>
    </div>
  `
        )
        .join('');
  }),
  (_Debugger_setCollapsibleMessages =
    function _Debugger_setCollapsibleMessages() {
      __classPrivateFieldGet(this, _Debugger_contentEle, 'f')
        .querySelectorAll('.msg')
        .forEach((ele) => {
          const descEle = ele.querySelector('.msg_desc');
          const lineHeight = 20;
          const isScroll = descEle.scrollWidth > descEle.clientWidth;
          const isMultiLine = descEle.clientHeight > lineHeight;
          const isCollapsible = isScroll || isMultiLine;
          if (isCollapsible) {
            ele.classList.add('collapsible');
            ele.onclick = (e) => {
              // message description should not toggle collapse
              if (!e.target.classList.contains('msg_desc')) {
                ele.classList.toggle('collapsed');
              }
            };
          } else {
            ele.classList.remove('collapsible');
            ele.onclick = null;
          }
        });
    }),
  (_Debugger_onWindowResize = function _Debugger_onWindowResize() {
    // when window is resizing we want to make sure debugger is still visible
    const [left, top] = limitCoordinateToScreenBoundaries(
      __classPrivateFieldGet(this, _Debugger_rootEle, 'f'),
      Number.parseInt(
        __classPrivateFieldGet(this, _Debugger_rootEle, 'f').style.left,
        10
      ),
      Number.parseInt(
        __classPrivateFieldGet(this, _Debugger_rootEle, 'f').style.top,
        10
      ),
      { top: 'all', bottom: 100, left: 100, right: 100 }
    );
    __classPrivateFieldGet(this, _Debugger_rootEle, 'f').style.top = `${top}px`;
    __classPrivateFieldGet(
      this,
      _Debugger_rootEle,
      'f'
    ).style.left = `${left}px`;
  });
customElements.define('descope-debugger', Debugger);

export { Debugger as default };
//# sourceMappingURL=debugger-wc-c0e89065.js.map
