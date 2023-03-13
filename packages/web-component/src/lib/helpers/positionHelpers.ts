type Boundary = number | 'all'; // all means that all the element is visible
type Boundaries = {
  top?: Boundary;
  left?: Boundary;
  right?: Boundary;
  bottom?: Boundary;
};

export const limitCoordinateToScreenBoundaries = (
  ele: HTMLElement,
  x: number,
  y: number,
  boundaries: Boundaries = {}
) => [
  Math.min(
    Math.max(
      x,
      (boundaries.left === 'all' ? ele.offsetWidth : boundaries.left ?? 0) -
        ele.offsetWidth
    ),
    window.innerWidth -
      (boundaries.right === 'all' ? ele.offsetWidth : boundaries.right ?? 0)
  ),
  Math.min(
    Math.max(
      y,
      (boundaries.top === 'all' ? ele.offsetHeight : boundaries.top ?? 0) -
        ele.offsetHeight
    ),
    window.innerHeight -
      (boundaries.bottom === 'all' ? ele.offsetHeight : boundaries.bottom ?? 0)
  ),
];

export const dragElement = (
  ele: HTMLElement,
  triggerEle?: HTMLElement,
  keepVisible?: Boundaries
) => {
  let deltaX = 0;
  let deltaY = 0;
  let currentX = 0;
  let currentY = 0;

  function elementDrag(e: MouseEvent) {
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

  function dragMouseDown(e: MouseEvent) {
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

export const addOnResize = (ele: HTMLElement) => {
  // eslint-disable-next-line no-param-reassign
  ele.onmousemove = (
    e: MouseEvent & {
      target: {
        w: number;
        h: number;
        offsetWidth: number;
        offsetHeight: number;
      };
    }
  ) => {
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
