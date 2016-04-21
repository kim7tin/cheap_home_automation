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
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author hs2t
 */
public class wifi_client {

    public String mac_address;
    public Socket sock;
    public BufferedReader in;
    public BufferedWriter out;
    public Map<String, wifi_device> devices = new HashMap<>();

    public wifi_client(Socket sock) {
        this.sock = sock;
        try {
            this.in = new BufferedReader(
                    new InputStreamReader(this.sock.getInputStream()));
            this.out = new BufferedWriter(
                    new OutputStreamWriter(this.sock.getOutputStream()));
        } catch (IOException ex) {
            Logger.getLogger(handler_client.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
}
