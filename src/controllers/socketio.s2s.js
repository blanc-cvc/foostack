
const __server = require('../server');
const __db_memory = require('../db/memory');
const __db_blockchain = require('../db/blockchain');
const __common_network = require('../common/network');
const __utils_socketio = require('../utils/socketio');
const __utils_typeof = require('../utils/typeof');

exports.init = () => {
    const _onconnection = (socket) => {
        console.log(`as ioserver got client sid ${socket.client.conn.id}: connected`);
        //on production blacklisted by ip only dont wait port
        //running npm run build replace process.env.FOOSTACK_DEV by false
        if (process.env.FOOSTACK_DEV == false) {
          const is_server_blacklisted = __db_memory.db.get.peer.is_blacklisted(socket.handshake.address);
          if (is_server_blacklisted) {
            socket.disconnect();
            return;
          }
        }
        if (!__db_memory.db.check.peer.is_sid_valid(socket.client.conn.id)) { 
          socket.client.conn.id = false;
          socket.disconnect();
          return;
        }
        let _sid_count = 0;
        for (let _socket of __server.io.of('/s2s').sockets) {
          if (_socket[1].client.conn.id === socket.client.conn.id) {
            _sid_count++;
            if (_sid_count > 1) {
              console.log(`\n\n  client socket sid already exist: ${socket.client.conn.id}\n`);
              socket.client.conn.id = false;
              _socket[1].disconnect();
              return;
            }
          }
        }

        socket.on('data', (serialized_data) => {
            on_data_common(index = false, serialized_data, send_ack = true, socket);
        });
        socket.on('data ack', (serialized_data) => {
            on_data_common(index = false, serialized_data, send_ack = false); // on hns got event from __server.io.of('/s2s').emit check client on indexing handshake
        });
        socket.on('disconnect', () => {
            console.log(`as ioserver got client sid ${socket.client.conn.id}: disconnected`);
            const _peer_index = __db_memory.db.get.peer.index_sid(socket.client.conn.id, __db_memory.db.peers);
            if (_peer_index >= 0) {
                if (typeof __db_memory.db.peers[_peer_index] == 'object') {
                    if (Object.keys(__db_memory.db.peers[_peer_index]).includes('socket')) {
                        if (Object.keys(__db_memory.db.peers[_peer_index].socket).includes('removeListener')) {
                            __db_memory.db.peers[_peer_index].socket.removeListener('connect');
                            __db_memory.db.peers[_peer_index].socket.removeListener('indexing handshake');
                            __db_memory.db.peers[_peer_index].socket.removeListener('disconnect');
                        }
                        if (Object.keys(__db_memory.db.peers[_peer_index].socket).includes('close')) {
                            __db_memory.db.peers[_peer_index].socket.close();
                        }
                        if (Object.keys(__db_memory.db.peers[_peer_index].socket).includes('connected')) {
                            if (__db_memory.db.peers[_peer_index].socket.connected) {
                              __db_memory.db.peers[_peer_index].socket.disconnect();
                            }
                        }
                    }
                    console.log(`\n  => from server remove client connection index: ${_peer_index}`);
                    __db_memory.db.del.peer.index(_peer_index);
                } // end of typeof
            }

            this.clean_server_sockets();
            this.print_sockets();
            
            // maybe uuid, openpgp pub or sid already taken __server.io.of('/s2s').sockets.size == 0
            if ( ((__db_memory.db.peers.length == 0) || (__db_memory.db.peers.filter(function(peer) { return Object.keys(peer).includes('sid') && peer.sid != false }).length == 0)) && !__db_memory.db.state.socketio_server_restarting ) {
                __db_memory.db.state.socketio_server_restarting = true;
                __server.io.of('/s2s').removeListener('connection', _onconnection);
                for (let index = 0; index < __db_memory.db.peers.length; index++) {
                  try {
                    __db_memory.db.peers[index].socket.disconnect();
                  } catch (e) {}
                }
                setTimeout(() => {
                    __db_memory.db.peers = [];
                    this.clean_server_sockets();
                    console.log(`\n ..sockets cleaned and socketio connection listener removed, waiting to generate new uuid and new openpgp keys`);
                    setTimeout(async () => {
                        __server.generate_new_uuid(); // because of this, until the first connection is done, it can cause problems with sid or uuid (and bans)
                        await __server.generate_new_openpgp();
                        console.log(`\n ..new uuid and new openpgp keys generated, waiting to add socketio connection listener and populate peers[]`);
                        setTimeout(() => {
                          __server.io.of('/s2s').addListener('connection', _onconnection);
                          this.check_add_unconnected_peers(__db_memory.db.default_peers);
                          this.check_add_unconnected_peers(__db_memory.db.connectivity_peers);
                          __db_memory.db.state.socketio_server_restarting = false;
                        }, 5*1000);
                    }, 5*1000);
                }, 5*1000);
            }
        });
        
        // if it's a self connection for default_peers only
        //   => disconnect and remove
        //   (enter once at start on connection)
        if (__db_memory.config.network.ip.length == 0) {
            const _port = socket.handshake.headers.host.slice(socket.handshake.headers.host.lastIndexOf(':') + 1);
            const _ip = socket.handshake.headers.host.slice(0, socket.handshake.headers.host.lastIndexOf(':'));
            for (let index = 0; index < __db_memory.db.peers.length; index++) {
                if ( __db_memory.db.peers[index].server.includes(_ip) && (_port == __db_memory.db.peers[index].port) ) {
                    if (__db_memory.db.peers[index].socket.io.engine.id === socket.client.conn.id) {
                        console.log(`as ioserver got client sid ${socket.client.conn.id}: self connection detected`);
                        __db_memory.config.network.ip = socket.handshake.address; // help to know which ip I have
                        __db_memory.db.peers[index].socket.disconnect();
                        //socket.disconnect();
                        __db_memory.db.del.peer.index(index);
                    }
                }
            }
        }
        
    }
    __server.io.of('/s2s').on('connection', _onconnection);
    __server.io.of('/s2s').setMaxListeners(1);
    // init connections as client for each server in peers (only default peers at init)
    for (index in __db_memory.db.peers) {
      init_ioclient(index); // by default only default peers here
    }
}

