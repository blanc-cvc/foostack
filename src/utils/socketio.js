

// where address is socket.handshake.address
exports.parse_client_ip = (address) => {
    const sha_last_index_colon = address.lastIndexOf(':');
    if (sha_last_index_colon > -1) {
        if (address.lastIndexOf('.') > -1) {
            return {
                v4: address.slice(sha_last_index_colon + 1),
                v6: address.slice(0, sha_last_index_colon)
            }
        } else { 
            return { v4: false, v6: address }
        }
    } else {
        return { v4: address, v6: false }
    }
}


// make it generic
// webpeer is stored without 'server' and 'port'
//
exports.ban_and_or_try_disconnect = (reason = "", index = false, socket = false, ban = false) => {
  const _ban = { reason: reason, sockets_to_disconnect: [] }
  if ((index >= 0) && (typeof __db_memory.db.peers[index] == 'object')) {
    const _peer_index_object_keys = Object.keys(__db_memory.db.peers[index]);
    if (_peer_index_object_keys.includes('server') && __db_memory.db.check.peer.is_server_valid(__db_memory.db.peers[index].server)) {
      _ban.server = __db_memory.db.peers[index].server;
    }
    if (_peer_index_object_keys.includes('port') && __db_memory.db.check.peer.is_port_valid(__db_memory.db.peers[index].port)) {
      _ban.port = __db_memory.db.peers[index].port;
    }
    if (_peer_index_object_keys.includes('sid') && __db_memory.db.check.peer.is_sid_valid(__db_memory.db.peers[index].sid)) {
      _ban.sid = __db_memory.db.peers[index].sid;
    }
    if (_peer_index_object_keys.includes('socket') && Object.keys(__db_memory.db.peers[index].socket).includes('connected') && __db_memory.db.peers[index].socket.connected) {
      _ban.sockets_to_disconnect.push(__db_memory.db.peers[index].socket);
    }
  }
  if (socket) {
    if (Object.keys(socket).includes('handshake') && Object.keys(socket.handshake).includes('address') && __db_memory.db.check.peer.is_server_valid(socket.handshake.address)) {
      _ban.server = socket.handshake.address;
    }
    if (Object.keys(socket).includes('client') && Object.keys(socket.client).includes('conn') && Object.keys(socket.client.conn).includes('id') && __db_memory.db.check.peer.is_sid_valid(socket.client.conn.id)) {
      _ban.sid = socket.client.conn.id;
    }
    if (Object.keys(socket).includes('connected') && socket.connected) {
      _ban.sockets_to_disconnect.push(socket);
    }
  }
  if (Object.keys(_ban).includes('sid')) {
    const _index_with_sid = __db_memory.db.get.peer.index_sid(_ban.sid, __db_memory.db.peers);
    if ( (_index_with_sid >= 0) && (typeof __db_memory.db.peers[_index_with_sid] == 'object') ) {
      const _peer_index_with_sid_object_keys = Object.keys(__db_memory.db.peers[_index_with_sid]);
      if (!Object.keys(_ban).includes('server') && _peer_index_with_sid_object_keys.includes('server') && __db_memory.db.check.peer.is_server_valid(__db_memory.db.peers[_index_with_sid].server)) {
        _ban.server = __db_memory.db.peers[_index_with_sid].server;
      }
      if (!Object.keys(_ban).includes('port') && _peer_index_with_sid_object_keys.includes('port') && __db_memory.db.check.peer.is_port_valid(__db_memory.db.peers[_index_with_sid].port)) {
        _ban.port = __db_memory.db.peers[_index_with_sid].port;
      }
      if (_peer_index_with_sid_object_keys.includes('socket') && Object.keys(__db_memory.db.peers[_index_with_sid].socket).includes('connected') && __db_memory.db.peers[_index_with_sid].socket.connected) {
        _ban.sockets_to_disconnect.push(__db_memory.db.peers[_index_with_sid].socket);
      }
    }
  }
  const _ban_object_keys = Object.keys(_ban);
  /*if (_ban_object_keys.includes('port') && __db_memory.db.get.peer.is_default_peer(_ban.server, _ban.port)) {
    ban = false ;
  }*/
  if (ban && _ban_object_keys.includes('server')) {
    console.log(`\n => add ban ${_ban.reason} server: ${_ban.server} port: ${_ban_object_keys.includes('port') ? _ban.port : false}\n`);
    __db_memory.db.blacklist.push({
      server: _ban.server,
      port: _ban_object_keys.includes('port') ? _ban.port : false,
      reason: _ban.reason, date: Date.now()
    });
  }
  if (!ban && _ban_object_keys.includes('server')) {
    const _ban_reasons = [];
    for (let forindex = 0; forindex < __db_memory.db.blacklist.length; forindex++) {
      if ( (__db_memory.db.blacklist[forindex].server === _ban.server) && (_ban_object_keys.includes('port') ? (__db_memory.db.blacklist[forindex].port === _ban.port) : false) ) {
        _ban_reasons.push(__db_memory.db.blacklist[forindex].reason);
      }
    }
    console.log(`\n => disconnected server: ${_ban.server} port: ${_ban_object_keys.includes('port') ? _ban.port : false} reasons: ${_ban_reasons.length > 0 ? JSON.stringify(_ban_reasons) : reason}\n`);
  }
  for (let forindex = 0; forindex < _ban.sockets_to_disconnect.length; forindex++) {
    if (Object.keys(_ban.sockets_to_disconnect[forindex]).includes('connected') && _ban.sockets_to_disconnect[forindex].connected) {
      _ban.sockets_to_disconnect[forindex].disconnect();
    }
  }
  if (_ban_object_keys.includes('sid')) {
    this.disconnect_socket_server_with_sid(_ban.sid);
  }
} // end ban_and_or_try_disconnect
