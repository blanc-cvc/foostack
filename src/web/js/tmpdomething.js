
// used by socketio as Worker too, require() the minimum

const _state = {
  done: {
    cleanup_prototypes: false,
    cleanup_elements: false,
    lock_prototypes: false
  }
};
exports.get_state = () => { return _state; }



exports.cleanup_prototypes = () => {
    const _prototypes = {
        'HTMLElement': HTMLElement,
        'Element': Element,
        'Node': Node,
        'EventTarget': EventTarget,
        'Document': Document,
        'Window': Window,
        'Navigator': Navigator,
        'WorkerGlobalScope': WorkerGlobalScope
    }
    for (let _instancename in _prototypes) {
      if (typeof _prototypes[_instancename] !== 'undefined') {
        for (let property of ['innerHTML', 'outerHTML']) {
          if (Object.hasOwn(_prototypes[_instancename].prototype, property)) {
            Object.defineProperty(_prototypes[_instancename].prototype, property, {
              get: Object.getOwnPropertyDescriptor(_prototypes[_instancename].prototype, property).get,
              set: (value) => { return false },
              configurable: false,
              enumerable: true
            });
          }
        }
      }
    }
    let _loop_on_last = false ;
    for (let _instancename in _prototypes) {
        for (let key in _prototypes[_instancename].prototype) {
            if (!require('./domkeep').keep.functions['prototype'].includes(key)) {
              //&& (typeof _prototypes[_instancename].prototype[key] == 'function')  illegal invocation
                try {
                    //console.log(`${_instancename}:${key}`);
                    //document.querySelector('body > main > main > main').innerHTML += `- ${_instancename}:${key} -`;
                    _prototypes[_instancename].prototype[key] = 'undefinedprototype';
                } catch (e) {}
            }
            if ((_instancename == 'Window') && !_loop_on_last) {
              _loop_on_last = true ;
            }
        }
        if (_loop_on_last) {
          _state.done.cleanup_prototypes = true ;
        }
    }
}

    
exports.keep_fn = (nodes_array, functions_array) => {
  for (let i_node = 0; i_node <= nodes_array.length-1; i_node++) {
    for (let i_func = 0; i_func <= functions_array.length-1; i_func++) {
      const add_keep_fn = (node) => {
        if (!node._keep_fn) {node._keep_fn = []}
        if (!node._keep_fn.includes(functions_array[i_func])) {
          node._keep_fn.push(functions_array[i_func]);
        }
      }
      try {
        if (nodes_array[i_node][0] == '*') {
          const nodes = document.querySelector(nodes_array[i_node].slice(1));
          for (_i_node in nodes) {
            add_keep_fn(nodes[_i_node]);
          }
        } else {
          const node = typeof nodes_array[i_node] == 'string'
            ? nodes_array[i_node] == "self"
              ? self
              : nodes_array[i_node] == "window"
                ? window
                : nodes_array[i_node] == "document"
                  ? document
                  : document.querySelector(nodes_array[i_node])
            : nodes_array[i_node];
          
          add_keep_fn(node);
        }
      } catch (e) {
        //require('./body/ui').page_main_add('_console', 'keep_fn error', nodes_array[i_node]);
      }
    }
  }
}

// HERE just keep what is needed
const insert_keep_fn = () => {
  // keep domkeep.js updated with window and document keep_fn !!
  //(self !== 'undefined') && this.keep_fn(['self'], require('./domkeep').keep.functions['window']);
  (window !== 'undefined') && this.keep_fn(['window'], require('./domkeep').keep.functions['window']);
  (document !== 'undefined') && this.keep_fn(['document'], require('./domkeep').keep.functions['document']);
  this.keep_fn([
    'body > main > main > main > ._main',
    'body > main > main > main > ._console',
    'body > main > main > main > ._connection'
    ], ['appendChild']);
  this.keep_fn([
    'body > main > main > main > .notifications'
    ], ['insertBefore']);
  this.keep_fn([
    'body > div',
    'body > button',
    'body > i'
    ], ['cloneNode']);
  this.keep_fn([
    'body > main > main > footer > nav > section > textarea'
    ], ['focus']);
    /*
  this.keep_fn([ // * used to use querySelectorAll
    '*.scroll-vertical-as-horizontal'
    ], ['addEventListener', 'removeEventListener']);
    */
}
    
exports.cleanup_elements = (el = false) => {
    insert_keep_fn();
  
  // https://stackoverflow.com/questions/4256339/how-can-i-loop-through-all-dom-elements-on-a-page
    const _loop = (node) => {
        // KEEP node._keep_fn content
        for (let key in node) {
          if (typeof node[key] == 'function') {
            if (!require('./domkeep').keep.functions['always'].includes(key)) {
              if ( ( !Object.keys(node).includes('_keep_fn') || (Object.keys(node).includes('_keep_fn') && !node._keep_fn.includes(key)) )) {
                  try {
                    //console.log(`${node.tagName}:${key}`);
                    if (node[key] != 'undefinedprototype') {
                      node[key] = 'undefinednotinkeepfn';
                    }
                  } catch (e) {}
              }
            }
          }
        }

        if (node.shadowRoot) {
          _loop(node.shadowRoot);
        }
        const nodes = node.childNodes;
        if(nodes && nodes.length > 0){
          for (let i = 0; i < nodes.length; i++){
            _loop(nodes[i]);
            if (!el && node instanceof Document && (i == nodes.length-1)) {
              _state.done.cleanup_elements = true ; // last child is body script
            }
          }
        }
    }
    //
    if (!el) {
      (window !== 'undefined') && _loop(window);
      (document !== 'undefined') && _loop(document);
      //(self !== 'undefined') && _loop(self);
    } else {
      _loop(el);
    }
}

exports.lock_prototypes = () => {
  insert_keep_fn();
  
  const _prototypes = {
    'Document': Document,
    'Window': Window,
    'WorkerGlobalScope': WorkerGlobalScope
  }
  const _keep = {
    'Document': document._keep_fn,
    'Window': window._keep_fn,
    'WorkerGlobalScope': window._keep_fn
  }
  let _loop_on_last = false ;
  for (let _instancename in _prototypes) {
    if (typeof _prototypes[_instancename] !== 'undefined') {
      for (let key in _prototypes[_instancename].prototype) {
        if (!_keep[_instancename].includes(key)) {
          try {
            _prototypes[_instancename].prototype[key] = 'undefinedprototype';
          } catch (e) {}
        }
        if ((_instancename == 'Window') && !_loop_on_last) {
          _loop_on_last = true ;
        }
      }
    }
    if (_loop_on_last) {
      _state.done.lock_prototypes = true ;
    }
  }
}