exports.init_ioclient_from_outside = (index) => {
  init_ioclient(index);
}
const init_ioclient = (index) => {
  console.log(`\n  trying IOC INIT server: ${__db_memory.db.peers[index].server} port: ${__db_memory.db.peers[index].port}`);
  
  const _object_keys_peer = Object.keys(__db_memory.db.peers[index]);
  
  const _is_try_peer = (_object_keys_peer.length == 2) && _object_keys_peer.includes('server') && _object_keys_peer.includes('port') && __db_memory.db.check.peer.is_server_valid(__db_memory.db.peers[index].server) && __db_memory.db.check.peer.is_port_valid(__db_memory.db.peers[index].port) ; // or ask_and_verify_default_peers or check_add_unconnected_peers or get_onlines using push directly on peers[]
  const _is_peer_from_handshake = (_object_keys_peer.length == 6) && _object_keys_peer.includes('server') && _object_keys_peer.includes('port') && _object_keys_peer.includes('uuid') && _object_keys_peer.includes('pub') && _object_keys_peer.includes('sid') && _object_keys_peer.includes('seen') && __db_memory.db.check.peer.is_server_valid(__db_memory.db.peers[index].server) && __db_memory.db.check.peer.is_port_valid(__db_memory.db.peers[index].port) && __db_memory.db.check.peer.is_uuid_valid(__db_memory.db.peers[index].uuid) && __db_memory.db.check.peer.is_sid_valid(__db_memory.db.peers[index].sid) ;
  
  if ( (typeof __db_memory.db.peers[index] == 'object') && !_object_keys_peer.includes('socket') && (_is_try_peer || _is_peer_from_handshake) ) {

    const is_server_blacklisted = __db_memory.db.get.peer.is_blacklisted(
        __db_memory.db.peers[index].server,
        __db_memory.db.peers[index].port
    );
    if (!is_server_blacklisted) { // uuid or pub
        const _ip = __utils_socketio.parse_client_ip(__db_memory.db.peers[index].server);
        const _server = _ip.v4 ? _ip.v4 : _ip.v6 ? `[${_ip.v6}]` : false; if (!_server) { return }
        const _port = __db_memory.db.peers[index].port;
        
        __db_memory.db.peers[index].socket = require('socket.io-client')(`http://${_server}:${_port}/s2s`, __common_network.socketio_client_options);
        
        __db_memory.db.peers[index].socket.io._reconnection = false;
        __db_memory.db.peers[index].socket.io._reconnectionAttempts = 0;
        __db_memory.db.peers[index].socket.io._autoConnect = false;
        __db_memory.db.peers[index].socket.io.skipReconnect = true;
        
        // CONNECT
        try {
          __db_memory.db.peers[index].socket.on('connect', async () => {
            try {
              const _ban_and_disconnect = () => {
                __db_memory.db.peers[index].sid = false;
                __db_memory.db.peers[index].socket.io.engine.id = false;
                this.ban_and_or_try_disconnect(reason = "BAD_SID_OR_ALREADY_TAKEN", index, socket = false, ban = true);
              }
              if (!__db_memory.db.check.peer.is_sid_valid(__db_memory.db.peers[index].socket.io.engine.id)) {
                _ban_and_disconnect();
                return;
              }
              
              const _exist_sid = __db_memory.db.get.peer.exist_sid(__db_memory.db.peers[index].socket.io.engine.id, __db_memory.db.peers);
              if (!_exist_sid) {
                console.log(`as ioclient sid ${__db_memory.db.peers[index].socket.io.engine.id}: connected`);
                __db_memory.db.peers[index].socket.emit('data', await __common_network.serialize(__db_memory.db.server.uuid, __db_memory.db.server.openpgp)); // handshake init - handshake init - handshake init - handshake init
              } else {
                console.log(`!! ioclient sid ${__db_memory.db.peers[index].socket.io.engine.id}: already exist`);
                _ban_and_disconnect();
                return;
              }
            } catch (e) {
              //console.log(e);
            }
          });
        } catch (e) {
          //console.log(e);
        }
        
        // INDEXING HANDSHAKE acting as an index helper
        __db_memory.db.peers[index].socket.on('indexing handshake', (serialized_data) => {
            on_data_common(index, serialized_data, send_ack = false);
        });
        
        // DISCONNECT
        __db_memory.db.peers[index].socket.on('disconnect', () => {
          if (typeof __db_memory.db.peers[index] == 'object') {
            if (Object.keys(__db_memory.db.peers[index]).includes('socket')) {
              if (Object.keys(__db_memory.db.peers[index].socket).includes('removeListener')) {
                __db_memory.db.peers[index].socket.removeListener('connect');
                __db_memory.db.peers[index].socket.removeListener('indexing handshake');
                __db_memory.db.peers[index].socket.removeListener('disconnect');
              }
              if (Object.keys(__db_memory.db.peers[index].socket).includes('close')) {
                __db_memory.db.peers[index].socket.close();
              }
            }
            if ( !Object.keys(__db_memory.db.peers[index]).includes('sid') || (Object.keys(__db_memory.db.peers[index]).includes('sid') && !__db_memory.db.check.peer.is_sid_valid(__db_memory.db.peers[index].sid)) ) {
                __db_memory.db.del.peer.index(index);
            }
          } // end if typeof
          this.clean_server_sockets();
        });
        
    } else {
        console.log(`\n! on init_ioclient CANCELED, got a blacklisted peer server: ${__db_memory.db.peers[index].server} port: ${__db_memory.db.peers[index].port}\n`);
        __db_memory.db.del.peer.index(index);
        this.clean_server_sockets();
    }
  }
} // end init_ioclient

