#include "ets_sys.h"
#include "osapi.h"
#include "gpio.h"
#include "os_type.h"
#include "ip_addr.h"
#include "espconn.h"
#include "user_interface.h"
#include "mem.h"
#include "os_type.h"
#include "json/jsonparse.h"
#include "WCuser_config.h"

esp_tcp dweet_tcp, gateway_tcp;
uint8 relay_macaddress[6];
struct espconn relay_connection;

static volatile os_timer_t retry_connect_timer, auto_light_timer;

struct ip_addr gateway_ip;

char json_data[256];
char buffer[2048];

char wc_bulb_data = 0;

LOCAL void gpio_intr_handler(void);

void connect_gateway(void);
void user_rf_pre_init(void) {
}
void get_json_value(char *sdata, char *key, char *value) {
	struct jsonparse_state *jdata = (struct jsonparse_state *) os_zalloc(
			sizeof(struct jsonparse_state));
	jsonparse_setup(jdata, sdata, os_strlen(sdata));
	while (jsonparse_next(jdata)) {
		if (jsonparse_strcmp_value(jdata, key) == 0) {
			jsonparse_next(jdata);
			jsonparse_next(jdata);
			jsonparse_copy_value(jdata, value, 32);
			os_free(jdata);
			break;
		}
	}
}
void update_data(void) {
	os_sprintf(buffer,
			"{\"command\":\"COMMAND_UPDATE\",\"relay_address\":\""MACSTR"\",\"devices\":[{\"device_id\":\"0\",\"device_data\":\"%d\",\"device_name\":\"WC bulb\",\"device_type\":\"off_on_auto\",\"device_icon\":\"BULB\",\"device_relay\":\""MACSTR"\"}]}\r\n",
			MAC2STR(relay_macaddress), wc_bulb_data, MAC2STR(relay_macaddress));
	espconn_sent(&relay_connection, buffer, os_strlen(buffer));
}
void data_received(void *arg, char *pdata, unsigned short len) {
	struct espconn *conn = arg;
	char command[16];
	get_json_value(pdata, "command", command);
	if (strcmp(command, "COMMAND_SET_DATA") == 0) {
		char device_id;
		get_json_value(pdata, "device_id", &device_id);
		if (strtol(&device_id, NULL, 10) == 0) {
			char device_data;
			get_json_value(pdata, "device_data", &device_data);
			wc_bulb_data = strtol(&device_data, NULL, 10);
			switch (wc_bulb_data) {
			case 0:
				gpio_output_set(0, BIT5, BIT5, 0);
				break;
			case 1:
				gpio_output_set(BIT5, 0, BIT5, 0);
				break;
			case 2:
				gpio_output_set(0, BIT5, BIT5, 0);
				break;
			default:
				break;
			}

			update_data();
		}
	} else {
		os_printf("%s: ==%s==\n", __FUNCTION__, command);
	}
	//espconn_disconnect(conn);
}

void tcp_connected(void *arg) {
	int temperature = 55;   // test data
	struct espconn *conn = arg;

	os_timer_disarm(&retry_connect_timer);

	os_printf("%s\n", __FUNCTION__);
	espconn_regist_recvcb(conn, data_received);
	os_sprintf(buffer,
			"{\"command\":\"COMMAND_IDENTIFY\",\"relay_address\":\""MACSTR"\",\"devices\":[{\"device_id\":\"0\",\"device_data\":\"%d\",\"device_name\":\"WC bulb\",\"device_type\":\"off_on_auto\",\"device_icon\":\"BULB\",\"device_relay\":\""MACSTR"\"}]}\r\n",
			MAC2STR(relay_macaddress), wc_bulb_data, MAC2STR(relay_macaddress));
	os_printf("Sending: %s\n", buffer);
	espconn_sent(conn, buffer, os_strlen(buffer));
}

void tcp_disconnected(void *arg) {
	os_printf("%s\n", __FUNCTION__);
	os_timer_arm(&retry_connect_timer, 1000, 1);
}

void connect_gateway(void) {
	relay_connection.type = ESPCONN_TCP;
	relay_connection.state = ESPCONN_NONE;
	relay_connection.proto.tcp = &gateway_tcp;
	relay_connection.proto.tcp->local_port = espconn_port();
	relay_connection.proto.tcp->remote_port = 2422;
	os_memcpy(relay_connection.proto.tcp->remote_ip, &gateway_ip, 4);
	espconn_regist_connectcb(&relay_connection, tcp_connected);
	espconn_regist_disconcb(&relay_connection, tcp_disconnected);
	espconn_connect(&relay_connection);
}
void auto_light(void) {
	char auto_mode = wc_bulb_data >> 1;
	if (auto_mode) {
		os_printf("%s\n", __FUNCTION__);
		gpio_output_set(0, BIT5, BIT5, 0);
		wc_bulb_data = 2;
		update_data();
	}
}

