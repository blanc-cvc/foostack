
const __db_memory = require('../db/memory');


const allowed_in_string = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
exports.is_typeof_chain_string = (chain) => {
  if (typeof chain != 'string') {
    return false;
  } else if (chain.length != 64) {
    return false;
  }
  for (let i = 0; i < chain.length; i++) {
    if (!allowed_in_string.includes(chain[i])) {
      return false;
    }
  }
  return true;
}

// { node: 'get_myip' }
exports.is_typeof_get_myip_ask = (deserialized_data) => {
  let _bool = true ;
  if (typeof deserialized_data == 'object') {
    _get_myip_ask_object_keys = Object.keys(deserialized_data);
    _bool = _bool && _get_myip_ask_object_keys.includes('node') && (typeof deserialized_data.node == 'string') && (deserialized_data.node == 'get_myip') ;
    _bool = _bool && (_get_myip_ask_object_keys.length == 1) ;
  } else { _bool = false ; }
  
  return _bool ;
}
// { node: 'get_myip', response: _server }
exports.is_typeof_get_myip_response = (deserialized_data) => {
  let _bool = true ;
  if (typeof deserialized_data == 'object') {
    _get_myip_response_object_keys = Object.keys(deserialized_data);
    const _get_myip_ask = Object.assign({},deserialized_data);
    if (_get_myip_response_object_keys.includes('response')) {
      delete _get_myip_ask.response;
    }
    _bool = _bool && this.is_typeof_get_myip_ask(_get_myip_ask) ;
    _bool = _bool && _get_myip_response_object_keys.includes('response') && __db_memory.db.check.peer.is_server_valid(deserialized_data.response) ;
    _bool = _bool && (_get_myip_response_object_keys.length == 2) ;
  } else { _bool = false ; }
  
  return _bool ;
}

// { node: 'get_trusted', callback: 'ask_and_verify_default_peers' }
exports.is_typeof_get_trusted_ask = (deserialized_data) => {
  let _bool = true ;
  if (typeof deserialized_data == 'object') {
    _get_trusted_ask_object_keys = Object.keys(deserialized_data);
    _bool = _bool && _get_trusted_ask_object_keys.includes('node') && (typeof deserialized_data.node == 'string') && (deserialized_data.node == 'get_trusted') ;
    _bool = _bool && _get_trusted_ask_object_keys.includes('callback') && (typeof deserialized_data.callback == 'string') && (deserialized_data.callback == 'ask_and_verify_default_peers') ;
    _bool = _bool && (_get_trusted_ask_object_keys.length == 2) ;
  } else { _bool = false ; }
  
  return _bool ;
}
// { node: 'get_trusted', callback: 'ask_and_verify_default_peers', response: [ { server: '', port: '' }, .. ] }
exports.is_typeof_get_trusted_response = (deserialized_data) => {
  let _bool = true ;
  if (typeof deserialized_data == 'object') {
    const _get_trusted_response_object_keys = Object.keys(deserialized_data);
    const _get_trusted_ask = Object.assign({},deserialized_data);
    if (_get_trusted_response_object_keys.includes('response')) {
      delete _get_trusted_ask.response;
    }
    _bool = _bool && this.is_typeof_get_trusted_ask(_get_trusted_ask) ;
    _bool = _bool && _get_trusted_response_object_keys.includes('response') ;
    if (typeof deserialized_data.response == 'object') {
      for (let forindex = 0; forindex < deserialized_data.response; forindex++) {
        if (typeof deserialized_data.response[forindex] == 'object') {
          const _for_object_keys = Object.keys(deserialized_data.response[forindex]);
          _bool = _bool && _for_object_keys.includes('server') && __db_memory.db.check.peer.is_server_valid(deserialized_data.response[forindex].server) ;
          _bool = _bool && _for_object_keys.includes('port') && __db_memory.db.check.peer.is_port_valid(deserialized_data.response[forindex].port) ;
          _bool = _bool && (_for_object_keys.length == 2) ;
        } else { _bool = false ; break; }
      } // end for
    } else { _bool = false ; }
    _bool = _bool && (_get_trusted_response_object_keys.length == 3) ;
  } else { _bool = false ; }
  
  return _bool ;
}

// { uuid: _uuid, pub: _pub, port: _port }
exports.is_typeof_deserialized_handshake = async (deserialized, port_false = false) => {
  let _bool = true ;
  if (typeof deserialized == 'object') {
    _deserialized_handshake_object_keys = Object.keys(deserialized);
    _bool = _bool && _deserialized_handshake_object_keys.includes('uuid') && __db_memory.db.check.peer.is_uuid_valid(deserialized.uuid) ;
    _bool = _bool && _deserialized_handshake_object_keys.includes('pub') && await __db_memory.db.check.peer.is_pub_valid(deserialized.pub) ;
    if (port_false) {
      _bool = _bool && _deserialized_handshake_object_keys.includes('port') && (deserialized.port === 'false') ;
    } else {
      _bool = _bool && _deserialized_handshake_object_keys.includes('port') && __db_memory.db.check.peer.is_port_valid(deserialized.port) ;
    }
    
    _bool = _bool && (_deserialized_handshake_object_keys.length == 3) ;
  } else { _bool = false ; }
  
  return _bool ;
}

