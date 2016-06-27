var https = require("https");

var httpServer = "reachme.me";
var httpPort = 443;

var alexa = function() {
	this.headers = {};
	this.payloads = {};
	this.succeed = function() {
		this.context.succeed({
			"header" : this.headers,
			"payload" : this.payloads
		});
	}
}

var server = function(httpPath, dataSend, returnFunction) {
	var options = {
		"hostname" : httpServer,
		"port" : httpPort,
		"path" : httpPath,
		"method" : "POST",
		"headers" : {
			"Content-Type" : "application/json",
		}
	};

	var req = https.request(options, function(res) {
		console.log('Status: ' + res.statusCode);
		console.log('Headers: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on("data", function(body) {
			returnFunction(body);
		});
	});
	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});

	req.write(JSON.stringify(dataSend));
	req.end();
}

var echo = new alexa();

exports.handler = function(event, context) {
	echo.context = context;
	echo.headers.namespace = event.header.namespace;
	echo.headers.messageId = event.header.messageId;
	echo.headers.payloadVersion = 2;

	switch (event.header.namespace) {
	case "Alexa.ConnectedHome.Discovery":
		handleDiscovery(event, context);
		break;
	case "Alexa.ConnectedHome.Control":
		handleControl(event, context);
		break;
	default:
		log("Err", "No supported namespace: " + event.header.namespace);
		context.fail("Something went wrong");
		break;
	}
};

function handleDiscovery(event, context) {
	echo.headers.name = "DiscoverAppliancesResponse";
	var appliances = [];
	var bedFan = {
		applianceId : "8f8d7eb6-b8ef-4d1d-b179-25f152dfc0fb",
		manufacturerName : 'HS2T',
		modelName : 'HFan',
		version : '1',
		friendlyName : 'Bed Fan',
		friendlyDescription : 'Fan in bed',
		isReachable : true,
		actions : [ "turnOn", "turnOff" ],
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

	echo.payloads = {
		discoveredAppliances : appliances
	};

	echo.succeed();
}

function handleControl(event, context) {
	if (event.header.namespace == 'Alexa.ConnectedHome.Control') {
		var dataSend = {};
		dataSend.gatewayUuid = event.payload.appliance.additionalApplianceDetails.gatewayUuid;
		dataSend.deviceUuid = event.payload.appliance.additionalApplianceDetails.deviceUuid;

		switch (event.header.name) {
		case "TurnOnRequest":
			echo.headers.name = "TurnOnConfirmation";
			dataSend.data = 1;
			break;
		case "TurnOffRequest":
			echo.headers.name = "TurnOffConfirmation";
			dataSend.data = 0;
			break;
		default:
			break;
		}

		var hs2t = new server("/hs2t/", dataSend, function(data) {
			console.log(data);
			echo.succeed();
		});
	}
}