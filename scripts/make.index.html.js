const fs = require('node:fs');
const path = require('node:path');

const htmlbundlefile = path.join(__dirname, '../src/web/index.bundle.html');
const htmlbundlejsfile = path.join(__dirname, '../src/web/index.bundle.html.js');
const htmlfile = path.join(__dirname, '../src/web/index.html');
const jsheaderfile = path.join(__dirname, '../src/web/js/header.bundle.js');
const jsbodyfile = path.join(__dirname, '../src/web/js/body.bundle.js');
const cssfile = path.join(__dirname, '../src/web/css/styles.bundle.css');

fs.readFile(htmlfile, 'utf8', (err_read_htmlfile,data_htmlfile) => {
  if (err_read_htmlfile) { return console.log(err_read_htmlfile) }
  
  fs.readFile(jsheaderfile, 'utf8', (err_read_jsheaderfile,data_jsheaderfile) => {
    if (err_read_jsheaderfile) { return console.log(err_read_jsheaderfile) }
    data_htmlfile = data_htmlfile.replace("<script id=\"jsheader\" src=\"/header.js\"></script>", `<script id="jsheader">${data_jsheaderfile}</script>`);
    
    fs.readFile(jsbodyfile, 'utf8', (err_read_jsbodyfile,data_jsbodyfile) => {
      if (err_read_jsbodyfile) { return console.log(err_read_jsbodyfile) }
      data_htmlfile = data_htmlfile.replace("<script id=\"jsbody\" src=\"/body.js\"></script>", `<script id="jsbody">${data_jsbodyfile}</script>`);
      
      fs.readFile(cssfile, 'utf8', (err_read_cssfile,data_cssfile) => {
        if (err_read_cssfile) { return console.log(err_read_cssfile) }
        data_htmlfile = data_htmlfile.replace("<link id=\"style\" href=\"/styles.css\" rel=\"stylesheet\">", `<style id="style">${data_cssfile}</style>`);
        
        fs.writeFile(htmlbundlefile, data_htmlfile, 'utf8', (err_write_htmlbundlefile) => {
         if (err_write_htmlbundlefile) { return console.log(err_write_htmlbundlefile) }
        });
        
        data_htmlfile = data_htmlfile.replace(/<\/body><\/html>/g, "");
        // helper: convert html file to inline string
        const obj = { html: ""};
        obj.html = data_htmlfile;
        data_htmlfile = JSON.stringify(obj);
        const test = JSON.parse(data_htmlfile);
        data_htmlfile = data_htmlfile.replace(/{"html":/g,"exports.default =");
        data_htmlfile = data_htmlfile.slice(0, -1);
        
        
        fs.writeFile(htmlbundlejsfile, data_htmlfile, 'utf8', (err_write_htmlbundlejsfile) => {
         if (err_write_htmlbundlejsfile) { return console.log(err_write_htmlbundlejsfile) }
        });

      });
      
    });
    
  });
  
});