// { uuid: _uuid, data: _data }
exports.is_typeof_deserialized_data = (deserialized) => {
  let _bool = true ;
  if (typeof deserialized == 'object') {
    _deserialized_data_object_keys = Object.keys(deserialized);
    _bool = _bool && _deserialized_data_object_keys.includes('uuid') && __db_memory.db.check.peer.is_uuid_valid(deserialized.uuid) ;
    _bool = _bool && _deserialized_data_object_keys.includes('data') && (typeof deserialized.data == 'object') ;
    _bool = _bool && (_deserialized_data_object_keys.length == 2) ;
  } else { _bool = false ; }
  
  return _bool ;
}

// { "block": 0, chain: _chain, "data": "", "prev": "false" }
exports.is_typeof_block = (block) => {
  let _bool = true ;
  if (typeof block == 'object') {
    _block_object_keys = Object.keys(block);
    _bool = _bool && _block_object_keys.includes('block') && (typeof block.block == 'number') ;
    _bool = _bool && _block_object_keys.includes('chain') && (typeof block.chain == 'string') ;
    _bool = _bool && _block_object_keys.includes('data') && (typeof block.data == 'string') ;
    _bool = _bool && _block_object_keys.includes('prev') && (typeof block.prev == 'string') ;
    _bool = _bool && (_block_object_keys.length == 4) ;
  } else { _bool = false ; }
  
  return _bool ;
}


// { blockchain_method: 'new_block', block: _block, chain: _chain }
exports.is_typeof_new_block = (deserialized_data) => {
  let _bool = true ;
  if (typeof deserialized_data == 'object') {
    _new_block_object_keys = Object.keys(deserialized_data);
    _bool = _bool && _new_block_object_keys.includes('blockchain_method') && (typeof deserialized_data.blockchain_method == 'string') && (deserialized_data.blockchain_method == 'new_block') ;
    _bool = _bool && _new_block_object_keys.includes('block') && this.is_typeof_block(deserialized_data.block) ;
    _bool = _bool && _new_block_object_keys.includes('chain') && (typeof deserialized_data.chain == 'string') ;
    _bool = _bool && (_new_block_object_keys.length == 3) ;
  } else { _bool = false ; }
  
  return _bool ;
}


// { blockchain_method: 'get_block', block: 0, callback: 'sync_chain', chain: _chain }
exports.is_typeof_get_block_ask = (deserialized_data) => {
  let _bool = true ;
  if (typeof deserialized_data == 'object') {
    _get_block_ask_object_keys = Object.keys(deserialized_data);
    _bool = _bool && _get_block_ask_object_keys.includes('blockchain_method') && (typeof deserialized_data.blockchain_method == 'string') && (deserialized_data.blockchain_method == 'get_block') ;
    _bool = _bool && _get_block_ask_object_keys.includes('block') && (typeof deserialized_data.block == 'number') ;
    _bool = _bool && _get_block_ask_object_keys.includes('chain') && (typeof deserialized_data.chain == 'string') ;
    _bool = _bool && _get_block_ask_object_keys.includes('callback') && (typeof deserialized_data.callback == 'string') && (deserialized_data.callback == 'sync_chain') ;
    _bool = _bool && (_get_block_ask_object_keys.length == 4) ;
  } else { _bool = false ; }
  
  return _bool ;
}
// { blockchain_method: 'get_block', block: 0, callback: 'sync_chain', chain: _chain, response: { "block": 0, "data": "", "prev": "false" } }
exports.is_typeof_get_block_response = (deserialized_data) => {
  let _bool = true ;
  if (typeof deserialized_data == 'object') {
    const _get_block_response_object_keys = Object.keys(deserialized_data);
    const _get_block_ask = Object.assign({},deserialized_data);
    if (_get_block_response_object_keys.includes('response')) {
      delete _get_block_ask.response;
    }
    _bool = _bool && this.is_typeof_get_block_ask(_get_block_ask) ;
    _bool = _bool && _get_block_response_object_keys.includes('response') && this.is_typeof_block(deserialized_data.response) ;
    _bool = _bool && (_get_block_response_object_keys.length == 5) ;
  } else { _bool = false ; }
  
  return _bool ;
}


