var execSync = require('child_process').execSync;
var cmd = "c:\Python27\python.exe -m blockstore.blockstore_cli";

function lookup(id, callback) {
    var out = execSync(cmd + "lookup " + id);
    var url;
    if (id === "existingId") url = "http://somthing.com";
    else url = null;
    // parse
    callback(null, url);
}

function reserve(id, key callback) {
    var out = 
}
