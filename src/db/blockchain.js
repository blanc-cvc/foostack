const path = require('node:path');
const fs = require('node:fs');
const DBFileSync = require('lowdb/adapters/FileSync');

const CONST_HASH = 'sha512';
const CONST_HASH_ENCODING = 'base64';

const __server = require('../server');
//const __db_memory = require('./memory');
const __common_network = require('../common/network');
const __controllers_socketio_s2s = require('../controllers/socketio.s2s');
const __utils_typeof = require('../utils/typeof');

exports.blockchains = {}; // use this.blockchains[callback_data.chain].read().. for debug or tests to force file read
exports.chainhash = false ;



exports.init = () => {
    console.log('\n\n Default peers:');
    console.log(require('./memory').db.default_peers);
    if (!fs.existsSync(path.join(process.env.HOME, '.foostack'))) { fs.mkdirSync(path.join(process.env.HOME, '.foostack')) }
    if (!fs.existsSync(path.join(process.env.HOME, '.foostack/blockchains'))) { fs.mkdirSync(path.join(process.env.HOME, '.foostack/blockchains')) }
    if (!fs.existsSync(path.join(process.env.HOME, `.foostack/blockchains/${require('./memory').config.network.port}`))) { fs.mkdirSync(path.join(process.env.HOME, `.foostack/blockchains/${require('./memory').config.network.port}`)) }
    
    
    this.chainhash = require('node:crypto').createHash('sha256').update(JSON.stringify(require('./memory').db.default_peers)).digest('hex');
    console.log(`\n Blockchain INIT with default chain: ${this.chainhash}\n`);
    
    
    // start by his chain
    this.blockchain_subscribe(this.chainhash);
    
    const _readdir_blockchain_files = fs.readdirSync(path.join(process.env.HOME, `.foostack/blockchains/${require('./memory').config.network.port}`), { recursive: false });
    for (let index = 0; index < _readdir_blockchain_files.length; index++) {
      _chainhash = _readdir_blockchain_files[index].split('.')[0];
      
      // remove every .syncdone files
      if (fs.existsSync(path.join(process.env.HOME, `.foostack/blockchains/${require('./memory').config.network.port}/${_chainhash}.syncdone`))) { 
        fs.rmSync(path.join(process.env.HOME, `.foostack/blockchains/${require('./memory').config.network.port}/${_chainhash}.syncdone`), { force: true, recursive: false });
      }
      
      if (_readdir_blockchain_files[index].split('.')[1] == 'json') {
        if (_chainhash != this.chainhash) {
          // then subscribe others
          this.blockchain_subscribe(_chainhash);
        }
      }
    }
}

const memory_blockchain_state_reset = (chainhash) => {
  const _is_blockchain_sync = (typeof require('./memory').db.blockchains[chainhash] == 'object') && require('./memory').db.blockchains[chainhash].is_blockchain_sync ? true : false; // keep is_blockchain_sync state on reset if true
  require('./memory').db.blockchains[chainhash] = { firstlast: { all: [], trusted: [], grouped: {} }, last_response_block: {}, is_blockchain_sync: _is_blockchain_sync };
}

