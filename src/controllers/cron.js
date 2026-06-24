const CONST_1M = 60 * 1000;
const CONST_1H = 60 * CONST_1M;
const CONST_1D = 24 * CONST_1H;

const __db_memory = require('../db/memory');
const __socketio_s2s = require('./socketio.s2s');

exports.init = () => {
    setInterval(() => { // 1 min
        console.log('\n==== RUNNING CRON 1 MIN ====\n');
        __socketio_s2s.check_add_unconnected_peers(__db_memory.db.default_peers);
        __socketio_s2s.check_add_unconnected_peers(__db_memory.db.connectivity_peers);
        
    }, CONST_1M); // 1 min


    setInterval(() => { // 10 min
        console.log('\n==== RUNNING CRON 10 MIN ====\n');
        

    }, 10 * CONST_1M); // 10 min


    setInterval(() => { // 1h
        console.log('\n==== RUNNING CRON 1 HOUR ====\n');
        __db_memory.db.del.webpeer.logins(4*CONST_1H); // login >= 4h (logout but dont remove peer)
        __db_memory.db.del.peer.blacklisted(24*CONST_1H); // date >= 24h

    }, CONST_1H); // 1h


    setInterval(() => { // 1d
        console.log('\n==== RUNNING CRON 1 DAY ====\n');
        __db_memory.db.del.webpeer.seens(CONST_1D); // seen >= 1D (remove peer)

    }, CONST_1D); // 1d
}