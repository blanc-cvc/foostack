const openpgp = require('openpgp');
const { serialize, deserialize } = require('../../../common/network');

const _location = typeof document !== ('undefined'||null) ? '' : `${location.origin}`;
const client = { uuid: false, openpgpcreds: false, serverpub: false, socket: false, login_auto_user_openpgpcreds: false, login_user_openpgpcreds: { seed: false, pub: false, signed_seed: false } }

// if i'm a worker
if (typeof document === "undefined") {
  const __domething = require('../domething');
  const keep_fn = require('../domkeep').keep.functions;
  for (const el of [navigator, self]) {
    const _keep_fn = (el instanceof WorkerGlobalScope) ? keep_fn['window'] : [];
    for (let key in el) {
      if ((typeof el[key] == 'function') && !_keep_fn.includes(key)) {
        try {
          el[key] = 'undefinednotinkeepfn';
        } catch (e) {}
      }
    }
  }
  __domething.cleanup_prototypes();
  __domething.lock_prototypes();
}

const gen_login_auto_user_openpgpcreds = async () => {
  client.login_auto_user_openpgpcreds = await require('../../../common/crypto').openpgp.generate('user', 'user@test.local');
}
const send_data = async (data) => {
  const _serialized = await serialize(client.uuid, client.openpgpcreds, data, client.serverpub);
  client.socket.emit('data', _serialized);
}
const init = (init_cb_fn) => {
    client.socket = require('socket.io-client')(`${_location}/web`, require('../../../common/network').socketio_client_options);
    
    client.socket.on('connect', async () => {
        client.serverpub = false;
        client.uuid = require('uuid').v5('web', require('uuid').v4());
        
        //
        client.openpgpcreds = await require('../../../common/crypto').openpgp.generate(client.uuid, `${client.uuid}@test.local`);
        
        //init_cb_fn({ socket: { on: 'connect', id: client.socket.io.engine.id, uuid: client.uuid } });
        init_cb_fn({ on: 'connect' });
        
        client.socket.emit('data', await serialize(client.uuid, client.openpgpcreds)); // handshake init
    });
    client.socket.on('data', async (serialized_data) => {
        const _deserialized = await deserialize(client.openpgpcreds, serialized_data, client.serverpub);
    
        init_cb_fn({ on: 'data', deserialized_data: _deserialized.data });
        //init_cb_fn({ socket: { on: 'data', id: client.socket.io.engine.id, uuid: client.uuid, deserialized: _deserialized  } });
    
        // review data ack ?
        const _serialized = await serialize(client.uuid, client.openpgpcreds, _deserialized.data, client.serverpub);
        client.socket.emit('data ack', _serialized);
        
        if ( (_deserialized.data.path == '/connection') && (_deserialized.data.origin == 'ui_footer_input_send') ) {
          if ((_deserialized.data.data == '/login') && Object.keys(_deserialized.data).includes('response') && Object.keys(_deserialized.data.response).includes('seed')) {
            client.login_user_openpgpcreds.seed = _deserialized.data.response.seed;
          }
          if (_deserialized.data.data == '/login_auto') {
            handle_login_auto(_deserialized.data);
          }
          
        }

    /*
        const _json_data = _deserialized.data;
    
        if (_json_data.login) {
            handle_login(_deserialized);
        }
        */
    });
    client.socket.on('data ack', async (serialized_data) => {
        if (!client.serverpub) { // handshake
            // got { uuid, pub, port
              // port is only used on s2s
            const _deserialized = await deserialize(client.openpgpcreds, serialized_data);
            //init_cb_fn({ socket: { on: 'data ack (hns)', id: client.socket.io.engine.id, uuid: client.uuid, deserialized: _deserialized  } });
            init_cb_fn({ on: 'data ack (hns)', deserialized: _deserialized });
            
            client.serverpub = _deserialized.pub;
            
            // emit { uuid, data: { login: 'ask_login_data'
            //client.socket.emit('data', await serialize(client.uuid, client.openpgpcreds, { login: 'ask_login_data' }, client.serverpub));
        } else { // data ack
            const _deserialized = await deserialize(client.openpgpcreds, serialized_data, client.serverpub);
            //init_cb_fn({ socket: { on: 'data ack', id: client.socket.io.engine.id, uuid: client.uuid, deserialized: _deserialized  } });
            init_cb_fn({ on: 'data ack', deserialized_data: _deserialized.data });
        }
    });
    client.socket.on('disconnect', () => {
      //init_cb_fn({ socket: { on: 'disconnect', id: client.socket.io.engine.id, uuid: client.uuid  } });
      init_cb_fn({ on: 'disconnect' });
    });
    
}