exports.blockchain_unsubscribe = (chainhash) => {
  if (__utils_typeof.is_typeof_chain_string(chainhash)) {
    if (chainhash != this.chainhash) {
      if (typeof this.blockchains[chainhash] == 'object') {
        delete this.blockchains[chainhash];
        delete require('./memory').db.blockchains[chainhash];
        fs.rmSync(path.join(process.env.HOME, `.foostack/blockchains/${require('./memory').config.network.port}/${chainhash}.json`), { force: true, recursive: false });
        console.log(`\n blockchain_unsubscribe: ${chainhash}\n`);
      }
    } else {
      console.log(`\n cant unsubscribe default chain: ${chainhash}\n`);
    }
  }
}
exports.blockchain_subscribe = (chainhash) => {
  if (__utils_typeof.is_typeof_chain_string(chainhash)) {
    if (!this.blockchains[chainhash]) {
      const _path_blockchain_file = path.join(process.env.HOME, `.foostack/blockchains/${require('./memory').config.network.port}/${chainhash}.json`);
      if (fs.existsSync(_path_blockchain_file)) {
        let _data_blockchainfile = fs.readFileSync(_path_blockchain_file, { encoding: 'utf8' });
        try {
          const _array_db = JSON.parse(_data_blockchainfile);
          if (_array_db.length == 0) { _data_blockchainfile = ''; }
        } catch (e) { _data_blockchainfile = ''; }
        if (_data_blockchainfile[0] != '[') { _data_blockchainfile = ''; }
        fs.writeFileSync(_path_blockchain_file, _data_blockchainfile, { encoding: 'utf8' });
      }

      this.blockchains[chainhash] = require('lowdb')(new DBFileSync(_path_blockchain_file, { defaultValue: [{ block: 0, chain: chainhash, data: "", prev: "false" }] }));
      memory_blockchain_state_reset(chainhash);
      
      if (chainhash === this.chainhash) {
        this.blockchains[chainhash].default_peers = [];
        for (let index = 0; index < require('./memory').db.default_peers.length; index++) {
          this.blockchains[chainhash].default_peers.push(require('./memory').db.default_peers[index]);
        }
      } else {
        //this.blockchains[chainhash].default_peers = [];
        this.blockchains[chainhash].default_peers_check = { list: [], checked: [], unchecked: [] };
      }
    }
    console.log(`\n blockchain_subscribe ${chainhash}\n`);
  } else {
    console.log(`\n  !! blockchain_subscribe chain string invalid\n`);
  }
}

exports.new_block = (data, chain) => {
  // if chain === this.chainhash
    if (__utils_typeof.is_typeof_chain_string(chain)) {
      if (typeof this.blockchains[chain] == 'object') {
        const _last_block = this.blockchains[chain].last().value();
        const _prev_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest(CONST_HASH_ENCODING);
        const _block = { block: _last_block.block+1, chain: chain, data: data, prev: _prev_hash };
        this.blockchains[chain].push(_block).write();
        return _block;
      } else {
        console.log(`\n trying to add new block to unsubscribed chain: ${chain}\n`);
      }
    }
}

//TODO try to init IOC for new block of subscribed chains
exports.new_block_from_node = async (block, peer_index, peer_pub) => {
  if (__utils_typeof.is_typeof_chain_string(block.chain)) {
    if (typeof this.blockchains[block.chain] == 'object') { // subscribed
      if (Object.keys(this.blockchains[block.chain]).includes('default_peers')) { // the list is done
        if (require('./memory').db.get.peer.is_default_peer(require('./memory').db.peers[peer_index].server, require('./memory').db.peers[peer_index].port, this.blockchains[block.chain].default_peers)) { // this peer is trusted
          console.log(`\n  got new block ${block.block}\n`);
          const _last_block = this.blockchains[block.chain].last().value();
          const _last_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest(CONST_HASH_ENCODING);
          const _new_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(block)).digest(CONST_HASH_ENCODING);
          if (_last_block_hash === _new_block_hash) {
            console.log(`\n  ignored new block ${block.block} already got this block\n`);
          } else if (_last_block_hash === block.prev) {
            if (block.block > 0) {
              this.blockchains[block.chain].push(block).write();
              
              // emit the new block to every peer, if a peer is not directly connected to a default, he can have it
              const _data = { blockchain_method: 'new_block', block: block, chain: block.chain }
              for (let index = 0; index < require('./memory').db.peers.length; index++) {
                if (require('./memory').db.peers[index].socket.connected) {
                  const _is_default_peer = require('./memory').db.get.peer.is_default_peer(require('./memory').db.peers[index].server, require('./memory').db.peers[index].port);
                  if (!_is_default_peer) {
                    require('./memory').db.peers[index].socket.emit('data', await __common_network.serialize(
                      require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, require('./memory').db.peers[index].pub
                    ));
                  }
                }
              }
            }
          } else {
              // if im a trusted too TODO review
              if ( !require('./memory').db.get.peer.is_default_peer(require('./memory').config.network.ip, require('./memory').config.network.port) || (require('./memory').db.get.peer.is_default_peer(require('./memory').config.network.ip, require('./memory').config.network.port) && (_last_block.block < block.block)) ) {
                for (let i = block.block; i <= _last_block.block; i++) {
                  if (i > 0) {
                    this.blockchains[block.chain].remove({ block: i }).write();
                  }
                }
                if (block.block > 0) {
                  this.blockchains[block.chain].push(block).write();
                  
                }
                this.verify_chain(block.chain);
              } else {
                // my last block is upper, what to do ?
              }
          }
        } else {
          // ban
          console.log(`\n  IGNORED new block ${block.block} this peer is not trusted\n`);
        }
      } else {
        // ask for peer list
        console.log(`\n new block from chain ${block.chain} which is not currently trusted => ask_and_verify_default_peers\n`);
        const _data = { node: 'get_trusted', callback: 'ask_and_verify_default_peers' };
        require('./memory').db.peers[peer_index].socket.emit('data', await __common_network.serialize(require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, peer_pub));
      }
    } else { // ignoring this block NOT SUBSCRIBED
      console.log(`\n  IGNORED new block: ${block.block} from unsubscribed chain: ${block.chain}\n`);
    }
  } else { // chain string invalid
    console.log(`\n  !! new_block_from_node chain string invalid from peer index: ${peer_index}\n`);
    // ban
  }
}

