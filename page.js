const MQTT_BROKERS = [
    { url: "wss://broker.emqx.io:8084/mqtt", name: "EMQX" },
    { url: "wss://test.mosquitto.org:8081/mqtt", name: "Mosquitto" } // Fallback broker
];
const DEVICE_PREFIX = "ESP32-IoT";
const LAMPU_TOPIC = `${DEVICE_PREFIX}/lampu`;
const KIPAS_TOPIC = `${DEVICE_PREFIX}/kipas`;
const SERVO_TOPIC = `${DEVICE_PREFIX}/servo/status`;
const SUHU_TOPIC = `${DEVICE_PREFIX}/suhu`;
const KELEMBAPAN_TOPIC = `${DEVICE_PREFIX}/kelembapan`;
const JARAK_TOPIC = `${DEVICE_PREFIX}/jarak`;

let client = null;
let messageCount = 0;
let connectionStartTime = null;
let autoScroll = true;
let lastLampuCommandTime = 0;
let lastKipasCommandTime = 0;
let lastServoCommandTime = 0;
let currentBrokerIndex = 0;
let reconnectAttempts = 0;
const commandMinInterval = 2000; // 2s debounce for commands
const maxReconnectAttempts = 5;

// Previous sensor values for trend calculation
let previousValues = {
    temperature: null,
    humidity: null,
    distance: null
};

// Gauge objects
let tempGauge;
let humGauge;

// DOM Elements
const statusElement = document.getElementById("connectionStatus");
const messageLog = document.getElementById("messageLog");
const messageCountElement = document.getElementById("messageCount");
const connectionTimeElement = document.getElementById("connectionTime");
const clientIdElement = document.getElementById("clientId");
const lastUpdateElement = document.getElementById('lastUpdate');

// Generate unique client ID
const clientId = `webClient-${Math.random().toString(16).substr(2, 8)}`;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log("ESP32 MQTT Dashboard initialized");
        
    if (clientIdElement) {
        clientIdElement.value = clientId;
    }
        
    connectToMQTT();
    addLogMessage("System", `Initializing MQTT connection to ${MQTT_BROKERS[currentBrokerIndex].name}...`);
        
    // Update connection time every second
    setInterval(updateConnectionTime, 1000);
        
    // Add tooltips to buttons
    addButtonTooltips();

    // Initialize gauges
    tempGauge = new RadialGauge({
        renderTo: 'tempGauge',
        width: 200,
        height: 200,
        units: '°C',
        minValue: 0,
        maxValue: 50,
        majorTicks: ['0', '10', '20', '30', '40', '50'],
        minorTicks: 2,
        strokeTicks: true,
        highlights: [{ from: 30, to: 50, color: 'rgba(200, 50, 50, .75)' }],
        colorPlate: '#fff',
        borderShadowWidth: 0,
        borders: false,
        needleType: 'arrow',
        needleWidth: 2,
        needleCircleSize: 7,
        needleCircleOuter: true,
        needleCircleInner: false,
        animationDuration: 1500,
        animationRule: 'linear',
        valueBox: true,
        valueInt: 1,
        valueDec: 1,
        fontValue: 'Arial',
        fontValueSize: 24,
        fontValueWeight: 'bold',
        colorValueBoxBackground: '#eee',
        colorValueBoxShadow: 'rgba(0, 0, 0, 0.1)',
        colorValueBoxBorder: '#ccc',
        colorValueText: '#333',
        colorNeedle: 'rgba(200, 50, 50, .75)',
        colorNeedleEnd: 'rgba(200, 50, 50, .75)',
        colorMajorTicks: '#666',
        colorMinorTicks: '#999',
        colorNumbers: '#333',
        colorTitle: '#333',
        colorUnits: '#333',
        colorBarProgress: 'rgba(102, 126, 234, 0.7)',
        colorBar: 'rgba(200, 200, 200, 0.5)',
        value: 0
    }).draw();

    humGauge = new RadialGauge({
        renderTo: 'humGauge',
        width: 200,
        height: 200,
        units: '%',
        minValue: 0,
        maxValue: 100,
        majorTicks: ['0', '20', '40', '60', '80', '100'],
        minorTicks: 2,
        strokeTicks: true,
        highlights: [{ from: 70, to: 100, color: 'rgba(50, 50, 200, .75)' }],
        colorPlate: '#fff',
        borderShadowWidth: 0,
        borders: false,
        needleType: 'arrow',
        needleWidth: 2,
        needleCircleSize: 7,
        needleCircleOuter: true,
        needleCircleInner: false,
        animationDuration: 1500,
        animationRule: 'linear',
        valueBox: true,
        valueInt: 1,
        valueDec: 1,
        fontValue: 'Arial',
        fontValueSize: 24,
        fontValueWeight: 'bold',
        colorValueBoxBackground: '#eee',
        colorValueBoxShadow: 'rgba(0, 0, 0, 0.1)',
        colorValueBoxBorder: '#ccc',
        colorValueText: '#333',
        colorNeedle: 'rgba(50, 50, 200, .75)',
        colorNeedleEnd: 'rgba(50, 50, 200, .75)',
        colorMajorTicks: '#666',
        colorMinorTicks: '#999',
        colorNumbers: '#333',
        colorTitle: '#333',
        colorUnits: '#333',
        colorBarProgress: 'rgba(102, 126, 234, 0.7)',
        colorBar: 'rgba(200, 200, 200, 0.5)',
        value: 0
    }).draw();
});

