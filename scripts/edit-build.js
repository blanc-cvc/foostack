const fs = require('node:fs');
const path = require('node:path');

const serverbundlejsfile = path.join(__dirname, '../src/server.bundle.js');

fs.readFile(serverbundlejsfile, 'utf8', (err_read_serverbundlejsfile,data_serverbundlejsfile) => {
  if (err_read_serverbundlejsfile) { return console.log(err_read_serverbundlejsfile) }
  
  data_serverbundlejsfile = data_serverbundlejsfile.replace(/process.env.FOOSTACK_DEV/g,"false");
  
  data_serverbundlejsfile = data_serverbundlejsfile.replace(/exports.IS_FOOSTACK_DEV=true/g,"exports.IS_FOOSTACK_DEV=false");
  data_serverbundlejsfile = data_serverbundlejsfile.replace(/exports.IS_FOOSTACK_DEV=!0/g,"exports.IS_FOOSTACK_DEV=0");
  
  fs.writeFile(serverbundlejsfile, data_serverbundlejsfile, 'utf8', (err_write_serverbundlejsfile) => {
   if (err_write_serverbundlejsfile) { return console.log(err_write_serverbundlejsfile) }
  });

});
