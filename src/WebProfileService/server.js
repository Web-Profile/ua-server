var http = require('http');
var port = process.env.port || 1337;
//http.createServer(function (req, res) {
//    res.writeHead(200, { 'Content-Type': 'text/plain' });
//    res.end('Hello World\n');
//}).listen(port);


//const PROVIDER_PORT = 80;
const PROVIDER_URL = "http://www.firstuaserver.com";
const DATASTORE_URL = "http://www.firstprofilestore.com";

//var http = require('http');
var express = require('express');
var crypto = require('crypto');
var querystring = require('querystring');
var bodyParser = require('body-parser');
//var execSync = require('child_process').execSync;

var appid = "82af8b0b4e3113a777bf3c3c6f8a372e";
var appsecret = "779b8b5bb1b0103b8a25f3dfe77d47e78bbcc0c64c89e159d061bfcfe042d744";

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

function blockstoreOneNameRequest(body, onResult) {
    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        
        var output = '';
        res.on('data', function (chunk) {
            output += chunk;
        });
        
        res.on('end', function () {
            
            if (res.statusCode = 200) return onResult(null, JSON.parse(output));
            else return onResult(res.statusCode);
        });
    });

    req.on('error', function (err) { });

    req.write(JSON.stringify(body));
    req.end();
}

function blockstorelookup(id, callback) {
    if (id === "satya") { return callback(null, "http://wp-dss.azurewebsites.net/api/Profile/e74f603b70c1470f9661b98a01816af8"); }
    
    var body =
 {

    };
    blockstoreOneNameRequest(body, function (err, obj) {
        if (err) { return callback(err) }
        
        var url = obj[id].profile.webprofile;
        return callback(null, url);
    });
}

function blockstorereserve(id, addr, profile, callback) {
    var body =
 {
        "passname": id,
        "recipient_address": addr,
        "passcard": { "Webprofile": profile }
    };
    blockstoreOneNameRequest(body, function (err, obj) {
        if (err) { return callback(err) }
        return callback(body.status, null)
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
        agents: [{ UA_pub: uaPubkey }]
    }
}

function getRequestOptions(method, url) {
    return {
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
        var text = '';
        response.on('data', function (chunk) { text += chunk });
        
        res.on('end', function () {
            // return as string since we don't always need it parsed
            callback(null, '{' + text + '}');
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
        var text = '';
        response.on('data', function (chunk) { text += chunk });
        
        res.on('end', function () {
            callback(null, querystring.parse(text).location);
        });
    });
    req.on('error', exitOnError);
    
    req.write(querystring.stringify(requestObj));
    req.end();
}

function connectProfile(request, response) {
    console.log("connectProfile");
    // Check parameters
    var id = request.body.id;
    console.log('id= ' + id);
    
    // Save connection data
    var socket = request.connection;
    var ipAddr = socket.remoteAddress;
    var port = socket.remotePort;
    
    // Lookup profile on the blockstore
    blockstorelookup(id, function (err, profileUrl) {
        if (err) { exitOnError(err) }
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
            response.write(querystring.stringify({ id: id, provider: PROVIDER_URL, profile: profile }))
            response.end();
        });
    });
}

function createProfile(request, response) {
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
        
        RequestUrlFromStore(DATASTORE_URL, { key: uaPubKey, data: profile }, function (err, profileUrl) {
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
                response.write(querystring.stringify({ profile: profile }));
                response.end();

            });
        });

    });
}


app.get('/', function (request, response) {
    
    var success = { status: "sucess" };
    var command = request.body.command;
    console.log('GET - method = ' + command);
    
    if (command == 'connectProfile') {
        connectProfile(request, response);
    }
    
    response.end(JSON.stringify(success));
});
app.post('/', function (request, response) {
    var method = request.body.method;
    console.log('POST - method= ' + method);
    if (method == 'createProfile') {
        createProfile(request, response);
    }
    response.end();
});

//var server = app.listen(PROVIDER_PORT);
var server = app.listen(port, function () {
    
    var host = server.address().address;
    var port = server.address().port;
    
    console.log("WebProfile service listening at http://%s:%s", host, port);

});