// Add tooltips to control buttons
function addButtonTooltips() {
    const buttons = [
        { id: "lampuOn", tooltip: "Turn Lampu ON (Ctrl+1)" },
        { id: "lampuOff", tooltip: "Turn Lampu OFF (Ctrl+2)" },
        { id: "kipasOn", tooltip: "Turn Kipas ON (Ctrl+3)" },
        { id: "kipasOff", tooltip: "Turn Kipas OFF (Ctrl+4)" }
    ];
        
    buttons.forEach(btn => {
        const element = document.getElementById(btn.id);
        if (element) {
            element.title = btn.tooltip;
        } else {
            console.warn(`Button ${btn.id} not found in DOM`);
        }
    });
}

// Connect to MQTT Broker
function connectToMQTT() {
    try {
        updateConnectionStatus("connecting");
        const currentBroker = MQTT_BROKERS[currentBrokerIndex];
        addLogMessage("System", `Connecting to ${currentBroker.name} at ${currentBroker.url}...`);
                
        client = mqtt.connect(currentBroker.url, {
            clientId: clientId,
            clean: true,
            connectTimeout: 10000, // Increased timeout
            reconnectPeriod: 0, // Disable auto-reconnect (handled manually)
            keepalive: 60,
        });

        client.on("connect", () => {
            console.log(`Connected to ${currentBroker.name} at:`, new Date().toLocaleTimeString());
            connectionStartTime = new Date();
            reconnectAttempts = 0; // Reset attempts
            updateConnectionStatus("connected");
            addLogMessage("MQTT", `Connected successfully to ${currentBroker.name}!`);
                        
            // Subscribe to all sensor topics
            subscribeToTopics();
                        
            // Clear retained messages
            clearRetainedMessages();
        });

        client.on("error", (err) => {
            console.error("Connection error:", err);
            updateConnectionStatus("error");
            addLogMessage("Error", `Connection failed to ${currentBroker.name}: ${err.message}`);
            tryNextBroker();
        });

        client.on("reconnect", () => {
            console.log("Reconnecting...");
            updateConnectionStatus("connecting");
            addLogMessage("MQTT", `Attempting to reconnect to ${currentBroker.name}...`);
        });

        client.on("offline", () => {
            console.log("Client offline");
            updateConnectionStatus("error");
            addLogMessage("MQTT", `Connection lost to ${currentBroker.name} - client offline`);
            tryNextBroker();
        });

        client.on("message", (topic, message) => {
            handleMQTTMessage(topic, message.toString());
        });
    } catch (error) {
        console.error("Failed to connect:", error);
        updateConnectionStatus("error");
        addLogMessage("Error", `Failed to initialize: ${error.message}`);
        tryNextBroker();
    }
}