// you can subscribe to a hash if absolutly all peers from get_trusted  respond with the same list corresponding to the hash
exports.ask_and_verify_default_peers = (callback_data, peer_index, peer_pub) => {
  const _chainhash = require('node:crypto').createHash('sha256').update(JSON.stringify(callback_data.response)).digest('hex');
  if (typeof this.blockchains[_chainhash] == 'object') { // subscribed
    if (require('./memory').db.get.peer.is_default_peer(require('./memory').db.peers[peer_index].server, require('./memory').db.peers[peer_index].port, callback_data.response)) { // this peer is included
      
      //{
      //    node: 'get_trusted',
      //    callback: 'ask_and_verify_default_peers',
      //    response: [
      //      { server: '127.0.0.1', port: '8004' },
      //      { server: '127.0.0.1', port: '8005' }
      //    ]
      //}
      //TypeError: Cannot read properties of undefined (reading 'list')
      if (this.blockchains[_chainhash].default_peers_check.list.length == 0) {
        console.log(`\n ask_and_verify_default_peers chain: ${_chainhash}, setting default_peers_check.list and default_peers_check.unchecked\n`);
        for (let index = 0; index < callback_data.response.length; index++) {
          this.blockchains[_chainhash].default_peers_check.list.push(callback_data.response[index]);
          this.blockchains[_chainhash].default_peers_check.unchecked.push(callback_data.response[index]);
        }
      }
      for (let forindexunchecked = 0; forindexunchecked < this.blockchains[_chainhash].default_peers_check.unchecked.length; forindexunchecked++) {
        if (require('./memory').db.peers[peer_index].server.includes(this.blockchains[_chainhash].default_peers_check.unchecked[forindexunchecked].server) && require('./memory').db.peers[peer_index].port.includes(this.blockchains[_chainhash].default_peers_check.unchecked[forindexunchecked].port)) {
          console.log(`\n ask_and_verify_default_peers chain: ${_chainhash}, moving server: ${this.blockchains[_chainhash].default_peers_check.unchecked[forindexunchecked].server} port: ${this.blockchains[_chainhash].default_peers_check.unchecked[forindexunchecked].port} from unchecked to checked\n`);
          this.blockchains[_chainhash].default_peers_check.checked.push(this.blockchains[_chainhash].default_peers_check.unchecked[forindexunchecked]);
          this.blockchains[_chainhash].default_peers_check.unchecked.splice(forindexunchecked, 1);
          forindexunchecked--;
        } else {
          // check if servers are in peers[]
          if ( !require('./memory').db.get.peer.exist_server(this.blockchains[_chainhash].default_peers_check.unchecked[forindexunchecked].server, this.blockchains[_chainhash].default_peers_check.unchecked[forindexunchecked].port) ) {
            // init ioc
            console.log(`\n ask_and_verify_default_peers chain: ${_chainhash} init connection to peers from array which is not already connected\n`);
            require('./memory').db.peers.push({ server: this.blockchains[_chainhash].default_peers_check.unchecked[forindexunchecked].server, port: this.blockchains[_chainhash].default_peers_check.unchecked[forindexunchecked].port }); // using direct array we dont have seen key
            __controllers_socketio_s2s.init_ioclient_from_outside(require('./memory').db.peers.length-1);
            // and wait for this peer sending new block
          }
        }
      }
      if (this.blockchains[_chainhash].default_peers_check.list.length == this.blockchains[_chainhash].default_peers_check.checked.length ) {
        this.blockchains[_chainhash].default_peers = [];
        for (let index = 0; index < this.blockchains[_chainhash].default_peers_check.checked.length; index++) {
          this.blockchains[_chainhash].default_peers.push(this.blockchains[_chainhash].default_peers_check.checked[index])
        }
        
        //CHECK IF DELETE IS OK
        delete this.blockchains[_chainhash].default_peers_check;
        console.log(`\n ask_and_verify_default_peers chain: ${_chainhash} is trusted waiting for new blocks\n`);
        console.log(this.blockchains[_chainhash].default_peers);
      }
    } else {
      // ban this peer and reset
      console.log(`\n ask_and_verify_default_peers chain: ${_chainhash} response is untrusted, reset\n`);
      this.blockchains[_chainhash].default_peers_check = { list: [], checked: [], unchecked: [] };
      // maybe add a cron to reset at timeout
    } // end this peer is included
  } // end typeof
}