// { blockchain_method: 'get_firstlast', callback: 'sync_chain', chain: _chain }
exports.is_typeof_get_firstlast_ask = (deserialized_data) => {
  let _bool = true ;
  if (typeof deserialized_data == 'object') {
    _get_firstlast_ask_object_keys = Object.keys(deserialized_data);
    _bool = _bool && _get_firstlast_ask_object_keys.includes('blockchain_method') && (typeof deserialized_data.blockchain_method == 'string') && (deserialized_data.blockchain_method == 'get_firstlast') ;
    _bool = _bool && _get_firstlast_ask_object_keys.includes('callback') && (typeof deserialized_data.callback == 'string') && (deserialized_data.callback == 'sync_chain') ;
    _bool = _bool && _get_firstlast_ask_object_keys.includes('chain') && (typeof deserialized_data.chain == 'string') ;
    _bool = _bool && (_get_firstlast_ask_object_keys.length == 3) ;
  } else { _bool = false ; }
  
  return _bool ;
}
// { blockchain_method: 'get_firstlast', callback: 'sync_chain', chain: _chain, response: { first: _first_block, last: _last_block } }
exports.is_typeof_get_firstlast_response = (deserialized_data) => {
  let _bool = true ;
  if (typeof deserialized_data == 'object') {
    const _get_firstlast_response_object_keys = Object.keys(deserialized_data);
    const _get_firstlast_ask = Object.assign({},deserialized_data);
    if (_get_firstlast_response_object_keys.includes('response')) {
      delete _get_firstlast_ask.response;
    }
    _bool = _bool && this.is_typeof_get_firstlast_ask(_get_firstlast_ask) ;
    _bool = _bool && _get_firstlast_response_object_keys.includes('response') ;
    if (typeof deserialized_data.response == 'object') {
      _bool = _bool && Object.keys(deserialized_data.response).includes('first') && Object.keys(deserialized_data.response).includes('last') ;
      _bool = _bool && this.is_typeof_block(deserialized_data.response.first) ;
      _bool = _bool && this.is_typeof_block(deserialized_data.response.last) ;
      _bool = _bool && (Object.keys(deserialized_data.response).length == 2) ;
    } else { _bool = false ; }
    _bool = _bool && (_get_firstlast_response_object_keys.length == 4) ;
  } else { _bool = false ; }
  
  return _bool ;
}


// { node: 'get_onlines' }
exports.is_typeof_get_onlines_ask = (deserialized_data) => {
  let _bool = true ;
  if (typeof deserialized_data == 'object') {
    _get_onlines_ask_object_keys = Object.keys(deserialized_data);
    _bool = _bool && _get_onlines_ask_object_keys.includes('node') && (typeof deserialized_data.node == 'string') && (deserialized_data.node == 'get_onlines') ;
    _bool = _bool && (_get_onlines_ask_object_keys.length == 1) ;
  } else { _bool = false ; }
  
  return _bool ;
}
// { node: 'get_onlines', response: [ { server: '', port: '' }, .. ] }
exports.is_typeof_get_onlines_response = (deserialized_data) => {
  let _bool = true ;
  if (typeof deserialized_data == 'object') {
    const _get_onlines_response_object_keys = Object.keys(deserialized_data);
    const _get_onlines_ask = Object.assign({},deserialized_data);
    if (_get_onlines_response_object_keys.includes('response')) {
      delete _get_onlines_ask.response;
    }
    _bool = _bool && this.is_typeof_get_onlines_ask(_get_onlines_ask) ;
    _bool = _bool && _get_onlines_response_object_keys.includes('response') ;
    if (typeof deserialized_data.response == 'object') {
      for (let forindex = 0; forindex < deserialized_data.response; forindex++) {
        if (typeof deserialized_data.response[forindex] == 'object') {
          const _for_object_keys = Object.keys(deserialized_data.response[forindex]);
          _bool = _bool && _for_object_keys.includes('server') && __db_memory.db.check.peer.is_server_valid(deserialized_data.response[forindex].server) ;
          _bool = _bool && _for_object_keys.includes('port') && __db_memory.db.check.peer.is_port_valid(deserialized_data.response[forindex].port) ;
          _bool = _bool && (_for_object_keys.length == 2) ;
        } else { _bool = false ; break; }
      } // end for
    } else { _bool = false ; }
    _bool = _bool && (_get_onlines_response_object_keys.length == 2) ;
  } else { _bool = false ; }
  
  return _bool ;
}

// { "origin": "ui_footer_input_send", "data": "/login or /login_auto", "path": "/connection"     ?,"signed_seed": "" }
exports.is_typeof_web_login = (data) => {
  let _bool = true ;
  if (typeof data == 'object') {
    _data_object_keys = Object.keys(data);
    _bool = _bool && _data_object_keys.includes('origin') && (typeof data.origin == 'string') && (data.origin == 'ui_footer_input_send');
    _bool = _bool && _data_object_keys.includes('data') && (typeof data.data == 'string') && ((data.data == '/login') || (data.data == '/login_auto'));
    _bool = _bool && _data_object_keys.includes('path') && (typeof data.path == 'string') && (data.path == '/connection');
    if (!_data_object_keys.includes('signed_seed')) {
      _bool = _bool && (_data_object_keys.length == 3) ;
    } else {
      _bool = _bool && (typeof data.signed_seed == 'string') ;
      _bool = _bool && (_data_object_keys.length == 4) ;
    }
    
  } else { _bool = false ; }
  
  return _bool ;
}