// Try next broker in the list
function tryNextBroker() {
    reconnectAttempts++;
    if (reconnectAttempts >= maxReconnectAttempts) {
        currentBrokerIndex = (currentBrokerIndex + 1) % MQTT_BROKERS.length;
        reconnectAttempts = 0;
        addLogMessage("System", `Switching to broker: ${MQTT_BROKERS[currentBrokerIndex].name}`);
    }
    reconnectMQTT();
}

// Clear retained messages for all topics
function clearRetainedMessages() {
    const topics = [LAMPU_TOPIC, KIPAS_TOPIC, SERVO_TOPIC];
    topics.forEach(topic => {
        client.publish(topic, '', { qos: 1, retain: true }, (err) => {
            if (!err) {
                addLogMessage("System", `Cleared retained message for ${topic}`);
            } else {
                addLogMessage("Error", `Failed to clear retained message for ${topic}: ${err.message}`);
            }
        });
    });
}

// Subscribe to all necessary topics
function subscribeToTopics() {
    const topics = [SUHU_TOPIC, KELEMBAPAN_TOPIC, JARAK_TOPIC, KIPAS_TOPIC, LAMPU_TOPIC, SERVO_TOPIC];
    topics.forEach(topic => {
        client.subscribe(topic, { qos: 1 }, (err) => {
            if (!err) {
                console.log(`Subscribed to ${topic}`);
                addLogMessage("MQTT", `Subscribed to: ${topic}`);
            } else {
                console.error(`Subscription error for ${topic}:`, err);
                addLogMessage("Error", `Subscription failed for ${topic}: ${err.message}`);
            }
        });
    });
}

// Handle incoming MQTT messages
function handleMQTTMessage(topic, message) {
    console.log("Received message:", message, "on topic:", topic);
    messageCount++;
    updateMessageCount();
        
    addLogMessage("Received", `${topic}: ${message}`);
        
    // Update UI based on message type
    if (topic === SUHU_TOPIC) {
        const value = parseFloat(message);
        if (!isNaN(value) && value > 0) {
            updateSensorData('temperature', value);
        } else {
            addLogMessage("Warning", `Invalid temperature value: ${message}`);
        }
    } else if (topic === KELEMBAPAN_TOPIC) {
        const value = parseFloat(message);
        if (!isNaN(value) && value > 0) {
            updateSensorData('humidity', value);
        } else {
            addLogMessage("Warning", `Invalid humidity value: ${message}`);
        }
    } else if (topic === JARAK_TOPIC) {
        const value = parseFloat(message);
        if (!isNaN(value) && value >= 0) {
            updateSensorData('distance', value);
        } else {
            addLogMessage("Warning", `Invalid distance value: ${message}`);
        }
    } else if (topic === KIPAS_TOPIC) {
        updateRelayStatus('kipas', message);
    } else if (topic === LAMPU_TOPIC) {
        updateRelayStatus('lampu', message);
    } else if (topic === SERVO_TOPIC) {
        updateServoStatus(message);
    }
        
    // Update last update time
    if (lastUpdateElement) {
        lastUpdateElement.textContent = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
    }
}

// Update sensor data with gauges
function updateSensorData(sensor, value) {
    if (sensor === 'temperature' && tempGauge) {
        tempGauge.value = value;
        console.log(`Updated ${sensor}: ${value.toFixed(1)}°C`);
        addLogMessage("System", `Updated ${sensor}: ${value.toFixed(1)}°C`);
        previousValues.temperature = value;
    } else if (sensor === 'humidity' && humGauge) {
        humGauge.value = value;
        console.log(`Updated ${sensor}: ${value.toFixed(1)}%`);
        addLogMessage("System", `Updated ${sensor}: ${value.toFixed(1)}%`);
        previousValues.humidity = value;
    } else if (sensor === 'distance') {
        const element = document.getElementById('distance');
        if (!element) {
            console.error(`DOM element for ${sensor} not found`);
            addLogMessage("Error", `DOM element for ${sensor} not found`);
            return;
        }
        element.textContent = `${value.toFixed(0)} cm`;
        console.log(`Updated ${sensor}: ${value.toFixed(0)} cm`);
        addLogMessage("System", `Updated ${sensor}: ${value.toFixed(0)} cm`);
        previousValues.distance = value;
    } else {
        console.error(`Unknown sensor or gauge not initialized: ${sensor}`);
        addLogMessage("Error", `Unknown sensor or gauge not initialized: ${sensor}`);
    }
}

