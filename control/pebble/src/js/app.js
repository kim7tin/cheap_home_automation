var UI = require("ui");
var devices = [];
var ws;
var device_menu;

const
type_of_device = {
	"off_on" : {
		"device_data" : [ "MANUAL-OFF", "MANUAL-ON" ],
		"device_actions" : [ {
			title : "MANUAL-OFF",
			"action_data" : "0"
		}, {
			title : "MANUAL-ON",
			"action_data" : "1"
		} ]
	},
	"off_on_auto" : {
		"device_data" : [ "MANUAL-OFF", "MANUAL-ON", "AUTO-OFF", "AUTO-ON" ],
		"device_actions" : [ {
			title : "MANUAL-OFF",
			"action_data" : "0"
		}, {
			title : "MANUAL-ON",
			"action_data" : "1"
		}, {
			title : "AUTO",
			"action_data" : "2"
		} ]
	}
},

icon_of_device = {
	"BULB" : "images/icons/bulb.png",
	"VENTILATION" : "images/icons/ventilation.png"
};

function start(websocketServerLocation) {
	ws = new WebSocket(websocketServerLocation);

	ws.onopen = function() {
		var data_send = {
			"command" : "COMMAND_GET_ALL_DEVICE"
		};
		ws.send(JSON.stringify(data_send));
	};

	ws.onmessage = function(evt) {
		console.log(evt.data);
		var data_receive = JSON.parse(evt.data);
		if (data_receive.command == 'ALL_DEVICE') {
			devices = [];
			data_receive.devices
					.forEach(function(e, i, a) {
						var device_title = e.device_name;
						var device_icon = icon_of_device[e.device_icon];
						var device_subtitle = type_of_device[e.device_type].device_data[e.device_data];
						var device_actions = type_of_device[e.device_type].device_actions;
						devices.push({
							title : device_title,
							icon : device_icon,
							subtitle : device_subtitle,
							actions : device_actions,
							device_id : e.device_id,
							device_relay : e.device_relay
						});
					});

			device_menu = new UI.Menu({
				sections : [ {
					title : 'Device List',
					items : devices
				} ]
			});
			device_menu.on('select', function(e) {
				device_sub_menu = new UI.Menu({
					sections : [ {
						title : 'Actions',
						items : e.item.actions
					} ]
				});

				device_sub_menu.on('select', function(se) {
					console.log(e.item.title + ' is ' + se.item.title);
					var data_send = {
						"command" : "COMMAND_SET_DATA",
						"device_data" : se.item.action_data,
						"device_id" : e.item.device_id,
						"device_relay" : e.item.device_relay
					};
					console.log(JSON.stringify(data_send));
					ws.send(JSON.stringify(data_send));
					device_sub_menu.hide();
				});

				device_sub_menu.show();
				// deviceMenu.hide();
			});
			device_menu.show();
		} else if (data_receive.command == 'COMMAND_UPDATE') {
			data_receive.devices
					.forEach(function(ed, id, ad) {
						devices
								.forEach(function(eds, ids, ads) {
									if (ed.device_relay == eds.device_relay
											&& ed.device_id == eds.device_id) {
										var device_title = ed.device_name;
										var device_icon = icon_of_device[ed.device_icon];
										var device_subtitle = type_of_device[ed.device_type].device_data[ed.device_data];
										var device_actions = type_of_device[ed.device_type].device_actions;
										device_menu.item(0, ids, {
											title : device_title,
											icon : device_icon,
											subtitle : device_subtitle,
											actions : device_actions,
											device_id : ed.device_id,
											device_relay : ed.device_relay
										});
									}
								});
					});
		} else {
			console.log(data_receive.command);
		}
	};

	ws.onclose = function() {
		// websocket is closed.
		console.log("Connection is closed");
		setTimeout(function() {
			start(websocketServerLocation);
		}, 1000);
	};
}

start("ws://192.168.7.7:1990");
