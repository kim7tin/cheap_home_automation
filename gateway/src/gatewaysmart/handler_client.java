/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package gatewaysmart;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Socket;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

/**
 *
 * @author hs2t
 */
public class handler_client implements Runnable {

    wifi_client client;

    private static final int COMMAND_OK = 0;
    private static final int COMMAND_IDENTIFY = 1;
    private static final int COMMAND_GET = 2;
    private static final int COMMAND_SET = 3;
    private static final int COMMAND_RETURN = 4;
    private static final int COMMAND_UPDATE = 5;

    public handler_client(Socket sock) {
        client = new wifi_client(sock);
    }

    @Override
    public void run() {
        System.out.println("Connected");
        try {
            String inputLine;
            while ((inputLine = client.in.readLine()) != null) {
                System.out.println(inputLine);
                try {
                    JSONObject data_receive = (JSONObject) new JSONParser().parse(inputLine);
                    if (data_receive.get("command").equals("COMMAND_IDENTIFY")) {
                        client.mac_address = (String) data_receive.get("relay_address");
                        JSONArray devices = (JSONArray) data_receive.get("devices");
                        for (int i = 0; i < devices.size(); i++) {
                            JSONObject device_json = (JSONObject) devices.get(i);
                            wifi_device device = new wifi_device((String) device_json.get("device_id"), (String) device_json.get("device_name"), (String) device_json.get("device_type"), (String) device_json.get("device_data"), (String) device_json.get("device_icon"), (String) device_json.get("device_relay"));
                            client.devices.put(device.device_id, device);
                        }
                        GatewaySmart.clients.put(client.mac_address, client);
                    } else if (data_receive.get("command").equals("COMMAND_UPDATE")) {
                        JSONArray devices = (JSONArray) data_receive.get("devices");
                        for (int i = 0; i < devices.size(); i++) {
                            JSONObject device_json = (JSONObject) devices.get(i);
                            GatewaySmart.clients.get(device_json.get("device_relay")).devices.get(device_json.get("device_id")).device_data = (String) device_json.get("device_data");
                        }
                        GatewaySmart.sendToAll(inputLine);
                    } else {
                        System.out.println("No command");
                    }
                } catch (ParseException ex) {
                    Logger.getLogger(GatewaySmart.class.getName()).log(Level.SEVERE, null, ex);
                }
            }
        } catch (IOException ex) {
            Logger.getLogger(handler_client.class.getName()).log(Level.SEVERE, null, ex);
        }
        GatewaySmart.clients.remove(client.mac_address);
        System.out.println("Disconnected");
    }

}