// Update relay status
function updateRelayStatus(relay, status) {
    const statusElement = document.getElementById(`${relay}Status`);
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = `status-badge ${status.toLowerCase()}`;
    } else {
        console.warn(`Status element for ${relay} not found`);
    }
}

// Update servo status
function updateServoStatus(status) {
    const servoElement = document.getElementById('servoStatus');
    const servoVisual = document.getElementById('servoVisual');
    const servoDoor = document.getElementById('servoDoor');
    const servoIcon = servoDoor ? servoDoor.querySelector('i') : null;

    if (servoElement) {
        servoElement.textContent = status;
        servoElement.className = `servo-value ${status === 'TERBUKA' ? 'open' : 'closed'}`;
                
        if (servoVisual) {
            servoVisual.className = `servo-visual ${status === 'TERBUKA' ? 'open' : ''}`;
        }
                
        if (servoIcon) {
            servoIcon.className = status === 'TERBUKA' ? 'fas fa-door-open' : 'fas fa-door-closed';
        }
    } else {
        console.warn("Servo status element not found");
    }
}

// Send MQTT command with debounce
function sendMQTTCommand(device, command) {
    const now = Date.now();
    let lastCommandTime;
    
    if (device === 'lampu') lastCommandTime = lastLampuCommandTime;
    else if (device === 'kipas') lastCommandTime = lastKipasCommandTime;
    else if (device === 'servo/status') lastCommandTime = lastServoCommandTime;
    else return;

    if (now - lastCommandTime < commandMinInterval) {
        addLogMessage("Warning", `Command ignored: Sent too soon for ${device}`);
        return;
    }
        
    if (client && client.connected()) {
        const topic = device === 'lampu' ? LAMPU_TOPIC : device === 'kipas' ? KIPAS_TOPIC : SERVO_TOPIC;
        try {
            client.publish(topic, command, { qos: 1, retain: false }, (err) => {
                if (err) {
                    console.error("Publish error:", err);
                    addLogMessage("Error", `Failed to publish ${command} to ${device}: ${err.message}`);
                } else {
                    console.log("Published:", command, "to", topic);
                    addLogMessage("Sent", `${command} command to ${device}`);
                    if (device === 'lampu') lastLampuCommandTime = now;
                    else if (device === 'kipas') lastKipasCommandTime = now;
                    else if (device === 'servo/status') lastServoCommandTime = now;
                }
            });
                        
            // Visual feedback
            const button = document.getElementById(`${device === 'servo/status' ? 'servo' : device}${command === 'ON' || command === 'TERBUKA' ? 'On' : 'Off'}`);
            if (button) {
                button.style.transform = "scale(0.95)";
                setTimeout(() => {
                    button.style.transform = "";
                }, 150);
            }
                    
        } catch (error) {
            console.error("Failed to send command:", error);
            addLogMessage("Error", `Failed to send ${command} to ${device}: ${error.message}`);
        }
    } else {
        addLogMessage("Error", "Not connected to MQTT broker");
        alert("Please wait for connection to be established before sending commands.");
    }
}

// Enable/disable control buttons
function enableControls(enabled) {
    const buttons = ['lampuOn', 'lampuOff', 'kipasOn', 'kipasOff', 'servoOn', 'servoOff'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !enabled;
    });
}

// Update connection status
function updateConnectionStatus(status) {
    if (!statusElement) {
        console.error("Cannot update connection status: element missing");
        return;
    }
        
    statusElement.className = `connection-status ${status}`;
        
    const qualityElement = document.getElementById('connectionQuality');
        
    switch (status) {
        case "connected":
            statusElement.innerHTML = '<i class="fas fa-wifi"></i><span>Connected</span>';
            if (qualityElement) qualityElement.textContent = `Connected to ${MQTT_BROKERS[currentBrokerIndex].name}`;
            enableControls(true);
            break;
        case "connecting":
            statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Connecting...</span>';
            if (qualityElement) qualityElement.textContent = `Connecting to ${MQTT_BROKERS[currentBrokerIndex].name}`;
            enableControls(false);
            break;
        case "error":
            statusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Error</span>';
            if (qualityElement) qualityElement.textContent = "Connection Failed";
            enableControls(false);
            break;
        default:
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i><span>Disconnected</span>';
            if (qualityElement) qualityElement.textContent = "Disconnected";
            enableControls(false);
    }
}

