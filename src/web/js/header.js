
document.documentElement.classList.remove("noscript");
exports.IS_FOOSTACK_DEV=true;

exports._eventsType_keep = {
    'document': [
      'click', 'beforeinput',
      'touchstart', 'touchend', 'touchmove', 'touchcancel',
      'pointerdown', 'pointerup', 'pointercancel', 'pointerout', 'pointerenter',
      'mousedown', 'mouseup', 'mousecancel', 'mouseout', 'mouseenter',
      'focus', 'focusout',
      'select', 'selectstart', 'selectionchange',
      'contextmenu', 'copy', 'paste', 'cut',
      'keydown', 'keyup', 'keypress',
      'input', 'change'
    ],
    'window': [
      'popstate',
      'click', 'beforeinput',
      'touchstart', 'touchend', 'touchmove', 'touchcancel',
      'pointerdown', 'pointerup', 'pointercancel', 'pointerout', 'pointerenter',
      'mousedown', 'mouseup', 'mousecancel', 'mouseout', 'mouseenter',
      'focus', 'focusout',
      'select', 'selectstart', 'selectionchange',
      'contextmenu', 'copy', 'paste', 'cut',
      'keydown', 'keyup', 'keypress',
      'input', 'change'
      
    ]
}

exports.keep_fn = {
  'window': ["clearInterval", "clearTimeout", "getComputedStyle", "matchMedia", "setInterval", "setTimeout", "getSelection"],
  'document': ['createTextNode', 'querySelector', 'querySelectorAll', 'createRange']
}

const _state = { done: false };
exports.get_state = () => { return _state; }

exports.init = () => {
  const stateCheck_loading = window.setInterval(() => {
        if ((document.readyState == 'loading') || (document.readyState == 'interactive') || (document.readyState == 'complete')) {
          window.clearInterval(stateCheck_loading);
          
          for (const el of [window, document, document.documentElement, document.head, document.body]) {
            const _keep_fn = el instanceof Window ? this.keep_fn['window'] : el instanceof Document ? this.keep_fn['document'] : [];
            for (let key in el) {
              if ((typeof el[key] == 'function') && !_keep_fn.includes(key) && !key.includes('addEventListener')) {
                try {
                  el[key] = 'undefinednotinkeepfn';
                } catch (e) {}
              }
            }
          }
        }
    }, 0);
    const stateCheck_interactive = window.setInterval(() => {
        if ((document.readyState == 'interactive') || (document.readyState == 'complete')) {
            window.clearInterval(stateCheck_interactive);
            
            const _handle_event_restriction = (node) => {
              for (const key in node) {
                if(/^on/.test(key)) {
                    const eventType = key.substr(2);
          
                    const _nodename = node instanceof Window ? 'window' : 'document';
                    
                    //this._eventsType_keep[_nodename] = [];
                    
                    if (!this._eventsType_keep[_nodename].includes(eventType)) {
                      try {
                        node.addEventListener(eventType, (event) => {
                          if (event.preventDefault) {
                            event.preventDefault();
                          }
                          if (event.stopPropagation) {
                            event.stopPropagation();
                          }
                          if (eventType.includes('error')) {
                            const _el_triggered = `${event.target && event.target.tagName ? event.target.tagName.toLowerCase() : ''}:${event.target.class ? event.target.class : ''}`;
                            const _el_listen = `${event.currentTarget && event.currentTarget.tagName ? event.currentTarget.tagName.toLowerCase() : ''}:${event.currentTarget.class ? event.currentTarget.class : ''}`;
                            const _message = `triggered=${_el_triggered}; listener=${_el_listen}; eventType=${eventType}; filename=${event.filename}; message=${event.message}; errorString=${JSON.stringify(event.error)}`;
                            (typeof window.console == 'object') && window.console._is_custom ? window.console.debug(_message, `ERROR: ${_el_triggered}`) : this.IS_FOOSTACK_DEV ? document.querySelector('body > main > main > main').innerHTML += _message : false ;
                          }
                          
                          
                          
                          // if (!eventType.includes('error') && !eventType.includes('pointer') && !eventType.includes('wheel') && !eventType.includes('mouse') && !eventType.includes('device') && !eventType.includes('scroll')) {
                          //   document.querySelector('body > main > main > main').innerHTML += `-headerbody:debug:${_nodename}:${eventType}`;
                          // }
                          
                        }, useCapture = true);
                      } catch (e) {
                        console.log("error in a try catch, you can ignore.")
                      }
                    }
                }
              }
            }
            try {
              // loop on childNodes
              const _loop = (node) => {
                  _handle_event_restriction(node);
                  
                  if (node.shadowRoot) {
                    _loop(node.shadowRoot);
                  }
                  const nodes = node.childNodes;
                  if(nodes && nodes.length > 0){
                    for (let i = 0; i < nodes.length; i++){
                      _loop(nodes[i]);
                      if (node instanceof Document && (i == nodes.length-1)) {
                        // if Window.prototype.dispatchEvent is nulled (maybe)
                        //Navigo doc: If there is a `popstate` event dispatched (this happens when the user manually changes the browser location by hitting for example the back button)
                        window.addEventListener('popstate', (event) => {
                            event.preventDefault(); event.stopPropagation();
                            if (!event.isTrusted) { return false }
                            try {
                              window.router_resolve();
                            } catch (e) {}
                        }, useCapture = true);
                        
                        for (const el of [window, document, document.documentElement, document.head, document.body]) {
                          el.addEventListener = 'undefinednotinkeepfn'
                        }
                        _state.done = true ; // last child is body script
                      }
                    }
                  }
              }
              //
              _loop(window);
              _loop(document);
            } catch (e) {}
        }
    }, 0);
}