const on_data_common = async (index, serialized_data, send_ack, socket) => {
    // index value: false on 'data' handled by server socket
    const { serialize, deserialize } = __common_network;
    const _deserialized = await deserialize(__db_memory.db.server.openpgp, serialized_data);
    if (!_deserialized) { console.log('\n  => data received without handshake done: ignore\n'); return; }

    if ((typeof _deserialized == 'object') && !Object.keys(_deserialized).includes('err')) {
        delete _deserialized.err;
        
        if (!Object.keys(_deserialized).includes('data')) { // handshake
            if (!await __utils_typeof.is_typeof_deserialized_handshake(_deserialized)) {
              this.ban_and_or_try_disconnect(reason = `MALFORMED_DESERIALIZED_HANDSHAKE_${send_ack ? 'CLIENT' : 'SERVER'}`, index, socket, ban = true);
              return;
            }
            if (send_ack) { // use socket
                _deserialized.server = socket.handshake.address;
                _deserialized.sid = socket.client.conn.id;

                const is_server_blacklisted = __db_memory.db.get.peer.is_blacklisted(_deserialized.server, _deserialized.port);
                if (is_server_blacklisted) {
                  if (process.env.FOOSTACK_DEV == false) {
                    this.ban_and_or_try_disconnect(reason = "INFO_BLACKLISTED_HANDSHAKE_CANCELED_AS_SERVER", index, socket, ban = false);
                    return;
                  }
                } // not displaying port - then don't use it in dev mode
                
                const _is_default_peer = __db_memory.db.get.peer.is_default_peer(_deserialized.server, _deserialized.port);
                const _index = __db_memory.db.get.peer.index_server(_deserialized.server, _deserialized.port);
                const _peer_object_keys = _index >= 0 ? Object.keys(__db_memory.db.peers[_index]) : [];
                // 'data' (as handshake init) as SERVER do !
                // connect back to peer on connection
                const _exist_server = __db_memory.db.get.peer.exist_server(_deserialized.server, _deserialized.port);
                const _exist_uuid = __db_memory.db.get.peer.exist_uuid(_deserialized.uuid, __db_memory.db.peers);
                const _exist_pub = __db_memory.db.get.peer.exist_pub(_deserialized.pub, __db_memory.db.peers);

                if (_exist_server && _exist_uuid && _exist_pub && _peer_object_keys.includes('uuid') && __db_memory.db.peers[_index].uuid.includes(_deserialized.uuid) && _peer_object_keys.includes('pub') && __db_memory.db.peers[_index].pub.includes(_deserialized.pub)) {
                  if (!_peer_object_keys.includes('sid')) {
                    __db_memory.db.set.peer(_index, { sid: _deserialized.sid }); // UPDATE PEER SID
                    console.log(`\n  => got back connection, sid updated as server (handshake already done as client): ${_deserialized.sid}\n`);
                    
                    // GET ONLINES
                    //   => get list of available peers
                    const _data = { node: 'get_onlines' };
                    __db_memory.db.peers[_index].socket.emit('data', await serialize(__db_memory.db.server.uuid, __db_memory.db.server.openpgp, _data, _deserialized.pub));
                    return;
                    // INIT
                    
                  } else {
                    this.ban_and_or_try_disconnect(reason = "BAD_HANDSHAKE_CLIENT_SID_ALREADY_UPDATED", index, socket, ban = true); // not allowed to ask for another handshake, back connection already got
                    return;
                  }
                } else if (!_exist_uuid && !_exist_pub) {
                  if (!_exist_server) {
                    __db_memory.db.set.peer(__db_memory.db.peers.length, _deserialized);
                  } else if ((_exist_server && _is_default_peer) || (_exist_server && !_peer_object_keys.includes('uuid') && !_peer_object_keys.includes('pub'))) {
                    __db_memory.db.set.peer(_index, _deserialized);
                  } else {
                    this.ban_and_or_try_disconnect(reason = "BAD_HANDSHAKE_CLIENT_CANT_UPDATE", index, socket, ban = true);
                    return;
                  }
                  console.log(`\n  => HANDSHAKE as server:${__db_memory.db.server.uuid} got from client: ${_deserialized.uuid}\n`);
                  __server.io.of('/s2s').emit('indexing handshake', await serialize(__db_memory.db.server.uuid, __db_memory.db.server.openpgp)); // index helper
                  if (!_exist_server || (_exist_server && !_peer_object_keys.includes('socket'))) {
                    init_ioclient(_index >= 0 ? _index : __db_memory.db.peers.length-1);
                  }
                } else {
                  this.ban_and_or_try_disconnect(reason = "BAD_HANDSHAKE_CLIENT_UUID_OR_PUB_EXIST", index, socket, ban = true);
                  return;
                }
            } else { // got index from 'indexing handshake'
              // 'indexing' (part of the handshake) as CLIENT do !
              // the second part , use index
              if (typeof __db_memory.db.peers[index] != 'object') { return; }
              const _peer_object_keys = Object.keys(__db_memory.db.peers[index]);
              const _deserialized_object_keys = Object.keys(_deserialized);
              
              const is_server_blacklisted = __db_memory.db.get.peer.is_blacklisted(__db_memory.db.peers[index].server, __db_memory.db.peers[index].port);
              if (is_server_blacklisted) {
                this.ban_and_or_try_disconnect(reason = "INFO_BLACKLISTED_HANDSHAKE_CANCELED_AS_CLIENT", index, socket, ban = false);
                return;
              }

              const _exist_uuid = __db_memory.db.get.peer.exist_uuid(_deserialized.uuid, __db_memory.db.peers);
              const _exist_pub = __db_memory.db.get.peer.exist_pub(_deserialized.pub, __db_memory.db.peers);
              if ( !_exist_uuid && !_exist_pub && _peer_object_keys.includes('port') && __db_memory.db.peers[index].port.includes(_deserialized.port) ) { // updating this server index
                if ( !_peer_object_keys.includes('uuid') && !_peer_object_keys.includes('pub') ) {
                  console.log(`\n  => INDEXING HANDSHAKE from server: ${_deserialized.uuid}\n`);
                  __db_memory.db.set.peer(index, { uuid: _deserialized.uuid, pub: _deserialized.pub }); // UPDATE PEER UUID AND PUB
                } else {
                  this.ban_and_or_try_disconnect(reason = "BAD_HANDSHAKE_SERVER_CANT_UPDATE", index, socket, ban = true);
                  return;
                }
              } else if (_exist_uuid) { // verify deserialized
                const _index_with_uuid = __db_memory.db.get.peer.index_uuid(_deserialized.uuid, __db_memory.db.peers);
                _index_with_uuid_object_keys = Object.keys(__db_memory.db.peers[_index_with_uuid]);
                if ( (_index_with_uuid_object_keys.includes('pub') && !__db_memory.db.peers[_index_with_uuid].pub.includes(_deserialized.pub)) || (_index_with_uuid_object_keys.includes('port') && !__db_memory.db.peers[_index_with_uuid].port.includes(_deserialized.port)) ) {
                  this.ban_and_or_try_disconnect(reason = "BAD_HANDSHAKE_SERVER_INDEXING", index, socket, ban = true);
                  return;
                }
              }
            }
        } else { // data: send_ack = true / data ack: send_ack = false
                // index arg is false
            if (!await __utils_typeof.is_typeof_deserialized_data(_deserialized)) {
              this.ban_and_or_try_disconnect(reason = 'MALFORMED_DESERIALIZED_DATA', index, socket, ban = true);
              return;
            }
            const _index = __db_memory.db.get.peer.index_uuid(_deserialized.uuid, __db_memory.db.peers); // handshake is done, we can use uuid
            if ( (_index >= 0) && (typeof __db_memory.db.peers[_index] == 'object') ) {
                const is_server_blacklisted = __db_memory.db.get.peer.is_blacklisted(__db_memory.db.peers[_index].server, __db_memory.db.peers[_index].port);
                if (is_server_blacklisted) {
                  this.ban_and_or_try_disconnect(reason = "INFO_BLACKLISTED_DATA_CANCELED", _index, socket, ban = false);
                  return;
                }
                if (send_ack) {
                    // 'data'
                    console.log(`\n  => DATA as server:${__db_memory.db.server.uuid} got from client:${_deserialized.uuid} :`);
                    console.log(_deserialized.data);
                    const _pub = __db_memory.db.peers[_index].pub;
                    __db_memory.db.peers[_index].socket.emit('data ack', await serialize(__db_memory.db.server.uuid, __db_memory.db.server.openpgp, _deserialized.data, _pub));
                    // SERVER API
                    handle_data(_deserialized, _index, _pub);
                    // SERVER API
                    __db_memory.db.set.peer(_index, {}); // UPDATE PEER SEEN
                } else {
                    // 'data ack'
                    console.log(`\n  => DATA ACK as server:${__db_memory.db.server.uuid} got from client:${_deserialized.uuid} :`);
                    console.log(_deserialized.data);
                }
            } else {
              this.ban_and_or_try_disconnect(reason = 'BAD_DATA_UUID_UNKNOWN', index = false, socket, ban = true);
              return;
            }
        }
    } else {
        this.ban_and_or_try_disconnect(reason = "BAD_DESERIALIZE", index, socket, ban = true);
        try {
            console.log(_deserialized);
            console.log('WARNING handle errors here..');
        } catch (exception) {
            
        }
        return;
    }
} // end on_data_common