exports.sync_chain = async (callback_data) => {
    if ( !callback_data.blockchain_method && !require('./memory').db.blockchains[callback_data.chain].is_blockchain_sync ) {
        console.log(`\n SYNC CHAIN: waiting firstlast responses for ${require('./memory').timeout.got_blockchain_firstlast/1000} seconds\n`);
        require('./memory').db.blockchains[callback_data.chain].is_blockchain_sync = true ;
        for (let index = 0; index < require('./memory').db.peers.length; index++) { // maybe dont ask every peer
            if (Object.keys(require('./memory').db.peers[index]).includes('socket') && Object.keys(require('./memory').db.peers[index].socket).includes('connected') && require('./memory').db.peers[index].socket.connected) {
                const _data = { blockchain_method: 'get_firstlast', callback: 'sync_chain', chain: callback_data.chain };
                require('./memory').db.peers[index].socket.emit('data', await __common_network.serialize(
                    require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, require('./memory').db.peers[index].pub
                ));
            }
        }
        setTimeout(() => {
            // remove timeout
            for (let index = 0; index < require('./memory').db.blockchains[callback_data.chain].firstlast.all.length; index++) {
                if (!require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].response) {
                    require('./memory').db.blockchains[callback_data.chain].firstlast.all.splice(index, 1);
                    index--;
                }
            }
            // callback_data: { chain: 'abc..def' }
            this.sync_chain(Object.assign(callback_data, { blockchain_method: 'get_firstlast', timeout: true }));
        }, require('./memory').timeout.got_blockchain_firstlast);
    } else {
        // { blockchain_method: 'get_firstlast', first_last: { first: x, last: x }, server: 'IP:PORT' };
      if ((typeof callback_data == 'object') && Object.keys(callback_data).includes('blockchain_method') ) {
        switch (callback_data.blockchain_method) {
            case 'get_block':
                let _last_block = this.blockchains[callback_data.chain].read().last().value();
                const _last_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest(CONST_HASH_ENCODING);
                
                if (Object.keys(require('./memory').db.timeout.get_block).length > 0) {
                  if ( (typeof require('./memory').db.timeout.get_block[callback_data.response.block] == 'object') && Object.keys(require('./memory').db.timeout.get_block[callback_data.response.block]).includes('server') ) {
                    if ( (require('./memory').db.timeout.get_block[callback_data.response.block].server == callback_data.server)
                      && (require('./memory').db.timeout.get_block[callback_data.response.block].port == callback_data.port) ) {
                      // clear get block timeout
                      clearTimeout(require('./memory').db.timeout.get_block[callback_data.response.block].timeout);
                      delete require('./memory').db.timeout.get_block[callback_data.response.block];
                    } else {
                      __controllers_socketio_s2s.ban_and_or_try_disconnect(reason = "BAD_GOT_RESPONSE_WITHOUT_ASK", require('./memory').db.get.peer.index_server(callback_data.server, callback_data.port), socket = false, ban = true);
                    }
                  }
                }
                
                if ( (_last_block == undefined) || ((callback_data.response.block > 0) && (_last_block_hash === callback_data.response.prev)) ) {
                    if (_last_block == undefined) {
                      const _path_blockchain_file = path.join(process.env.HOME, `.foostack/blockchains/${require('./memory').config.network.port}/${callback_data.chain}.json`);
                      fs.writeFileSync(_path_blockchain_file, '[]', { encoding: 'utf8' });
                      _last_block = { block: 0 };
                    } else {
                      this.blockchains[callback_data.chain].push(callback_data.response).write(); // write the new block
                    }
                } else { // ask get -1
                    if (_last_block.block > 0) {
                      this.blockchains[callback_data.chain].remove({ block: _last_block.block }).write();
                    }
                    if ( callback_data.response.prev !== '' && require('./memory').db.default_peers.filter((el) => { return callback_data.server.includes(el.server) && (callback_data.port == el.port) }).length != 0 ) {
                        // this new block is from default peers (trusted)
                        // blacklist last node response if last block response block number is == callback_data.response.block-1
                        if ( require('./memory').db.blockchains[callback_data.chain].last_response_block.response && (require('./memory').db.blockchains[callback_data.chain].last_response_block.response.block == callback_data.response.block-1) ) {
                            // callback_data is trusted
                            // if last_response_block is not a default (master) then ban last_response_block
                            // else: undefined ban thing
                            const _index_server = require('./memory').db.default_peers.filter((el) => { return require('./memory').db.blockchains[callback_data.chain].last_response_block.server.includes(el.server) && (require('./memory').db.blockchains[callback_data.chain].last_response_block.port == el.port) }).length == 0
                                ? // last_response_block is NOT default peer (block-1)
                                  require('./memory').db.get.peer.index_server(require('./memory').db.blockchains[callback_data.chain].last_response_block.server, require('./memory').db.blockchains[callback_data.chain].last_response_block.port)
                                : // last_response_block is default peer (trusted..) (block-1)
                                  -1 // undefined ban thing
                            ;
                            
                            if (_index_server >= 0) {
                              // loop on firstlast 
                              for (let index = 0; index < require('./memory').db.blockchains[callback_data.chain].firstlast.all.length; index++) {
                                if (require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].server.includes(require('./memory').db.peers[_index_server].server) && require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].port.includes(require('./memory').db.peers[_index_server].port)) {
                                  // remove the disconnected peer
                                  require('./memory').db.blockchains[callback_data.chain].firstlast.all.splice(index, 1);
                                  index--;
                                }
                              } // end for loop firstlast
                              
                              const _trusted_last_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0].response.last)).digest(CONST_HASH_ENCODING);
                              // loop on grouped
                              for (let index = 0; index < require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash].length; index++) {
                                if (require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash][index].server.includes(require('./memory').db.peers[_index_server].server) && require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash][index].port.includes(require('./memory').db.peers[_index_server].port)) {
                                  require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash].splice(index, 1);
                                  index--;
                                }
                              } // end for loop grouped

                              __controllers_socketio_s2s.ban_and_or_try_disconnect(reason = "BAD_BLOCK", _index_server, socket = false, ban = true);
                            } else if (_index_server === -1) {
                              // undefined ban thing bad callback and bad last_response_block from trusted
                            }
                            
                            //const _port = _server_port.slice(_server_port.lastIndexOf(':') + 1);
                            //const _server = _server_port.slice(0, _server_port.lastIndexOf(':'));
                            console.log('\n\n BLACKLIST:');
                            console.log(require('./memory').db.blacklist);
                        }
                    }
                }

                if (callback_data.response.prev !== '') { // call from verify_chain
                    require('./memory').db.blockchains[callback_data.chain].last_response_block = callback_data;
                }
                const _data = ( (_last_block_hash === callback_data.response.prev) || (callback_data.response.block == 0) )
                    ? { blockchain_method: 'get_block', block: this.blockchains[callback_data.chain].read().last().value().block+1, callback: 'sync_chain', chain: callback_data.chain }
                    : { blockchain_method: 'get_block', block: _last_block.block, callback: 'sync_chain', chain: callback_data.chain };
                
                const _is_firstlastlast_equals_dblast = JSON.stringify(require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0].response.last) === JSON.stringify(this.blockchains[callback_data.chain].read().last().value()) ;
                //false const _is_firstlastlast_equals_callback = require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0].response.last.block === callback_data.response.block ; // !=

                if (!_is_firstlastlast_equals_dblast) {
                    const _trusted_last_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0].response.last)).digest(CONST_HASH_ENCODING);
                    const _randomint = require('node:crypto').randomInt(0, (require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash].length) )
                    const _random_peer_firstlast = require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash].length > 1
                        ? require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash][_randomint]
                        : require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash][0];
                    
                    // get block 0 from trusted
                    const _peer_index = (_data.block == 0)
                      ? require('./memory').db.get.peer.index_server(require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0].server, require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0].port)
                      : require('./memory').db.get.peer.index_server(_random_peer_firstlast.server, _random_peer_firstlast.port);
                    
                    if (_peer_index >= 0) {
                        require('./memory').db.peers[_peer_index].socket.emit('data', await __common_network.serialize(
                            require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, require('./memory').db.peers[_peer_index].pub
                        ));
                        require('./memory').db.timeout.get_block[_data.block] = {};
                        require('./memory').db.timeout.get_block[_data.block].server = _random_peer_firstlast.server;
                        require('./memory').db.timeout.get_block[_data.block].port = _random_peer_firstlast.port;
                        require('./memory').db.timeout.get_block[_data.block].timeout = setTimeout(() => {
                            __controllers_socketio_s2s.ban_and_or_try_disconnect(reason = "PEER_GET_BLOCK_TIMEOUT", require('./memory').db.get.peer.index_server(_random_peer_firstlast.server, _random_peer_firstlast.port), socket = false, ban = false);
                            require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash].splice(_randomint, 1);
                            delete require('./memory').db.timeout.get_block[_data.block];
                            this.sync_chain(callback_data); // redo timeout
                        }, 10 * 1000);
                    } else {
                        this.sync_chain(callback_data); // redo random peer maybe offline
                    }
                    
                } else { // _is_firstlastlast_equals_dblast
                
                    //console.log(require('./memory').db.blockchains[callback_data.chain].last_response_block);
                    //console.log(require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash].length);
                    console.log('\n\n Full sync done !');
                    //require('./memory').db.blockchains[callback_data.chain].firstlast = { all: [], trusted: [], grouped: {} }; // reset firstlast
                    //require('./memory').db.blockchains[callback_data.chain].last_response_block = {}; // reset saved responses
                    //this.verify_chain(); // not checking if the length equals last block from firstlast
                    memory_blockchain_state_reset(callback_data.chain);
                    this.verify_chain(callback_data.chain);
                }
                break;
            case 'get_firstlast':
                // remove duplicated responses TODO TODO
                if (!callback_data.timeout) { require('./memory').db.blockchains[callback_data.chain].firstlast.all.push(callback_data) }

                if (callback_data.timeout) { // on timeout do
                    console.log('\n\n  => blockchain firstlast array done:');
                    console.log(require('./memory').db.blockchains[callback_data.chain].firstlast.all);
                    
                    if (require('./memory').db.blockchains[callback_data.chain].firstlast.all.length == 0) {
                      console.log('\n\n  !! blockchain firstlast array EMPTY (nodes offline).. waiting..'); 
                      memory_blockchain_state_reset(callback_data.chain);
                      require('./memory').db.blockchains[callback_data.chain].is_blockchain_sync = false;
                      return;
                    }
                    const _first_block = this.blockchains[callback_data.chain].read().first().value();
                    const _first_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_first_block)).digest(CONST_HASH_ENCODING);
                    const _last_block = this.blockchains[callback_data.chain].read().last().value();
                    const _last_block_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_last_block)).digest(CONST_HASH_ENCODING);

                    // require('./memory').db.blockchains[callback_data.chain].firstlast.trusted containing only 1 blockchain.firstlast.all[x] element
                    // require('./memory').db.blockchains[callback_data.chain].firstlast.grouped containing all but grouped by last block hash
                    for (let index = 0; index < require('./memory').db.blockchains[callback_data.chain].firstlast.all.length; index++) {
                        const _this_first_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].response.first)).digest(CONST_HASH_ENCODING);
                        const _this_last_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].response.last)).digest(CONST_HASH_ENCODING);
                        if (_this_first_hash !== _first_block_hash) { // for every peer where first block is different, blacklist(24h) and disconnect. not same chain.
                            //const _server_port = `${require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].server}:${require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].port}`;
                            require('./memory').db.blacklist.push({
                                server: require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].server,
                                port: require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].port,
                                reason: 'WRONG_CHAIN', date: Date.now()
                            });
                            //require('./memory').db.blacklist[_server_port] = { reason: 'BAD_CHAIN', date: Date.now() };
                            const _index_server = require('./memory').db.get.peer.index_server(require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].server, require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].port);
                            require('./memory').db.peers[_index_server].socket.disconnect();
                            require('./memory').db.blockchains[callback_data.chain].firstlast.all.splice(index, 1);
                            index--;
                        } else { 
                            if ( require('./memory').db.get.peer.is_default_peer(require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].server, require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].port, this.blockchains[callback_data.chain].default_peers) ) {  // trusted, currently we keep the highest block from trusted
                                if (require('./memory').db.blockchains[callback_data.chain].firstlast.trusted.length > 0) { // keeping the highest trusted in the next if
                                    if (require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0].response.last.block < require('./memory').db.blockchains[callback_data.chain].firstlast.all[index].response.last.block) {
                                        require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0] = require('./memory').db.blockchains[callback_data.chain].firstlast.all[index];
                                    }
                                } else {
                                    require('./memory').db.blockchains[callback_data.chain].firstlast.trusted.push(require('./memory').db.blockchains[callback_data.chain].firstlast.all[index]);
                                }
                            }
                            if (!require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_this_last_hash]) { require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_this_last_hash] = [] }
                            require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_this_last_hash].push(require('./memory').db.blockchains[callback_data.chain].firstlast.all[index]);
                        }
                    }
                    if ( (typeof require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0] != 'object') || ((typeof require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0] == 'object') && !Object.keys(require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0]).includes('response')) ) {
                        console.log('\n\n  !! blockchain firstlast array without trusted response.. waiting trusted to be back online..'); 
                        memory_blockchain_state_reset(callback_data.chain);
                        require('./memory').db.blockchains[callback_data.chain].is_blockchain_sync = false;
                        return;
                    }
                    if ( require('./memory').db.get.peer.is_default_peer(require('./memory').config.network.ip, require('./memory').config.network.port) && (_last_block.block > require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0].response.last.block) ) {
                        console.log('\n\n  current last block is after this firstlast, stop and ignore'); 
                        console.log(_last_block);
                        memory_blockchain_state_reset(callback_data.chain);
                        require('./memory').db.blockchains[callback_data.chain].is_blockchain_sync = false;
                        return;
                    }
                    
                    //console.log(callback_data);
                    //console.log(require('./memory').db.blockchains[callback_data.chain].firstlast);
                    const _trusted_last_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(require('./memory').db.blockchains[callback_data.chain].firstlast.trusted[0].response.last)).digest(CONST_HASH_ENCODING);
                    console.log('\n\n  => Trusted last hash nodes list:');
                    console.log(require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash]);

                    // BLACKLIST undefined

                    if (require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash].length > 0) {
                        const _random_peer_firstlast = require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash].length > 1
                            ? require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash][require('node:crypto').randomInt(0, require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash].length)]
                            : require('./memory').db.blockchains[callback_data.chain].firstlast.grouped[_trusted_last_hash][0];

                        if (_last_block_hash != require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_random_peer_firstlast.response.last)).digest(CONST_HASH_ENCODING)) {
                            
                            const _data = _last_block.block < _random_peer_firstlast.response.last.block
                                ? { blockchain_method: 'get_block', block: _last_block.block+1, callback: 'sync_chain', chain: callback_data.chain }
                                : { blockchain_method: 'get_block', block: _random_peer_firstlast.response.last.block, callback: 'sync_chain', chain: callback_data.chain };
                            
                            if (_last_block.block > _random_peer_firstlast.response.last.block) {
                                for (let index = _random_peer_firstlast.response.last.block; index <= _last_block.block; index++) {
                                    if (index > 0) {
                                      this.blockchains[callback_data.chain].remove({ block: index }).write();
                                    }
                                }
                            }
                            const _peer_index = require('./memory').db.get.peer.index_server(_random_peer_firstlast.server, _random_peer_firstlast.port);
                            if (_peer_index >= 0) {
                                require('./memory').db.peers[_peer_index].socket.emit('data', await __common_network.serialize(
                                    require('./memory').db.server.uuid, require('./memory').db.server.openpgp, _data, require('./memory').db.peers[_peer_index].pub
                                ));
                            } else {
                                this.sync_chain(callback_data); // redo random peer maybe offline
                            }
                        } else {
                            this.verify_chain(callback_data.chain);
                        }
                      
                    } else {
                      
                      this.verify_chain(callback_data.chain);
                      
                    }


                    //


                }
                break;
        
            default:
                break;
        }
      }
    }
}