require('./header').init();


// document:
// 'readystatechange', 'pointerlockchange', 'pointerlockerror', 'beforecopy', 'beforecut', 'beforepaste', 'freeze', 'resume', 'search', 'visibilitychange', 'fullscreenchange', 'fullscreenerror', 'webkitfullscreenchange', 'webkitfullscreenerror', 'beforexrselect', 'abort', 'beforeinput', 'blur', 'cancel', 'canplay', 'canplaythrough', 'change', 'click', 'close', 'contextlost', 'contextmenu', 'contextrestored', 'cuechange', 'dblclick', 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop', 'durationchange', 'emptied', 'ended', 'error', 'focus', 'formdata', 'input', 'invalid', 'keydown', 'keypress', 'keyup', 'load', 'loadeddata', 'loadedmetadata', 'loadstart', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'mousewheel', 'pause', 'play', 'playing', 'progress', 'ratechange', 'reset', 'resize', 'scroll', 'securitypolicyviolation', 'seeked', 'seeking', 'select', 'slotchange', 'stalled', 'submit', 'suspend', 'timeupdate', 'toggle', 'volumechange', 'waiting', 'webkitanimationend', 'webkitanimationiteration', 'webkitanimationstart', 'webkittransitionend', 'wheel', 'auxclick', 'gotpointercapture', 'lostpointercapture', 'pointerdown', 'pointermove', 'pointerrawupdate', 'pointerup', 'pointercancel', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'selectstart', 'selectionchange', 'animationend', 'animationiteration', 'animationstart', 'transitionrun', 'transitionstart', 'transitionend', 'transitioncancel', 'copy', 'cut', 'paste', 'contentvisibilityautostatechange', 'prerenderingchange', 'beforematch', 'touchcancel', 'touchend', 'touchmove', 'touchstart'

// window:
// 'search', 'appinstalled', 'beforeinstallprompt', 'beforexrselect', 'abort', 'beforeinput', 'blur', 'cancel', 'canplay', 'canplaythrough', 'change', 'click', 'close', 'contextlost', 'contextmenu', 'contextrestored', 'cuechange', 'dblclick', 'drag', 'dragend', 'dragenter', 'dragleave', 'dragover', 'dragstart', 'drop', 'durationchange', 'emptied', 'ended', 'error', 'focus', 'formdata', 'input', 'invalid', 'keydown', 'keypress', 'keyup', 'load', 'loadeddata', 'loadedmetadata', 'loadstart', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'mousewheel', 'pause', 'play', 'playing', 'progress', 'ratechange', 'reset', 'resize', 'scroll', 'securitypolicyviolation', 'seeked', 'seeking', 'select', 'slotchange', 'stalled', 'submit', 'suspend', 'timeupdate', 'toggle', 'volumechange', 'waiting', 'webkitanimationend', 'webkitanimationiteration', 'webkitanimationstart', 'webkittransitionend', 'wheel', 'auxclick', 'gotpointercapture', 'lostpointercapture', 'pointerdown', 'pointermove', 'pointerrawupdate', 'pointerup', 'pointercancel', 'pointerover', 'pointerout', 'pointerenter', 'pointerleave', 'selectstart', 'selectionchange', 'animationend', 'animationiteration', 'animationstart', 'transitionrun', 'transitionstart', 'transitionend', 'transitioncancel', 'afterprint', 'beforeprint', 'beforeunload', 'hashchange', 'languagechange', 'message', 'messageerror', 'offline', 'online', 'pagehide', 'pageshow', 'popstate', 'rejectionhandled', 'storage', 'unhandledrejection', 'unload', 'orientationchange', 'contentvisibilityautostatechange', 'devicemotion', 'deviceorientation', 'deviceorientationabsolute', 'beforematch', 'touchcancel', 'touchend', 'touchmove', 'touchstart'