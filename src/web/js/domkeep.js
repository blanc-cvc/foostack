
// header:
// for: window, document, document.documentElement, document.head, document.body
// keep.functions.window[] keep.functions.document[] + addEventListener

// body: init_events_restriction()
// for loop(window) loop(document)
// keep.events[]

// body: domething: cleanup_prototypes()
// for HTMLElement, Element, Node, EventTarget, Document, Window
// keep.functions.prototype[]

// body: domething: cleanup_elements()
// for loop(window) loop(document)
// el._keep_fn[]

// body: domething: lock_prototypes()
// for Window Document
// keep.functions.window[] keep.functions.document[]

exports.keep = {
    functions: {
        'prototype': ['addEventListener', 'removeEventListener', 'insertBefore', 'remove', 'querySelectorAll', 'querySelector', 'appendChild', 'createTextNode', 'remove', 'getAttribute', 'cloneNode', 'createRange', 'focus'],
        'window': ['clearInterval', 'clearTimeout', 'getComputedStyle', 'matchMedia', 'setInterval', 'setTimeout', 'getSelection', 'onmessage', 'postMessage', 'atob', 'btoa', 'Promise'], // TextEncoder, TextDecoder
        'document': ['createTextNode', 'querySelector', 'querySelectorAll', 'createRange'],
        'always': ['getAttribute', 'remove']
    },
    events: [
      'popstate',
      'click', 'beforeinput',
      'touchstart', 'touchend', 'touchmove', 'touchcancel',
      'pointerdown', 'pointerup', 'pointercancel', 'pointerout', 'pointerenter',
      'mousedown', 'mouseup', 'mousecancel', 'mouseout', 'mouseenter',
      'focus', 'focusout',
      'select', 'selectstart', 'selectionchange',
      'contextmenu', 'copy', 'paste', 'cut',
      'keydown', 'keyup', 'keypress',
      'input', 'change',
      'wheel', 'mousewheel', 'scroll'
    ]
}
