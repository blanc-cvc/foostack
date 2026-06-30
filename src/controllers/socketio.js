const { serialize, deserialize } = require('../common/network');

const __server = require('../server');
//const __db_memory = require('../db/memory');
const __utils_crypto = require('../utils/crypto');
const __utils_typeof = require('../utils/typeof');


exports.init = () => {
    // think about a channel to update web clients
    __server.io.of('/web').on('connection', async (socket) => {
        console.log(`web: as ioserver got client id ${socket.client.conn.id}: connected`);

        socket.on('data', async (serialized_data) => {
            try {
                // typeof handshake
                const _deserialized = await deserialize(require('../db/memory').db.server.openpgp, serialized_data);
                if (_deserialized.pub) { // handshake
                  if (await __utils_typeof.is_typeof_deserialized_handshake(_deserialized, port_false = true)) {
                    console.log(`web: as ioserver got client id ${socket.client.conn.id}: handshake`);
                    // TODO add checks like s2s
                    require('../db/memory').db.set.webpeer(_deserialized, socket.client.conn.id); // ADD PEER - ADD PEER - ADD PEER - ADD PEER
                    // emit { uuid, pub, port
                    socket.emit('data ack', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp));
                  } else {
                    // socketio s2s :628
                    // ban: bad hns
                  }
                // typeof else
                } else {
                  if (await __utils_typeof.is_typeof_deserialized_data(_deserialized)) {
                    // got { uuid, data: {}
                    console.log(`web: as ioserver got client id ${socket.client.conn.id}: data`);
                    // TODO add checks like s2s
                    require('../db/memory').db.set.webpeer(_deserialized, socket.client.conn.id); // UPDATE PEER - UPDATE PEER - UPDATE PEER - UPDATE PEER
                    
                    // review data ack ?
                    const _index = require('../db/memory').db.get.peer.index_uuid(_deserialized.uuid, require('../db/memory').db.webpeers);
                    socket.emit('data ack', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _deserialized.data, require('../db/memory').db.webpeers[_index].pub));
                    // end of ack
                    
                    console.log(_deserialized);
                    handle_data(_deserialized.data, socket, _index);
                  } else {
                    // ban: bad data
                  }
                }
            } catch (e) {
                console.log(e);
                console.log('GOT DATA (without pub) and peer not in webpeers array (maybe socket disconnected)');
            }
        });

        socket.on('data ack', async (serialized_data) => {
            console.log(`web: as ioserver got client id ${socket.client.conn.id}: data ack`);
            try {
                const _deserialized = await deserialize(require('../db/memory').db.server.openpgp, serialized_data);
                console.log(_deserialized);
            } catch (e) {
                console.log(e);
            }
        });

        socket.on('disconnect', () => {
            console.log(`web: as ioserver got client id ${socket.client.conn.id}: disconnected`);
            const _index = require('../db/memory').db.get.peer.index_sid(socket.client.conn.id, require('../db/memory').db.webpeers);
            require('../db/memory').db.del.webpeer.index(_index);
            console.log(require('../db/memory').db.webpeers);
        });
    });
}


const handle_data = async (data, socket, index) => {
  
  console.log(data);
  // add checks for handled data (typeof)
  if ((typeof data == 'object') && Object.keys(data).includes('origin')) {
    switch (data.origin) {
      case 'ui_footer_input_send':
        const _splitted_input = data.data.split(' ');
        switch (_splitted_input[0]) {
          case '/login':
          case '/login_auto':
            if (await __utils_typeof.is_typeof_web_login(data)) { // both: giving signed, asking seed
              if (Object.keys(data).includes('signed_seed')) { // giving signed
                const openpgp = require('openpgp');
                // exceptions TODO
                try {
                  const _signed = await openpgp.readCleartextMessage({ cleartextMessage: Buffer.from(data.signed_seed, 'base64').toString() });
                  const _json_login_data_signed = JSON.parse(_signed.text); _json_login_data_signed.err = {};
                  const _json_data_openpgp_pub_obj = await openpgp.readKey({ armoredKey: Buffer.from(_json_login_data_signed.pub, 'base64').toString() });
                  const _verify_result_clear = await openpgp.verify({ message: _signed, verificationKeys: _json_data_openpgp_pub_obj });
                  try { await _verify_result_clear.signatures[0].verified } catch (e) { _json_login_data_signed.err.signature_clear = `clear: Signature could not be verified: ${e.message}` }
                  if (!Object.keys(_json_login_data_signed.err).length) {
                      if (_json_login_data_signed.seed === require('../db/memory').db.webpeers[index].login.seed) {
                          require('../db/memory').db.webpeers[index].login.pub = _json_login_data_signed.pub;
                          
                          console.log(require('../db/memory').db.webpeers[index]);
                          
                          // => { login: 'connected' }
                          delete data.signed_seed;
                          const _response = Object.assign(data, { response: 'connected' });
                          socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _response, require('../db/memory').db.webpeers[index].pub));
                      } else {
                          require('../db/memory').db.del.webpeer.index(index);
                      }
                  } else {
                      require('../db/memory').db.del.webpeer.index(index);
                  }
                } catch (error) {
                  console.log(error);
                }
              } else { // asking seed
                const _seed = __utils_crypto.misc.generate.seed(50, 100, 'base64');
                require('../db/memory').db.webpeers[index].login = _seed;
                const _response = Object.assign(data, { response: _seed });
                socket.emit('data', await serialize(require('../db/memory').db.server.uuid, require('../db/memory').db.server.openpgp, _response, require('../db/memory').db.webpeers[index].pub));
              }
            } else {
              // ban: bad login
            }
        }
        break;
    }
  }
  // data: { origin: 'ui_footer_input_send', data: _data, path: window.location.pathname }
}

