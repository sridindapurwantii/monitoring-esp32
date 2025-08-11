/*
  Perbaikan:
  - Dalam fungsi 'updateServoStatus', mengubah cara ikon pintu diperbarui.
    Sekarang hanya mengubah kelas ikon (fas fa-door-open/closed)
    bukan seluruh innerHTML, untuk menghindari teks ganda.
*/
const MQTT_BROKER = "wss://broker.emqx.io:8084/mqtt";
let TOPIC_PREFIX = "ESP32-IoT";
let client = null;
let messageCount = 0;
let connectionStartTime = null;
let autoScroll = true;
let lastCommandTime = 0;
const commandMinInterval = 2000; // 2s debounce for commands

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
const clientId = `web-client-${Math.random().toString(16).substr(2, 8)}`;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log("ESP32 MQTT Dashboard initialized");
        
    if (clientIdElement) {
        clientIdElement.value = clientId;
    }
        
    connectToMQTT();
    addLogMessage("System", "Initializing MQTT connection...");
        
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
        addLogMessage("System", `Connecting to ${MQTT_BROKER}...`);
                
        client = mqtt.connect(MQTT_BROKER, {
            clientId: clientId,
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 2000, // Increased for stability
            keepalive: 60,
        });

        client.on("connect", () => {
            console.log("Connected to MQTT broker at:", new Date().toLocaleTimeString());
            connectionStartTime = new Date();
            updateConnectionStatus("connected");
            addLogMessage("MQTT", "Connected successfully!");
                        
            // Subscribe to all sensor topics
            subscribeToTopics();
                        
            // Clear retained messages
            clearRetainedMessages();
        });

        client.on("error", (err) => {
            console.error("Connection error:", err);
            updateConnectionStatus("error");
            addLogMessage("Error", `Connection failed: ${err.message}`);
        });

        client.on("reconnect", () => {
            console.log("Reconnecting...");
            updateConnectionStatus("connecting");
            addLogMessage("MQTT", "Attempting to reconnect...");
        });

        client.on("offline", () => {
            console.log("Client offline");
            updateConnectionStatus("error");
            addLogMessage("MQTT", "Connection lost - client offline");
        });

        client.on("message", (topic, message) => {
            handleMQTTMessage(topic, message.toString());
        });
    } catch (error) {
        console.error("Failed to connect:", error);
        updateConnectionStatus("error");
        addLogMessage("Error", `Failed to initialize: ${error.message}`);
    }
}

// Clear retained messages for all topics
function clearRetainedMessages() {
    const topics = ['lampu', 'kipas', 'servo/status'];
    topics.forEach(device => {
        const topic = `${TOPIC_PREFIX}/${device}`;
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
    const topics = [
        `${TOPIC_PREFIX}/suhu`,
        `${TOPIC_PREFIX}/kelembapan`,
        `${TOPIC_PREFIX}/jarak`,
        `${TOPIC_PREFIX}/kipas`,
        `${TOPIC_PREFIX}/lampu`,
        `${TOPIC_PREFIX}/servo/status`
    ];
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
    if (topic === `${TOPIC_PREFIX}/suhu`) {
        const value = parseFloat(message);
        if (!isNaN(value) && value > 0) {
            updateSensorData('temperature', value);
        } else {
            addLogMessage("Warning", `Invalid temperature value: ${message}`);
        }
    } else if (topic === `${TOPIC_PREFIX}/kelembapan`) {
        const value = parseFloat(message);
        if (!isNaN(value) && value > 0) {
            updateSensorData('humidity', value);
        } else {
            addLogMessage("Warning", `Invalid humidity value: ${message}`);
        }
    } else if (topic === `${TOPIC_PREFIX}/jarak`) {
        const value = parseFloat(message);
        if (!isNaN(value) && value >= 0) {
            updateSensorData('distance', value);
        } else {
            addLogMessage("Warning", `Invalid distance value: ${message}`);
        }
    } else if (topic === `${TOPIC_PREFIX}/kipas`) {
        updateRelayStatus('kipas', message);
    } else if (topic === `${TOPIC_PREFIX}/lampu`) {
        updateRelayStatus('lampu', message);
    } else if (topic === `${TOPIC_PREFIX}/servo/status`) {
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
    const servoIcon = servoDoor ? servoDoor.querySelector('i') : null; // Get the icon element

    if (servoElement) {
        // Update the text status
        servoElement.textContent = status;
        servoElement.className = `servo-value ${status === 'TERBUKA' ? 'open' : 'closed'}`;
                
        if (servoVisual) {
            servoVisual.className = `servo-visual ${status === 'TERBUKA' ? 'open' : ''}`;
        }
                
        if (servoIcon) { // Only update the icon class, not innerHTML
            if (status === 'TERBUKA') {
                servoIcon.className = 'fas fa-door-open';
            } else {
                servoIcon.className = 'fas fa-door-closed';
            }
        }
    } else {
        console.warn("Servo status element not found");
    }
}

// Send MQTT command with debounce
function sendMQTTCommand(device, command) {
    const now = Date.now();
    if (now - lastCommandTime < commandMinInterval) {
        addLogMessage("Warning", `Command ignored: Sent too soon for ${device}`);
        return;
    }
        
    if (client && client.connected) {
        const topic = `${TOPIC_PREFIX}/${device}`;
        try {
            client.publish(topic, command, { qos: 1, retain: false }, (err) => {
                if (err) {
                    console.error("Publish error:", err);
                    addLogMessage("Error", `Failed to publish ${command} to ${device}: ${err.message}`);
                } else {
                    console.log("Published:", command, "to", topic);
                    addLogMessage("Sent", `${command} command to ${device}`);
                    lastCommandTime = now;
                }
            });
                        
            // Visual feedback
            const button = document.getElementById(`${device}${command === 'ON' ? 'On' : 'Off'}`);
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
    const buttons = ['lampuOn', 'lampuOff', 'kipasOn', 'kipasOff'];
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
            if (qualityElement) qualityElement.textContent = "Excellent";
            enableControls(true);
            break;
        case "connecting":
            statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Connecting...</span>';
            if (qualityElement) qualityElement.textContent = "Connecting";
            enableControls(false);
            break;
        case "error":
            statusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Error</span>';
            if (qualityElement) qualityElement.textContent = "Poor";
            enableControls(false);
            break;
        default:
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i><span>Disconnected</span>';
            if (qualityElement) qualityElement.textContent = "Unknown";
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
    }, 1000);
    addLogMessage("System", "Manual reconnection initiated");
}

// Update topic prefix
function updateTopicPrefix() {
    const topicPrefixElement = document.getElementById('topicPrefix');
    if (topicPrefixElement) {
        const newPrefix = topicPrefixElement.value.trim();
        if (newPrefix && newPrefix !== TOPIC_PREFIX) {
            TOPIC_PREFIX = newPrefix;
            addLogMessage("System", `Topic prefix updated to: ${TOPIC_PREFIX}`);
            if (client && client.connected) {
                reconnectMQTT();
            }
        }
    }
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
let reconnectAttempts = 0;
setInterval(() => {
    if (!client || !client.connected) {
        console.log("Auto-retry connection...");
        reconnectMQTT();
        reconnectAttempts++;
        setTimeout(() => {
            reconnectMQTT();
        }, Math.min(60000, 2000 * Math.pow(2, reconnectAttempts)));
    } else {
        reconnectAttempts = 0;
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
        }
    }
});

// Page visibility handling
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        console.log("Page hidden - maintaining connection");
    } else {
        console.log("Page visible - checking connection");
        if (!client || !client.connected) {
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