//don't try to verify chain until firstlast array done inside sync_chain function
exports.verify_chain = (chain) => {
    let is_sync_chain_called = false;
    const _last_block = this.blockchains[chain].read().last().value();
    if (_last_block.block > 0) {
        for (let index = 1; index <= _last_block.block; index++) {
            const _block = this.blockchains[chain].read().find({ block: index }).value();
            const _prev_block = this.blockchains[chain].read().find({ block: index-1 }).value();
            const _prev_hash = require('node:crypto').createHash(CONST_HASH).update(JSON.stringify(_prev_block)).digest('base64');
            if (!_block || (_block.prev != _prev_hash) || (_block.chain != chain)) {
                for (let i = index; i <= _last_block.block; i++) {
                  if (i > 0) {
                    this.blockchains[chain].remove({ block: i }).write();
                  }
                }
                if (require('./memory').db.blockchains[chain].firstlast.all.length > 0) {
                    is_sync_chain_called = true;
                    this.sync_chain({ blockchain_method: 'get_block', callback: 'sync_chain', chain: chain, block: !_block ? index : index-1, response: { block: !_block ? index : index-1, prev: "" } });
                } else {
                    is_sync_chain_called = true;
                    this.sync_chain({ chain: chain });
                }
                break;
            }
            if (_last_block.block == index) {
              require('./memory').db.blockchains[chain].is_blockchain_sync = false;
            }
        }
    } else {
      require('./memory').db.blockchains[chain].is_blockchain_sync = false;
    }
    if (!is_sync_chain_called) {
      console.log('\n  => Chain is verified !');
      fs.writeFileSync(path.join(process.env.HOME, `.foostack/blockchains/${require('./memory').config.network.port}/${chain}.syncdone`), '', { encoding: 'utf8' });
    }
}