// BASE: Worker, fallback to callback if !window.Worker
const onmessage_common = (onmessage_common_e, onmessage_common_cb_fn = false) => {
  // onmessage_common_e is an object event containing data (as worker)
  //                    is an object just containing data (as callback)
  
  if ((typeof document !== "undefined") && document instanceof Document) {
      postMessage = onmessage_common_cb_fn;
  } // if i'm not a worker postMessage is a callback
  
  if (onmessage_common_e.data.origin == 'init') {
    init((data) => {
      postMessage(data);
    });
  } else {
    if ( (onmessage_common_e.data.path == '/connection') && (onmessage_common_e.data.origin == 'ui_footer_input_send') ) {

      if (client.login_user_openpgpcreds.seed && !client.login_user_openpgpcreds.pub) {
        const _askSigned = async () => {
          try {
            //const mess = await openpgp.createMessage({ text: 'test' });
            const keypub = await openpgp.readKey({ armoredKey: onmessage_common_e.data.data });
            // const userpub = await openpgp.encrypt({
            // message: mess,
            // encryptionKeys: keypub
            // });
          } catch (e) {
            postMessage({ on: 'set', name: 'pub', err: onmessage_common_e.data.data, _err: 'pub (user) not valid' });
            return;
          }
          const _serialize_test = await serialize(client.uuid, client.openpgpcreds, Buffer.from(onmessage_common_e.data.data).toString('base64'), client.serverpub) ;
          if ((typeof _serialize_test == 'object') && Object.keys(_serialize_test).includes('err')) {
            postMessage({ on: 'set', name: 'pub', test: JSON.stringify(_serialize_test), err: 'pub (client) not valid' });
            return;
          }
          client.login_user_openpgpcreds.pub = Buffer.from(onmessage_common_e.data.data).toString('base64');
          const _message = `{ "seed": "${client.login_user_openpgpcreds.seed}", "pub": "${client.login_user_openpgpcreds.pub}" }`;
          //const _unsigned = await openpgp.createCleartextMessage(_message);
          postMessage({ on: 'set', name: 'pub', do: 'sign', message: _message });
        }
        _askSigned();
        return;
      } else if (client.login_user_openpgpcreds.pub && !client.login_user_openpgpcreds.signed_seed) {
        client.login_user_openpgpcreds.signed_seed = Buffer.from(onmessage_common_e.data.data).toString('base64');
        onmessage_common_e.data = Object.assign(onmessage_common_e.data, { signed_seed: client.login_user_openpgpcreds.signed_seed });
        onmessage_common_e.data.data = '/login';
      }

      if (onmessage_common_e.data.data == '/login_auto') {
        gen_login_auto_user_openpgpcreds();
      }
    }
    send_data(onmessage_common_e.data);
  }
}
// without Worker:
//   call require(_this_)._onmessage with postMessage_data
//   and use _onmessage_cb_fn as callback
exports._onmessage = (_onmessage_e, _onmessage_cb_fn) => {
  onmessage_common(_onmessage_e, (data) => {
    _onmessage_cb_fn(data);
  });
}

onmessage = onmessage_common;





const handle_login_auto = async (deserialized_data) => {
  if ((typeof deserialized_data == 'object') && Object.keys(deserialized_data).includes('response')) {
    if (Object.keys(deserialized_data.response).includes('seed')) {
      const _openpgp_local_priv_obj = await openpgp.readKey({ armoredKey: Buffer.from(client.login_auto_user_openpgpcreds.priv, 'base64').toString() });
      const _message = { text: `{ "seed": "${deserialized_data.response.seed}", "pub": "${client.login_auto_user_openpgpcreds.pub}" }` };
      const _unsigned = await openpgp.createCleartextMessage(_message);
      const _signed = await openpgp.sign({ message: _unsigned, signingKeys: _openpgp_local_priv_obj });
      
      // delete response and add signed_seed to deserialized_data
      delete deserialized_data.response;
      deserialized_data = Object.assign(deserialized_data, { signed_seed: Buffer.from(_signed).toString('base64') });
      client.socket.emit('data', await serialize(client.uuid, client.openpgpcreds, deserialized_data, client.serverpub));
    }
  }
}
  /*
  switch (_json_data.login) {
      case 'ask_login_data':
          // { login: 'ask_login_data', seed: _seed.seed }
          
          _login_auto_user_openpgpcreds = await require('../../../common/crypto').openpgp.generate('user', 'user@test.local');
          
          const _openpgp_local_priv_obj = await openpgp.readKey({ armoredKey: Buffer.from(_login_auto_user_openpgpcreds.priv, 'base64').toString() });
          const _message = { text: `{ "seed": "${_json_data.seed}", "pub": "${_login_auto_user_openpgpcreds.pub}" }` };
          const _unsigned = await openpgp.createCleartextMessage(_message);
          const _signed = await openpgp.sign({ message: _unsigned, signingKeys: _openpgp_local_priv_obj });
          
          // { login: 'login_data_signed', data: Buffer.from(_signed).toString('base64') } --- data: { seed: '', pub: '' }

          // !!! pgpconnect: add __pub__ to text to sign (is replaced by the pgpconnect public key(base64))
          client.socket.emit('data', await serialize(client.uuid, client.openpgpcreds, { login: 'login_data_signed', data: Buffer.from(_signed).toString('base64') }, client.serverpub));
          break;
      case 'connected':
          break;
      case 'disconnected':
          break;
  
      default:
          break;
  }
}
*/