// Add message to log
function addLogMessage(type, message) {
    if (!messageLog) {
        console.error("messageLog element not found");
        return;
    }
        
    const timestamp = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' });
    const logItem = document.createElement("div");
    logItem.className = `log-item ${type.toLowerCase()}`;
    logItem.innerHTML = `
        <span class="timestamp">${timestamp}</span>
        <span class="message">[${type}] ${message}</span>
    `;
        
    messageLog.appendChild(logItem);
        
    while (messageLog.children.length > 100) {
        messageLog.removeChild(messageLog.firstChild);
    }
        
    if (autoScroll) {
        messageLog.scrollTop = messageLog.scrollHeight;
    }
}

// Update message count
function updateMessageCount() {
    if (messageCountElement) {
        messageCountElement.textContent = messageCount;
    }
}

// Update connection time
function updateConnectionTime() {
    if (connectionTimeElement && connectionStartTime) {
        const now = new Date();
        const diff = Math.floor((now - connectionStartTime) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        connectionTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Reconnect MQTT
function reconnectMQTT() {
    if (client) {
        client.end();
    }
    setTimeout(() => {
        connectToMQTT();
    }, Math.min(60000, 2000 * Math.pow(2, reconnectAttempts)));
    addLogMessage("System", `Reconnection attempt ${reconnectAttempts + 1} to ${MQTT_BROKERS[currentBrokerIndex].name}`);
}

// Update topic prefix (disabled for consistency)
function updateTopicPrefix() {
    console.warn("Topic prefix change not supported in this version");
    addLogMessage("Warning", "Topic prefix change not supported in this version");
}

// Clear message logs
function clearLogs() {
    if (messageLog) {
        messageLog.innerHTML = '';
        messageCount = 0;
        updateMessageCount();
        addLogMessage("System", "Message log cleared");
    }
}

// Toggle auto scroll
function toggleAutoScroll() {
    autoScroll = !autoScroll;
    const button = document.getElementById('autoScrollBtn');
    if (button) {
        button.innerHTML = autoScroll ? 
            '<i class="fas fa-arrow-down"></i> Auto Scroll' : 
            '<i class="fas fa-pause"></i> Manual Scroll';
        button.className = autoScroll ? 'btn btn-small' : 'btn btn-small btn-secondary';
    }
    addLogMessage("System", `Auto scroll ${autoScroll ? 'enabled' : 'disabled'}`);
}

// Auto-retry connection with backoff
setInterval(() => {
    if (!client || !client.connected()) {
        console.log("Auto-retry connection...");
        reconnectMQTT();
    }
}, 15000);

// Keyboard shortcuts
document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
            case "1":
                event.preventDefault();
                sendMQTTCommand("lampu", "ON");
                break;
            case "2":
                event.preventDefault();
                sendMQTTCommand("lampu", "OFF");
                break;
            case "3":
                event.preventDefault();
                sendMQTTCommand("kipas", "ON");
                break;
            case "4":
                event.preventDefault();
                sendMQTTCommand("kipas", "OFF");
                break;
            case "5":
                event.preventDefault();
                sendMQTTCommand("servo/status", "TERBUKA");
                break;
            case "6":
                event.preventDefault();
                sendMQTTCommand("servo/status", "TIDAK TERBUKA");
                break;
        }
    }
});

// Page visibility handling
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        console.log("Page hidden - maintaining connection");
    } else {
        console.log("Page visible - checking connection");
        if (!client || !client.connected()) {
            addLogMessage("System", "Page resumed - reconnecting...");
            reconnectMQTT();
        }
    }
});

// Cleanup on page close
window.addEventListener('beforeunload', function() {
    if (client) {
        client.end();
    }
});
