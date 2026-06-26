
document.documentElement.classList.remove("noscript");

// to test without worker
//window.Worker = false

const keep_fn = require('./domkeep').keep.functions;

for (const el of [navigator, window, document, document.documentElement, document.head, document.body]) {
  const _keep_fn = el instanceof Window ? keep_fn['window'] : el instanceof Document ? keep_fn['document'] : [];
  for (let key in el) {
    if ((typeof el[key] == 'function') && !_keep_fn.includes(key) && !key.includes('addEventListener')) {
      try {
        el[key] = 'undefinednotinkeepfn';
      } catch (e) {}
    }
  }
}


// document:
// 'readystatechange', 'pointerlockchange', 'pointerlockerror', 'beforecopy', 'beforecut', 'beforepaste', 'freeze', 'resume', 'search', 'visibilitychange', 'fullscreenchange', 'fullscreenerror', 'webkitfullscreenchange', 'webkitfullscreenerror', 'beforexrselect', 'abort', 'beforeinput', 'blur', 'cancel', 'canplay', 'canplaythrough', 'change', 'click', 'close', 'contextlost', 'contextmenu', 'contextrestored', 'cuechange', 'dblclick', 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop', 'durationchange', 'emptied', 'ended', 'error', 'focus', 'formdata', 'input', 'invalid', 'keydown', 'keypress', 'keyup', 'load', 'loadeddata', 'loadedmetadata', 'loadstart', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'mousewheel', 'pause', 'play', 'playing', 'progress', 'ratechange', 'reset', 'resize', 'scroll', 'securitypolicyviolation', 'seeked', 'seeking', 'select', 'slotchange', 'stalled', 'submit', 'suspend', 'timeupdate', 'toggle', 'volumechange', 'waiting', 'webkitanimationend', 'webkitanimationiteration', 'webkitanimationstart', 'webkittransitionend', 'wheel', 'auxclick', 'gotpointercapture', 'lostpointercapture', 'pointerdown', 'pointermove', 'pointerrawupdate', 'pointerup', 'pointercancel', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'selectstart', 'selectionchange', 'animationend', 'animationiteration', 'animationstart', 'transitionrun', 'transitionstart', 'transitionend', 'transitioncancel', 'copy', 'cut', 'paste', 'contentvisibilityautostatechange', 'prerenderingchange', 'beforematch', 'touchcancel', 'touchend', 'touchmove', 'touchstart'

// window:
// 'search', 'appinstalled', 'beforeinstallprompt', 'beforexrselect', 'abort', 'beforeinput', 'blur', 'cancel', 'canplay', 'canplaythrough', 'change', 'click', 'close', 'contextlost', 'contextmenu', 'contextrestored', 'cuechange', 'dblclick', 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop', 'durationchange', 'emptied', 'ended', 'error', 'focus', 'formdata', 'input', 'invalid', 'keydown', 'keypress', 'keyup', 'load', 'loadeddata', 'loadedmetadata', 'loadstart', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'mousewheel', 'pause', 'play', 'playing', 'progress', 'ratechange', 'reset', 'resize', 'scroll', 'securitypolicyviolation', 'seeked', 'seeking', 'select', 'slotchange', 'stalled', 'submit', 'suspend', 'timeupdate', 'toggle', 'volumechange', 'waiting', 'webkitanimationend', 'webkitanimationiteration', 'webkitanimationstart', 'webkittransitionend', 'wheel', 'auxclick', 'gotpointercapture', 'lostpointercapture', 'pointerdown', 'pointermove', 'pointerrawupdate', 'pointerup', 'pointercancel', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'selectstart', 'selectionchange', 'animationend', 'animationiteration', 'animationstart', 'transitionrun', 'transitionstart', 'transitionend', 'transitioncancel', 'afterprint', 'beforeprint', 'beforeunload', 'hashchange', 'languagechange', 'message', 'messageerror', 'offline', 'online', 'pagehide', 'pageshow', 'popstate', 'rejectionhandled', 'storage', 'unhandledrejection', 'unload', 'orientationchange', 'contentvisibilityautostatechange', 'devicemotion', 'deviceorientation', 'deviceorientationabsolute', 'beforematch', 'touchcancel', 'touchend', 'touchmove', 'touchstart'

