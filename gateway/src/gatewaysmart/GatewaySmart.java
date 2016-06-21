/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package gatewaysmart;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.java_websocket.WebSocket;
import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.handshake.ServerHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;

/**
 *
 * @author hs2t
 */
public class GatewaySmart {

    /**
     * @param args the command line arguments
     */
    public static Map<String, wifi_client> clients = new HashMap<>();
    public static WebSocketServer server;
    public static WebSocketClient websocket_client;

    public static void main(String[] args) throws UnknownHostException {
        new Thread(new socket_thread()).start();
        new Thread(new websocket_client_thread("ws://192.168.7.6:2422")).start();
//        server = new websocket_thread(1990);
//        server.run();
    }

    public static void sendToAll(String text) {
        Collection<WebSocket> con = server.connections();
        synchronized (con) {
            for (WebSocket c : con) {
                c.send(text);
            }
        }
    }
    
    public static class websocket_client_thread extends Thread{
        public websocket_client_thread(String uri){
            try {
            websocket_client = new WebSocketClient(new URI(uri)) {
                @Override
                public void onOpen(ServerHandshake sh) {
                    System.out.println("onOpen");
                }

                @Override
                public void onMessage(String string) {
                    System.out.println("onMessage");
                }

                @Override
                public void onClose(int i, String string, boolean bln) {
                    System.out.println("onClose");
                }

                @Override
                public void onError(Exception excptn) {
                    System.err.println(excptn);
                }
            };
        } catch (URISyntaxException ex) {
            Logger.getLogger(GatewaySmart.class.getName()).log(Level.SEVERE, null, ex);
        }
        }
        @Override
        public void run(){
            websocket_client.connect();
        }
    }

    public static class socket_thread extends Thread {

        @Override
        public void run() {
            try {
                ServerSocket server = new ServerSocket(2422);
                while (true) {
                    Socket sock = server.accept();
                    new Thread(new handler_client(sock)).start();
                }
            } catch (IOException ex) {
                Logger.getLogger(GatewaySmart.class.getName()).log(Level.SEVERE, null, ex);
            }
        }

    }

    public static class websocket_thread extends WebSocketServer {

        public websocket_thread(int port) throws UnknownHostException {
            super(new InetSocketAddress(port));
        }

        @Override
        public void onOpen(WebSocket conn, ClientHandshake handshake) {
            System.out.println("new connection to " + conn.getRemoteSocketAddress());
        }

        @Override
        public void onClose(WebSocket conn, int code, String reason, boolean remote) {
            System.out.println("closed " + conn.getRemoteSocketAddress() + " with exit code " + code + " additional info: " + reason);
        }

        @Override
        public void onMessage(WebSocket conn, String message) {
            System.out.println("received message from " + conn.getRemoteSocketAddress() + ": " + message);
            try {
                JSONObject data_receive = (JSONObject) new JSONParser().parse(message);
                if (data_receive.get("command").equals("COMMAND_GET_ALL_DEVICE")) {
                    JSONObject data_send = new JSONObject();
                    data_send.put("command", "ALL_DEVICE");
                    JSONArray device_list_send = new JSONArray();
                    for (Map.Entry<String, wifi_client> client : clients.entrySet()) {
                        for (Map.Entry<String, wifi_device> device : client.getValue().devices.entrySet()) {
                            JSONObject device_send = new JSONObject();
                            device_send.put("device_name", device.getValue().device_name);
                            device_send.put("device_id", device.getValue().device_id);
                            device_send.put("device_type", device.getValue().device_type);
                            device_send.put("device_data", device.getValue().device_data);
                            device_send.put("device_icon", device.getValue().device_icon);
                            device_send.put("device_relay", device.getValue().device_relay);
                            device_list_send.add(device_send);
                        }
                    }
                    data_send.put("devices", device_list_send);
                    System.out.println(data_send.toJSONString());
                    conn.send(data_send.toJSONString());
                } else if (data_receive.get("command").equals("COMMAND_SET_DATA")) {
                    wifi_client client = clients.get(data_receive.get("device_relay"));
                    JSONObject data_send = new JSONObject();
                    data_send.put("command", "COMMAND_SET_DATA");
                    data_send.put("device_id", data_receive.get("device_id"));
                    data_send.put("device_data", data_receive.get("device_data"));
                    System.out.println(data_send.toJSONString());
                    client.out.write(data_send.toJSONString());
                    client.out.flush();
                } else {
                    System.out.println("No command");
                }
            } catch (ParseException ex) {
                Logger.getLogger(GatewaySmart.class.getName()).log(Level.SEVERE, null, ex);
            } catch (IOException ex) {
                Logger.getLogger(GatewaySmart.class.getName()).log(Level.SEVERE, null, ex);
            }
        }

        @Override
        public void onError(WebSocket conn, Exception ex) {
            System.err.println("an error occured on connection " + conn.getRemoteSocketAddress() + ":" + ex);
        }
    }

}
