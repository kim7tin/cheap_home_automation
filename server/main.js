var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {
	console.log((new Date()) + ' Received request for ' + request.url);
	var body = "";
	request.on('data', function(data) {
		body += data;
		console.log("Partial body: " + body);
	});
	request.on('end', function() {
		console.log("Body: " + body);
	});
	response.writeHead(404);
	response.end("Hello");
});
server.listen(2422, function() {
	console.log((new Date()) + ' Server is listening on port 2422');
});

wsServer = new WebSocketServer({
	httpServer : server,
	// You should not use autoAcceptConnections for production
	// applications, as it defeats all standard cross-origin protection
	// facilities built into the protocol and the browser. You should
	// *always* verify the connection's origin and decide whether or not
	// to accept it.
	autoAcceptConnections : false
});

function originIsAllowed(origin) {
	// put logic here to detect whether the specified origin is allowed.
	return true;
}

wsServer.on('request', function(request) {
	if (!originIsAllowed(request.origin)) {
		// Make sure we only accept requests from an allowed origin
		request.reject();
		console.log((new Date()) + ' Connection from origin ' + request.origin
				+ ' rejected.');
		return;
	}

	var connection = request.accept(null, request.origin);
	console.log((new Date()) + ' Connection accepted.');
	connection.on('message', function(message) {
		if (message.type === 'utf8') {
			console.log('Received Message: ' + message.utf8Data);
			connection.sendUTF(message.utf8Data);
		} else if (message.type === 'binary') {
			console.log('Received Binary Message of '
					+ message.binaryData.length + ' bytes');
			connection.sendBytes(message.binaryData);
		}
	});
	connection.on('close', function(reasonCode, description) {
		console.log((new Date()) + ' Peer ' + connection.remoteAddress
				+ ' disconnected.');
	});
});