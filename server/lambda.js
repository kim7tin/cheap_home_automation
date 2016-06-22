var http = require('http');

var httpServer = "reachme.me";
var httpPath = "/";
var httpPort = 2422;

exports.handler = function(event, context) {
	log('Input', event);
	switch (event.header.namespace) {
	case 'Alexa.ConnectedHome.Discovery':
		handleDiscovery(event, context);
		break;
	case 'Alexa.ConnectedHome.Control':
		handleControl(event, context);
		break;
	default:
		log('Err', 'No supported namespace: ' + event.header.namespace);
		context.fail('Something went wrong');
		break;
	}
};

function handleDiscovery(accessToken, context) {
	var headers = {
		namespace : 'Alexa.ConnectedHome.Discovery',
		name : 'DiscoverAppliancesResponse',
		payloadVersion : '2'
	};

	var appliances = [];

	var bedFan = {
		applianceId : "8f8d7eb6-b8ef-4d1d-b179-25f152dfc0fb",
		manufacturerName : 'HS2T',
		modelName : 'HFan',
		version : '1',
		friendlyName : 'Bed Fan',
		friendlyDescription : 'Fan in bed',
		isReachable : true,
		actions : [ "incrementPercentage", "decrementPercentage",
				"setPercentage", "turnOn", "turnOff" ],
		additionalApplianceDetails : {
			/**
			 * OPTIONAL: We can use this to persist any appliance specific
			 * metadata. This information will be returned back to the driver
			 * when user requests action on this appliance.
			 */
			gatewayUuid : "160e920e-43e0-40b9-a023-2da5d3f69763",
			deviceUuid : "8f8d7eb6-b8ef-4d1d-b179-25f152dfc0fb"
		}
	};

	appliances.push(bedFan);

	var payloads = {
		discoveredAppliances : appliances
	};
	var result = {
		header : headers,
		payload : payloads
	};

	log('Discovery', result);

	context.succeed(result);
}

function handleControl(event, context) {
	var options = {
		"hostname" : httpServer,
		"port" : httpPort,
		"path" : httpPath,
		method : 'POST',
		headers : {
			'Content-Type' : 'application/json',
		}
	};
	var req = http.request(options, function(res) {
		console.log('Status: ' + res.statusCode);
		console.log('Headers: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on('data', function(body) {
			console.log('Body: ' + body);
		});
	});
	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});
	req.write(JSON.stringify(event));
	req.end();
}

function log(title, msg) {
	console.log(title + ": " + msg);
}

function generateControlError(name, code, description) {
	var headers = {
		namespace : 'Control',
		name : name,
		payloadVersion : '1'
	};

	var payload = {
		exception : {
			code : code,
			description : description
		}
	};

	var result = {
		header : headers,
		payload : payload
	};

	return result;
}