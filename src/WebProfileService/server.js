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
var bodyParser = require('body-parser');
//var execSync = require('child_process').execSync;

var appid = "82af8b0b4e3113a777bf3c3c6f8a372e";
var appsecret = "779b8b5bb1b0103b8a25f3dfe77d47e78bbcc0c64c89e159d061bfcfe042d744";

//////////////////////////
// BLOCKSTORE FUNCTIONS //
//////////////////////////
var options =
  {
    hostname: "api.onename.com",
    port: 80,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

function blockstoreOneNameRequest(body, callback) {
    console.log("blockstoreOneNameRequest: body= " + JSON.stringify(body));
    var req = http.request(options, function (res) {
        res.setEncoding('utf8');
        
        var output = '';
        res.on('data', function (chunk) {
            output += chunk;
        });
        
        res.on('end', function () {            
            console.log("blockstoreOneNameRequest: output= " + output);

            // Expected format: {"status": "success"}
            if (res.statusCode = 200) return callback(null, JSON.parse(output));
            else return callback(res.statusCode);
        });
    });

    req.on('error', function (err) { });
    // Add userid
    
    req.write(JSON.stringify(body));
    req.end();
}

function blockstorelookup(id, callback) {
    console.log("blockstorelookup: id= " + id);
    if (id === "satya") { return callback(null, "http://wp-dss.azurewebsites.net/api/Profile/e74f603b70c1470f9661b98a01816af8"); }

    
    blockstoreOneNameRequest(id, function (err, obj) {
        console.log("blockstorelookup: obj= " + JSON.stringify(obj));
        if (err) { return callback(err) }
        
        var url = obj[id].profile.webprofile;
        return callback(null, url);
    });
}

function blockstorereserve(id, addr, profile, callback) {
    var body
    body.passname = id;
    body.recipient_address = addr;
    body.passcard.webprofile = profile;

    //Expected format: {"passname": id,"recipient_address": addr,"passcard": { "Webprofile": profile }}
    console.log("blockstorereserve: body= " + JSON.parse(body));

    blockstoreOneNameRequest(body, function (err, obj) {
        //Expected format: {"status": success}
        console.log("blockstorereserve: obj= " + JSON.parse(obj));
        if (err) { return callback(err) }
        return callback(obj.status, null)
    });
}

function newProfileObject(uaPubKey) {
    return {
        agents: [{ UA_pub: uaPubkey }]
    }
}


/////////////////////////
// DATASTORE FUNCTIONS //
/////////////////////////
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
    console.log("GetProfile: " + profileUrl);
    var req = http.request(getRequestOptions('GET', profileUrl), function (res) {
        if (res.statusCode == 404) {
            console.log("GetProfile: 404'd");
            return callback(404);
        }
        
        res.setEncoding('utf8');
        var text = '';
        response.on('data', function (chunk) { text += chunk });
        console.log("GetProfile: text= " + text);

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
        console.log("GetProfile: text= " + text);
        
        res.on('end', function () {
            callback(null, JSON.parse(text).location);
        });
    });
    req.on('error', exitOnError);
    
    req.write(JSON.stringify(requestObj));
    req.end();
}

///////////////////////////
// MAIN SERVER FUNCTIONS //
///////////////////////////
function exitOnError(err) {
    console.error(err);
    process.exit(-1);
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
    
    // Lookup profile on onename blockstore
    blockstorelookup(id, function (err, profileUrl) {
        console.log("connectProfile: profileUrl= " + profileUrl);
        if (err) { exitOnError(err) }
        if (!profileUrl) {
            // Reply to client that the id could not be resolved
            // This expected for new users and is not an application error 
            console.log("connectProfile: no profile found);
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
            var body
            body.id = id;
            body.provider = PROVIDER_URL;
            body.profile = profile;
            response.write(JSON.stringify(body));
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
    blockstorereserve(id, addr, profile, function (err, reply) {
        if (err) {
            // TODO: reply to client
            exitOnError(err)
        }
        if (JSON.parse(reply).status != "success") {
            // TODO: reply to client that the id was taken
            return;
        }

        console.log("createProfile: blockstore reservation successful!");
        
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
                
                var body
                body.profile = profile;

                // Reply to the client with profile info
                response.statusCode = 200;
                response.write(JSON.stringify(body));
                response.end();

            });
        });

    });
}

var app = express();
app.use(bodyParser.json());

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

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
    var success = { status: "sucess" };
    var command = request.body.command;
    console.log('GET - method = ' + command);
    
    if (command == 'connectProfile') {
        connectProfile(request, response);
    }
    if (command == 'createProfile') {
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