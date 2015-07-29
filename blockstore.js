var blockstore = exports;

var execSync = require('child_process').execSync;
var http = require('http');
var querystring = require('querystring');

var appid = "";
var appsecret = "";

var options =
  {
    hostname: "api.onename.com",
    port: 80,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

function onenameRequest (body, onResult){
    var req = http.request(options, function (res){
        res.setEncoding('utf8');

        var output = '';
        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
            if (res.statusCode = 200) onResult(null, obj);
	    else onResult(res.statusCode, obj);
        });

    });

    req.on('error', function(err) {});

    req.write(querystring.stringify(body));
    req.end();
}

blockstore.lookup (id, callback)
{  
    if (id === "satya") {return callback (null,"http://somthing.com");}
 
    var body = 
      {
	  
      };
    onenameRequest (body, function (err, obj) {
      if (err) {
	  // Look up failed
      }
      var url = obj[id].profile.webprofile;

      else url = null;
      // parse
      callback(null, url);
    });
}

blockstore.reserve(id, addr, profile, callback) {

    var body =
      {
	"passname": id,
	"recipient_address": addr,
	"passcard":{"Webprofile": profile} 
      };
    onenameRequest (body, function (err, obj) {
        if (err){return callback (err)}
        return callback (body.status, null) 
    });
}
