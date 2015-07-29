const PROVIDER_PORT= 80;
const PROVIDER_URL= "http://www.firstuaserver.com";
const DATASTORE_URL= "http://www.firstprofilestore.com";

var http = require('http');
var express = require('express');
var crypto = require('crypto');
var querystring = require('querystring');
var execSync = require('child_process').execSync;
var http = require('http');
var querystring = require('querystring');
var bodyParser= require('body-parser'); 

var appid = "";
var appsecret = "";

// BLOCKSTORE STUFF
var options =
  {
    hostname: "api.onename.com",
    port: 80,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

function blockstoreonenameRequest (body, onResult){
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

function blockstorelookup (id, callback)
{  
    if (id === "satya") {return callback (null,"http://somthing.com");}
 
    var body = 
      {
	  
      };
    onenameRequest (body, function (err, obj) {
      if (err) {return callback(err)}

      var url = obj[id].profile.webprofile;
      return callback(null, url);
    });
}

function blockstorereserve(id, addr, profile, callback) {
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

// MAIN STUFF
var app = express();
app.use(bodyParser.json());
function exitOnError(err) {
    console.error(err);
    process.exit(-1);
}

function newProfileObject(uaPubKey) {
    return {
        agents: [{UA_pub:uaPubkey}]
    }
}
function getRequestOptions(method, url){
  return  {
    hostname: url,
    port: 80,
    method: method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
}

function GetProfile(profileUrl, callback) {
    var req = http.request(getRequestOptions('GET', profileUrl), function (res) {
        if (res.statusCode == 404) {
            callback(404);
            exitOnError(404);
        }

        res.setEncoding('utf8');
        var text= '';
        response.on('data', function (chunk) {text += chunk});
        
        res.on('end', function() {
            // return as string since we don't always need it parsed
            callback(null, '{'+text+'}');
        });
    });
    req.on('error', exitOnError)
    req.end();
}

function RequestUrlFromStore(datastoreUrl, requestObj, callback) {
    var req = http.request(getRequestOptions('POST', datastoreUrl), function (res) {
        if (res.statusCode == 404) {
            callback(404);
            exitOnError(404);
        }

        res.setEncoding('utf8');
        var text= '';
        response.on('data', function (chunk) {text += chunk});
        
        res.on('end', function() {
            callback(null, querystring.parse(text).location);
        });
    });    
    req.on('error', exitOnError);
    
    req.write(querystring.stringify(requestObj));
    req.end();
}

function connectProfile (request, response) {
		// Check parameters
		var id = request.body.id;
		console.log('id= ' + id)
		
		// Save connection data
		var socket = request.connection;
		var ipAddr = socket.remoteAddress;
		var port = socket.remotePort;

		// Lookup profile on the blockstore
    blockstorelookup(id, function (err, profileUrl) {
        if (err) {exitOnError(err)}
        if (!profileUrl) {
            // Reply to client that the id could not be resolved
            // This expected for new users and is not an application error 
            response.statusCode = 404;
            response.end();
            return;
        }
        GetProfile(profileUrl, function (err, profile) {
            if (err) {
                //TODO: Reply to the client
                exitOnError(err)
            }
            // Reply to the client with profile info
            console.log("lookup successful! url= " + profileUrl);
            response.statusCode = 200;
            response.write(querystring.stringify({id: id, provider: PROVIDER_URL, profile: profile}))
            response.end();
        });
    });
}

function  createProfile (request, response) {
    // Check parameters
    var id = request.body.id;
    var primaryFactor = request.body.primaryFactor;
    var secondaryFactor = request.body.secondaryFactors[1];
    console.log('id= ' + id)
		console.log('primaryFactor= ' + primaryFactor)
		console.log('secondaryFactors[1]= ' + secondaryFactor)

    // Generate keypair
    // Change to 2048 for production
    var Diffhell = crypto.createDiffieHellman(256);

    var bcPubKey = Diffhell.generateKeys();
    var bcPubKey = Diffhell.getPrivateKey

    var uaPubKey = Diffhell.generateKeys();
    var uaPrivKey = Diffhell.getPrivateKey
    // TODO: Save uaPrivKey

    // Reserve name on the blockchain
    blockstorereserve(id, bcPrivKey, function (err, success) {
        if (err) {
            // TODO: reply to client
            exitOnError(err)
        }
        if (!sucess) {
            // TODO: reply to client that the id was taken
            return;
        }

        console.log("blockstore reservation successful!");

        // Create profile object
        var profile = newProfileObject(uaPubkey)
        
        RequestUrlFromStore(DATASTORE_URL, {key:uaPubKey, data:profile}, function (err, profileUrl) {
            console.log("datastore url request successful! url= " + profileUrl);

            // Add url to blockchain
            blockstoreupdate(id, bcPrivKey, bcPubKey, profileUrl, function (err) {
                if (err) {
                  // TODO: reply to client
                  exitOnError(err);
                }
                console.log("blockchain update successful!");
  
                // Reply to the client with profile info
                response.statusCode = 200;
                response.write(querystring.stringify({profile: profile}));
                response.end();
    
            });    
        });

    });
}

app.get('/', function (request, response) {
	var method = request.body.method;
	console.log('method= ' + method)
	if (method == 'connectProfile') {
    connectProfile (request, response);
	}
	if (method == 'createProfile') {
    createProfile (request, response);
  }
});

console.log("start");
var server = app.listen(PROVIDER_PORT);