// review here for possible exception TODO
const handle_data = async (deserialized, index, pub) => {
    const { serialize } = __common_network;
    // _deserialized already typeof object
    if (typeof deserialized.data != 'object') { return; }
    const _deserialized_data_object_keys = Object.keys(deserialized.data);
    
    if (_deserialized_data_object_keys.includes('blockchain_method')) {
        switch (deserialized.data.blockchain_method) {
            case 'new_block':
                if ( await __utils_typeof.is_typeof_new_block(deserialized.data) ) {
                    __db_blockchain.new_block_from_node(deserialized.data.block, index, pub);
                } else {
                  // malformed new_block
                  this.ban_and_or_try_disconnect(reason = "MALFORMED_NEW_BLOCK", index, socket = false, ban = true);
                  return;
                }
                break;
            case 'get_block':
                if (_deserialized_data_object_keys.includes('response')) { // got response
                    if ( await __utils_typeof.is_typeof_get_block_response(deserialized.data) ) {
                        switch (deserialized.data.callback) {
                            case 'sync_chain':
                                const _peer = { server: __db_memory.db.peers[index].server, port: __db_memory.db.peers[index].port };
                                __db_blockchain.sync_chain(Object.assign(deserialized.data, _peer));
                                break;
                            default:
                                break;
                        }
                    } else {
                      // malformed get_block response
                      this.ban_and_or_try_disconnect(reason = "MALFORMED_GET_BLOCK_RESPONSE", index, socket = false, ban = true);
                      return;
                    }
                } else { // got ask
                // remove read() TODO
                    if ( await __utils_typeof.is_typeof_get_block_ask(deserialized.data) ) {
                        const _block = __db_blockchain.blockchains[deserialized.data.chain].read().find({ block: deserialized.data.block }).value();
                        if (_block) {
                          const _data = Object.assign(deserialized.data, { response: _block });
                          __db_memory.db.peers[index].socket.emit('data', await serialize(__db_memory.db.server.uuid, __db_memory.db.server.openpgp, _data, pub));
                        } else {
                          // unknown block
                          this.ban_and_or_try_disconnect(reason = "UNKNOWN_GET_BLOCK_ASK", index, socket = false, ban = true);
                          return;
                        }
                    } else {
                        // malformed get_block ask
                        this.ban_and_or_try_disconnect(reason = "MALFORMED_GET_BLOCK_ASK", index, socket = false, ban = true);
                        return;
                    }
                }
                break;
            case 'get_firstlast': // if got call from default_peer, try sync chain
                if (_deserialized_data_object_keys.includes('response')) { // got response
                    if ( await __utils_typeof.is_typeof_get_firstlast_response(deserialized.data) ) {
                        switch (deserialized.data.callback) {
                            case 'sync_chain':
                                const _peer = { server: __db_memory.db.peers[index].server, port: __db_memory.db.peers[index].port };
                                __db_blockchain.sync_chain(Object.assign(deserialized.data, _peer));
                                break;
                            default:
                                break;
                        }
                    } else {
                      // malformed get_firstlast response
                      this.ban_and_or_try_disconnect(reason = "MALFORMED_GET_FIRSTLAST_RESPONSE", index, socket = false, ban = true);
                      return;
                    }
                } else { // got ask
                  if ( await __utils_typeof.is_typeof_get_firstlast_ask(deserialized.data) ) {
                      // remove read() TODO
                      if (typeof __db_blockchain.blockchains[deserialized.data.chain] == 'object') {
                        if ( Object.keys(__db_blockchain.blockchains[deserialized.data.chain]).includes('default_peers') && (typeof __db_blockchain.blockchains[deserialized.data.chain].default_peers == 'object') && (__db_blockchain.blockchains[deserialized.data.chain].default_peers.length > 0) ) {
                          const _first_block = __db_blockchain.blockchains[deserialized.data.chain].read().first().value();
                          const _last_block = __db_blockchain.blockchains[deserialized.data.chain].read().last().value();
                          const _data = Object.assign(deserialized.data, { response: { first: _first_block, last: _last_block } });
                          __db_memory.db.peers[index].socket.emit('data', await serialize(__db_memory.db.server.uuid, __db_memory.db.server.openpgp, _data, pub));
                        } else {
                          console.log(`\n asking firstlast for chain: ${deserialized.data.chain} which is subscribed but not already trusted, ignore..\n`);
                        }
                      } else {
                        console.log(`\n asking firstlast for chain: ${deserialized.data.chain} which is not subscribed, ignore..\n`);
                      }
                  } else {
                    // malformed get_firstlast ask
                    this.ban_and_or_try_disconnect(reason = "MALFORMED_GET_FIRSTLAST_ASK", index, socket = false, ban = true);
                    return;
                  }
                }
                break;
            default:
                break;
        }
    }
    if (_deserialized_data_object_keys.includes('node')) {
        switch (deserialized.data.node) {
            case 'get_myip':
              if (_deserialized_data_object_keys.includes('response')) { // got response
                if ( await __utils_typeof.is_typeof_get_myip_response(deserialized.data) ) {
                  if (__db_memory.db.get.peer.is_default_peer(__db_memory.db.peers[index].server, __db_memory.db.peers[index].port)) {
                    __db_memory.config.network.ip = deserialized.data.response;
                  }
                } else {
                  // malformed get_myip response
                  this.ban_and_or_try_disconnect(reason = "MALFORMED_GET_MYIP_RESPONSE", index, socket = false, ban = true);
                  return;
                }
              } else { // got ask
                if ( await __utils_typeof.is_typeof_get_myip_ask(deserialized.data) ) {
                  const _data = Object.assign(deserialized.data, { response: __db_memory.db.peers[index].server } );
                  __db_memory.db.peers[index].socket.emit('data', await serialize(__db_memory.db.server.uuid, __db_memory.db.server.openpgp, _data, pub));
                } else {
                  // malformed get_myip ask
                  this.ban_and_or_try_disconnect(reason = "MALFORMED_GET_MYIP_ASK", index, socket = false, ban = true);
                  return;
                }
              }
              break;
            case 'get_trusted':
              if (_deserialized_data_object_keys.includes('response')) { // got response
                if ( await __utils_typeof.is_typeof_get_trusted_response(deserialized.data) ) {
                  switch (deserialized.data.callback) {
                    case 'ask_and_verify_default_peers':
                      __db_blockchain.ask_and_verify_default_peers(deserialized.data, index, pub);
                  }
                } else {
                  // malformed get_trusted response
                  this.ban_and_or_try_disconnect(reason = "MALFORMED_GET_TRUSTED_RESPONSE", index, socket = false, ban = true);
                  return;
                }
              } else { // got ask
                // { node: 'get_trusted', callback: 'ask_and_verify_default_peers' }
                if ( await __utils_typeof.is_typeof_get_trusted_ask(deserialized.data) ) {
                  const _data = Object.assign(deserialized.data, { response: __db_memory.db.default_peers } );
                  __db_memory.db.peers[index].socket.emit('data', await serialize(__db_memory.db.server.uuid, __db_memory.db.server.openpgp, _data, pub));
                } else {
                  // malformed get_trusted ask
                  this.ban_and_or_try_disconnect(reason = "MALFORMED_GET_TRUSTED_ASK", index, socket = false, ban = true);
                  return;
                }
              }
              break;
            case 'get_onlines': // initiated by peer who get handshake ack
                if (_deserialized_data_object_keys.includes('response')) { // got response
                    if ( await __utils_typeof.is_typeof_get_onlines_response(deserialized.data) ) {
                        for (let indexfor = 0; indexfor < deserialized.data.response.length; indexfor++) { // onlines => [ { server: '', port: '' }, ... ]
                            if (!__db_memory.db.get.peer.exist_server(deserialized.data.response[indexfor].server, deserialized.data.response[indexfor].port)) { // peer doesnt exist
                                if (!__db_memory.config.network.ip.includes(deserialized.data.response[indexfor].server) && (__db_memory.config.network.port != deserialized.data.response[indexfor].port)) { // avoid reconnecting to myself
                                    if (!__db_memory.db.get.peer.is_default_peer(__db_memory.config.network.ip, __db_memory.config.network.port) && !__db_memory.db.get.peer.is_default_peer(__db_memory.config.network.ip, __db_memory.config.network.port, __db_memory.db.connectivity_peers)) { // if im not a default or connectivity peer I dont ask for connection
                                      __db_memory.db.peers.push({ server: deserialized.data.response[indexfor].server, port: deserialized.data.response[indexfor].port }); // using direct array we dont have seen key // deserialized.data.response[indexfor] => { server: '', port: '' }
                                      // init ioc
                                      init_ioclient(__db_memory.db.peers.length-1);
                                    }
                                }
                            }
                        }
                        
                        // if got a response from a default peer (master) == a master is back online, then try sync too
                        // maybe dont do that, review TODO
                        // he is maybe late but it can be an helper idk
                        const is_default_peer_response = __db_memory.db.default_peers.filter((el) => { return __db_memory.db.peers[index].server.includes(el.server) && (__db_memory.db.peers[index].port == el.port) }).length > 0;
                        if (is_default_peer_response) { // force state on timeout
                            __db_memory.db.state.got_online_peers = false;
                        }
                        
                        setTimeout(async () => {
                            if (!__db_memory.db.state.got_online_peers) {
                                __db_memory.db.state.got_online_peers = true;
                                // sync main chain only
                                __db_blockchain.sync_chain({ chain: __db_blockchain.chainhash });
                                // get_myip (maybe dont ask every peer, make a random pool, or ask trusted)
                                for (let forindex = 0; forindex < __db_memory.db.default_peers.length; forindex++) {
                                  const _index_default_peer = __db_memory.db.get.peer.index_server(__db_memory.db.default_peers[forindex].server, __db_memory.db.default_peers[forindex].port);
                                  if (_index_default_peer >= 0) {
                                    if (Object.keys(__db_memory.db.peers[_index_default_peer]).includes('socket') && Object.keys(__db_memory.db.peers[_index_default_peer].socket).includes('connected') && __db_memory.db.peers[_index_default_peer].socket.connected) {
                                      const _data = { node: 'get_myip' };
                                        __db_memory.db.peers[_index_default_peer].socket.emit('data', await serialize(__db_memory.db.server.uuid, __db_memory.db.server.openpgp, _data, __db_memory.db.peers[_index_default_peer].pub));
                                      break;
                                    }
                                  }
                                }
                            }
                        }, __db_memory.timeout.got_online_peers);
                    } else {
                      // malformed get_onlines response
                      this.ban_and_or_try_disconnect(reason = "MALFORMED_GET_ONLINES_RESPONSE", index, socket = false, ban = true);
                      return;
                    }
                } else { // got ask
                    if ( await __utils_typeof.is_typeof_get_onlines_ask(deserialized.data) ) {
                      const _onlines = __db_memory.db.get.peer.onlines();
                      const _data = Object.assign(deserialized.data, { response: _onlines } );
                      __db_memory.db.peers[index].socket.emit('data', await serialize(__db_memory.db.server.uuid, __db_memory.db.server.openpgp, _data, pub));
                    } else {
                      // malformed get_onlines ask
                      this.ban_and_or_try_disconnect(reason = "MALFORMED_GET_ONLINES_ASK", index, socket = false, ban = true);
                      return;
                    }
                }
                break;
            default:
                break;
        }
    }
}


