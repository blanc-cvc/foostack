const fs = require('node:fs');
const path = require('node:path');

const socketiojsfile = path.join(__dirname, '../src/web/js/body/socketio.bundle.js');
const socketioblobpartsjsfile = path.join(__dirname, '../src/web/js/body/socketio.blobparts.bundle.js');

fs.readFile(socketiojsfile, 'utf8', (err_read_socketiojsfile,data_socketiojsfile) => {
  if (err_read_socketiojsfile) { return console.log(err_read_socketiojsfile) }
  
  const obj = { stringjs: ""};
  obj.stringjs = data_socketiojsfile;
  data_socketiojsfile = JSON.stringify(obj);
  data_socketiojsfile = data_socketiojsfile.replace(/{"stringjs":/g,"exports.blobparts = [");
  data_socketiojsfile = data_socketiojsfile.slice(0, -1);
  data_socketiojsfile += "];";
  
  
  fs.writeFile(socketioblobpartsjsfile, data_socketiojsfile, 'utf8', (err_write_socketioblobpartsjsfile) => {
   if (err_write_socketioblobpartsjsfile) { return console.log(err_write_socketioblobpartsjsfile) }
  });

});