void wifi_callback(System_Event_t *evt) {
	os_printf("%s\n", __FUNCTION__);

	switch (evt->event) {
	case EVENT_STAMODE_CONNECTED:
		os_printf("connect to ssid %s, channel %d\n",
				evt->event_info.connected.ssid,
				evt->event_info.connected.channel);
		break;

	case EVENT_STAMODE_DISCONNECTED:
		os_printf("disconnect from ssid %s, reason %d\n",
				evt->event_info.disconnected.ssid,
				evt->event_info.disconnected.reason);
//		deep_sleep_set_option(0);
//		system_deep_sleep(60 * 1000 * 1000);  // 60 seconds
		break;

	case EVENT_STAMODE_GOT_IP:
		os_printf("ip:" IPSTR ",mask:" IPSTR ",gw:" IPSTR,
				IP2STR(&evt->event_info.got_ip.ip),
				IP2STR(&evt->event_info.got_ip.mask),
				IP2STR(&evt->event_info.got_ip.gw));
		os_printf("\n");
		gateway_ip = evt->event_info.got_ip.gw;
		os_timer_arm(&retry_connect_timer, 1000, 1);
		break;

	default:
		break;
	}
}

void user_init(void) {
	static struct station_config config;

	uart_div_modify(0, UART_CLK_FREQ / (115200));
	os_printf("%s\n", __FUNCTION__);

	wifi_station_set_hostname("relay");
	wifi_set_opmode_current( STATION_MODE);

	gpio_init();
	PIN_FUNC_SELECT(PERIPHS_IO_MUX_GPIO4_U, FUNC_GPIO4);
	PIN_FUNC_SELECT(PERIPHS_IO_MUX_GPIO5_U, FUNC_GPIO5);
	gpio_output_set(0, BIT5, BIT5, BIT4);

	ETS_GPIO_INTR_DISABLE();
	ETS_GPIO_INTR_ATTACH(gpio_intr_handler, NULL);
	gpio_register_set(GPIO_PIN_ADDR(4),
			GPIO_PIN_INT_TYPE_SET(GPIO_PIN_INTR_DISABLE) |
			GPIO_PIN_PAD_DRIVER_SET(GPIO_PAD_DRIVER_DISABLE) |
			GPIO_PIN_SOURCE_SET(GPIO_AS_PIN_SOURCE));
	GPIO_REG_WRITE(GPIO_STATUS_W1TC_ADDRESS, BIT(4));
	gpio_pin_intr_state_set(GPIO_ID_PIN(4), GPIO_PIN_INTR_POSEDGE);

	ETS_GPIO_INTR_ENABLE();

	os_timer_setfn(&retry_connect_timer, (os_timer_func_t *) connect_gateway,
	NULL);
	os_timer_setfn(&auto_light_timer, (os_timer_func_t *) auto_light, NULL);

	if (wifi_get_macaddr(STATION_IF, relay_macaddress)) {
//		os_printf("my_macaddress: " MACSTR, MAC2STR(relay_macaddress));
	}

	config.bssid_set = 0;
	os_memcpy(&config.ssid, SSID, 32);
	os_memcpy(&config.password, SSID_PASSWORD, 64);
	wifi_station_set_config(&config);

	wifi_set_event_handler_cb(wifi_callback);
}

LOCAL void gpio_intr_handler(void) {
	uint32 gpio_status = GPIO_REG_READ(GPIO_STATUS_ADDRESS);
	if (gpio_status & BIT(4)) {
		gpio_pin_intr_state_set(GPIO_ID_PIN(4), GPIO_PIN_INTR_DISABLE);
		GPIO_REG_WRITE(GPIO_STATUS_W1TC_ADDRESS, gpio_status & BIT(4));
		char auto_mode = wc_bulb_data >> 1;
		if (auto_mode) {
			gpio_output_set(BIT5, 0, BIT5, 0);
			wc_bulb_data = 3;
			update_data();
			os_timer_disarm(&auto_light_timer);
			os_timer_arm(&auto_light_timer, 5000, 0);
		}
		gpio_pin_intr_state_set(GPIO_ID_PIN(4), GPIO_PIN_INTR_POSEDGE);
	}
}