exports.print_sockets = () => {
  console.log('\n\n  ON SOCKET SERVER DISCONNECT');
  console.log('  remain in peers[] (as client)');
  for (let index = 0; index < __db_memory.db.peers.length; index++) {
    console.log(`    server ${__db_memory.db.peers[index].server} port ${__db_memory.db.peers[index].port} sid ${__db_memory.db.peers[index].sid}`);
  }
  console.log('  remain in io.of(\'/s2s\').sockets (as server)');
  for (let socket of __server.io.of('/s2s').sockets) {
    console.log(`    sid: ${socket[1].client.conn.id}`);
  }
}


exports.check_add_unconnected_peers = (peers_array) => {
  _is_default_peers = JSON.stringify(peers_array) == JSON.stringify(__db_memory.db.default_peers); // else it's connectivity
  // if trusted_list equals connectivity .. displaying default but it's connectivity ..
  console.log(`\n\n  .. checking if ${_is_default_peers ? 'DEFAULT' : 'CONNECTIVITY'} peers are in peers[]`);
  const _dc_peers_active_index = [];
  for (let index_dc_peer = 0; index_dc_peer < peers_array.length; index_dc_peer++) {
    for (let index_peer = 0; index_peer < __db_memory.db.peers.length; index_peer++) {
      const _object_keys_peer = Object.keys(__db_memory.db.peers[index_peer]);
      if (_object_keys_peer.includes('server') && _object_keys_peer.includes('port')) {
        if ( __db_memory.db.peers[index_peer].server.includes(peers_array[index_dc_peer].server) && __db_memory.db.peers[index_peer].port.includes(peers_array[index_dc_peer].port) ) {
          if ( _object_keys_peer.includes('socket') && Object.keys(__db_memory.db.peers[index_peer].socket).includes('connected') && __db_memory.db.peers[index_peer].socket.connected && _object_keys_peer.includes('sid') ) {
            _dc_peers_active_index.push(index_dc_peer);
          } else {
            console.log(`     removing disconnected ${_is_default_peers ? 'DEFAULT' : 'CONNECTIVITY'} peer from peers[] before retry, server: ${peers_array[index_dc_peer].server} port: ${peers_array[index_dc_peer].port}`);
            try {
              __db_memory.db.peers[index_peer].socket.disconnect();
            } catch (e) {}
            __db_memory.db.del.peer.index(index_peer);
          }
        }
      }
    }
  }
  if (_dc_peers_active_index.length == peers_array.length) {
    console.log(`  every ${_is_default_peers ? 'DEFAULT' : 'CONNECTIVITY'} peers are in peers, skip ..`);
  } else {
    for (let index_dc_peer = 0; index_dc_peer < peers_array.length; index_dc_peer++) {
      if ( !(__db_memory.config.network.ip.includes(peers_array[index_dc_peer].server) && __db_memory.config.network.port.includes(peers_array[index_dc_peer].port)) ) {
        if (!_dc_peers_active_index.includes(index_dc_peer)) {
          console.log(`     add ${_is_default_peers ? 'DEFAULT' : 'CONNECTIVITY'} peer server: ${peers_array[index_dc_peer].server} port: ${peers_array[index_dc_peer].port}`);
          __db_memory.db.peers.push({ server: peers_array[index_dc_peer].server, port: peers_array[index_dc_peer].port }); // using direct array we dont have seen key
          
          init_ioclient(__db_memory.db.peers.length-1);
        }
      } else {
        console.log(`     skip ${_is_default_peers ? 'DEFAULT' : 'CONNECTIVITY'} peer server: ${peers_array[index_dc_peer].server} port: ${peers_array[index_dc_peer].port}`);
      }
    }
  }
} // end check_add_unconnected_peers


exports.clean_server_sockets = () => {
  const _sid_keep = [];
  for (let index = 0; index < __db_memory.db.peers.length; index++) {
    if (Object.keys(__db_memory.db.peers[index]).includes('sid') && (__db_memory.db.peers[index].sid !== false)) {
      _sid_keep.push(__db_memory.db.peers[index].sid);
    }
  }
  for (let socket of __server.io.of('/s2s').sockets) {
    if (!_sid_keep.includes(socket[1].client.conn.id)) {
      console.log(`\n  cleaning server sockets (disconnect): ${socket[1].client.conn.id}\n`);
      socket[1].disconnect();
    }
  }
}


exports.disconnect_socket_server_with_sid = (sid) => {
  for (let socket of __server.io.of('/s2s').sockets) {
    if (sid.includes(socket[1].client.conn.id)) {
      console.log(`\n  disconnect_socket_server_with_sid: ${socket[1].client.conn.id}\n`);
      socket[1].disconnect();
    }
  }
}

// make it generic, => utils/socketio.js
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
