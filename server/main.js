var WebSocketServer = require('websocket').server;
var http = require('http');
var mysql = require('mysql');
var async = require("async");

var mysql_connection = mysql.createPool({
	host : 'localhost',
	user : 's',
	password : 'CCBSdGbq8AuFeQhd',
	database : 's'
});
var sh_gateway = [];
var sh_controler = [];
var mf = {};

var server = http.createServer(function(request, response) {
	// process HTTP request. Since we're writing just WebSockets server
	// we don't have to implement anything.
});
server.listen(2422, function() {
});

// create the server
wsServer = new WebSocketServer({
	httpServer : server
});

// WebSocket server
wsServer.on('request', function(request) {
	var connection = request.accept(null, request.origin);
	var index = connection.socket._handle.fd;
	console.log(index);
	connection.on('message', function(message) {
		if (message.type === 'utf8') {
			var JSONdata = JSON.parse(message.utf8Data);

			if (JSONdata.command in mf
					&& typeof mf[JSONdata.command] == "function") {
				mf[JSONdata.command](connection, JSONdata);
			} else {
				console.log("this isn't a function");
				console.log(message.utf8Data);
			}
		}
	});

	connection.on('close', function(con) {
		sh_controler[index] = false;
		sh_gateway[index] = false;
		console.log("Close " + index);
	});
});

// ----- on message function
mf.register_device = function(connection, data) {
	var index = connection.socket._handle.fd;
	switch (data.device_type) {
	case 1:
		console.log("GateWay: " + data.gateway_macaddress);
		sh_gateway[index] = connection;
		sh_gateway[index]["gateway_macaddress"] = data.gateway_macaddress;
		break;
	case 2:
		console.log("Controler: " + connection.remoteAddresses[0]);
		sh_controler[index] = connection;
		var data_return = {
			command : "update_sections",
			sections : []
		};
		async.map([ 0 ], get_tree, function(err, tree) {
			data_return.sections = tree[0];
			// console.log(JSON.stringify(data_return));
			connection.sendUTF(JSON.stringify(data_return));
		});
		break;
	default:
		break;
	}

}

function get_tree(resultItem, callback) {
	mysql_connection.query('SELECT * from sh_room',
			function(err, rows, fields) {
				async.map(rows, get_rooms, function(err, rooms) {
					callback(null, rooms);
				});

			});
}

function get_rooms(resultItem, callback) {
	var section = {
		title : resultItem.room_name,
		items : []
	};
	mysql_connection.query("SELECT * from sh_device WHERE device_room = "
			+ resultItem.room_id, function(err, rows, fields) {
		async.map(rows, get_devices, function(err, devices) {
			section.items = devices;
			callback(null, section);
		});
	});
}

function get_devices(resultItem, callback) {
	var item = {
		title : resultItem.device_name,
		subtitle : display_status(resultItem.device_data,
				resultItem.device_type),
		device_address : resultItem.device_address,
		device_relay : resultItem.device_relay,
		device_gateway : resultItem.device_gateway,
		device_type : resultItem.device_type,
	};

	callback(null, item);
}

function display_status(device_data, device_type) {
	var return_string = device_data.toString();
	switch (device_type) {
	case 1:
		if (device_data == 0) {
			return_string = "OFF";
		} else {
			return_string = "ON";
		}
		break;
	case 2:
		if (device_data == 0) {
			return_string = "OFF";
		} else if (device_data == 1) {
			return_string = "ON";
		} else {
			return_string = "AUTO";
		}
		break;

	default:
		break;
	}

	return return_string;
}

mf.change_state = function(connection, data) {
	for (var i = 0; i < sh_gateway.length; i++) {
		if (sh_gateway[i]
				&& sh_gateway[i]["gateway_macaddress"] == data.device_gateway) {
			sh_gateway[i].sendUTF(JSON.stringify(data));
		}
	}
};

mf.control = function(connection, data) {
	for (var i = 0; i < sh_gateway.length; i++) {
		if (sh_gateway[i]
				&& sh_gateway[i]["gateway_macaddress"] == data.device_gateway) {
			sh_gateway[i].sendUTF(JSON.stringify(data));
		}
	}
};

mf.notify_change = function(connection, data) {
	console.log(data);
	mysql_connection.query("UPDATE sh_device SET device_data="
			+ data.device_data + " WHERE device_gateway = '"
			+ data.device_gateway + "' AND device_relay = '"
			+ data.device_relay + "' AND device_address = '"
			+ data.device_address + "'");

	data.device_data = display_status(data.device_data, data.device_type);

	for (var i = 0; i < sh_controler.length; i++) {
		if (sh_controler[i]) {
			sh_controler[i].sendUTF(JSON.stringify(data));
		}
	}
};

mf.get_all_rooms = function(connection, data) {
	mysql_connection.query('SELECT * from sh_room',
			function(err, rows, fields) {
				if (!err)
					connection
							.sendUTF("{\"command\": \"all_rooms\", \"rooms\": "
									+ JSON.stringify(rows) + "}");
				else
					console.log('Error while performing Query.');
			});
};

mf.get_all_devices_in_room = function(connection, data) {
	mysql_connection
			.query(
					"SELECT * from sh_device JOIN sh_relay ON sh_relay.relay_id=sh_device.device_relay WHERE device_room = "
							+ data.room_id,
					function(err, rows, fields) {
						if (!err)
							connection
									.sendUTF("{\"command\": \"all_devices_in_room\", \"devices\": "
											+ JSON.stringify(rows) + "}");
						else
							console.log('Error while performing Query.');
					});
};

mf.get_all_devices_in_gateway = function(connection, data) {
	mysql_connection
			.query(
					"SELECT * from sh_device JOIN sh_relay ON sh_relay.relay_id=sh_device.device_relay WHERE device_gateway  = "
							+ data.gateway_id,
					function(err, rows, fields) {
						if (!err)
							connection
									.sendUTF("{\"command\": \"all_devices_in_gateway\", \"devices\": "
											+ JSON.stringify(rows) + "}");
						else
							console.log('Error while performing Query.');
					});
};