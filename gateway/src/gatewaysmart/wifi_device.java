/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package gatewaysmart;

import java.util.HashMap;
import java.util.Map;

/**
 *
 * @author hs2t
 */
public class wifi_device {

    public String device_id;
    public String device_data;
    public String device_name;
    public String device_type;
    public String device_icon;
    public String device_relay;
    
    //alexa smarthome options
    
    public String applianceId, manufacturerName, modelName, version, friendlyName, friendlyDescription;
    public Boolean isReachable;
    public String[] actions;
    public Map additionalApplianceDetails = new HashMap();

    public wifi_device(String device_id, String device_name, String device_type, String device_data, String device_icon, String device_relay) {
        this.device_id = device_id;
        this.device_name = device_name;
        this.device_type = device_type;
        this.device_data = device_data;
        this.device_icon = device_icon;
        this.device_relay = device_relay;
    }
}
