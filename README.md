ESP32 MQTT Control & Monitoring Dashboard

  
  
  
  
  


🎯 Overview
A real-time ESP32-based monitoring and control system using MQTT with a modern, glassmorphism-style web interface deployable on GitHub Pages. The system enables seamless communication between an ESP32 microcontroller and a web dashboard via MQTT for real-time sensor monitoring and device control.
✨ Key Features
🌐 Web Interface

Real-time Monitoring: Automatic updates of sensor data via MQTT.
Glassmorphism UI: Elegant, transparent design with smooth blur effects and animations.
Responsive Design: Optimized for desktop, tablet, and mobile devices.
MQTT Message Log: Real-time logging of MQTT messages with timestamps.
Connection Status: Visual indicator with auto-reconnect functionality.
Keyboard Shortcuts: Quick control using keyboard commands.
Trend Indicators: Visual cues for sensor data trends (rising/falling).
Settings Panel: Configurable MQTT topic prefix and broker settings.
Auto Scroll: Message log automatically scrolls to the latest entry.

🔧 ESP32 Features

Multi-sensor Support: DHT22 (temperature/humidity), HC-SR04 (distance).
Dual Relay Control: Control of light and fan with status feedback.
Servo Automation: Automatic door simulation based on distance.
MQTT Communication: Pub/Sub pattern for reliable real-time interaction.
Auto Control Logic: Fan activates based on temperature with hysteresis.
WiFi Auto-reconnect: Stable WiFi and MQTT connections.
Built-in LED Indicator: Visual feedback for WiFi connection status.
Command Debouncing: Prevents command spamming for reliable operation.

📋 Requirements
Hardware

ESP32 Development Board
DHT22 Temperature & Humidity Sensor
HC-SR04 Ultrasonic Distance Sensor
2x Relay Module (5V)
SG90 Servo Motor
LED Indicator (Built-in on GPIO 2)
Breadboard and jumper wires
5V Power Supply (for relays)

Software

Arduino IDE with ESP32 board package
Libraries: PubSubClient, DHT, ESP32Servo, ArduinoJson
Modern web browser with WebSocket support
GitHub account (for GitHub Pages deployment)

🔌 Pin Configuration
#define DHTPIN 17         // DHT22 data pin (GPIO 17)
#define TRIG_PIN 4        // HC-SR04 trigger pin
#define ECHO_PIN 16       // HC-SR04 echo pin
#define RELAY_LAMPU 27    // Relay for light
#define RELAY_KIPAS 26    // Relay for fan
#define SERVO_PIN 15      // Servo control pin
#define LED_PIN 2         // Built-in LED (GPIO 2)

🚀 Installation
1. ESP32 Setup
Install Required Libraries
# In Arduino IDE, go to Tools > Manage Libraries
# Install the following libraries:
- PubSubClient by Nick O'Leary
- DHT sensor library by Adafruit
- ESP32Servo by Kevin Harrington
- ArduinoJson by Benoit Blanchon

Upload Code

Open Arduino IDE.
Copy the ESP32 code from esp32_mqtt_code.ino.
Update WiFi credentials:const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";


Select board: ESP32 Dev Module.
Choose the correct COM port.
Upload the code to the ESP32.

2. Web Interface Setup
Option 1: GitHub Pages (Recommended)

Fork this repository.
Enable GitHub Pages in repository settings.
Select source: Deploy from a branch.
Choose branch: main and folder: / (root).
Access via the GitHub Pages URL: https://username.github.io/repository-name.

Option 2: Local Development
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000

📡 MQTT Topics Structure
Sensor Data (ESP32 → Web)
ESP32-IoT/suhu          # Temperature in Celsius (float)
ESP32-IoT/kelembapan    # Humidity in % (float)
ESP32-IoT/jarak         # Distance in cm (integer)

Device Status (ESP32 → Web)
ESP32-IoT/kipas         # Fan status: ON/OFF
ESP32-IoT/lampu         # Light status: ON/OFF
ESP32-IoT/servo/status  # Servo status: TERBUKA/TIDAK TERBUKA

Control Commands (Web → ESP32)
ESP32-IoT/kipas         # Fan command: ON/OFF
ESP32-IoT/lampu         # Light command: ON/OFF
ESP32-IoT/servo/status  # Servo command: TERBUKA/TIDAK TERBUKA

🎮 Usage
Basic Operation

Power ESP32: Connect to a power supply and verify wiring.
Check Serial Monitor: Set baud rate to 115200; confirm WiFi and MQTT connections.
Open Web Interface: Access the dashboard in a browser.
Wait for Connection: A green "Connected" status will appear.
Monitor & Control: Sensor data updates automatically; use control buttons for interaction.

Keyboard Shortcuts

Ctrl + 1: Light ON
Ctrl + 2: Light OFF
Ctrl + 3: Fan ON
Ctrl + 4: Fan OFF

Automatic Features

Servo Control: Opens automatically if distance < 20cm (door simulation).
Fan Control: Activates if temperature > 37°C.
Hysteresis: Fan turns OFF if temperature < 27°C to prevent oscillation.
LED Indicator: Built-in LED reflects WiFi connection status.

⚙️ Configuration
ESP32 Configuration
// WiFi Settings
const char* ssid = "Sadin";
const char* password = "Dinda12345";

// MQTT Settings
const char* mqttServer = "broker.emqx.io";
const int mqttPort = 1883;
const char* topicPrefix = "ESP32-IoT";

// Timing Configuration
const unsigned long sensorInterval = 2000;   // Read sensors every 2s
const unsigned long publishInterval = 3000;  // Publish data every 3s
const unsigned long reconnectInterval = 5000; // Retry every 5s

Web Interface Configuration
// MQTT Configuration
const MQTT_BROKER = "wss://broker.emqx.io:8084/mqtt";
let TOPIC_PREFIX = "ESP32-IoT";

// UI Configuration
const MAX_LOG_ENTRIES = 50;
const RECONNECT_INTERVAL = 3000;
const COMMAND_TIMEOUT = 5000;

🔧 Troubleshooting
Common Issues
1. ESP32 Not Connecting to WiFi
Solutions:

Verify WiFi credentials in the code.
Ensure the network is 2.4GHz (not 5GHz).
Reset the ESP32 and retry.
Check WiFi signal strength.
Monitor serial output for error messages.

2. MQTT Connection Failed
Solutions:

Confirm internet connectivity.
Test an alternative MQTT broker (e.g., test.mosquitto.org).
Disable VPN or proxy.
Check firewall settings.
Ensure browser WebSocket support.

3. Sensor Not Reading
Solutions:

Verify sensor pin connections (DHT22 on GPIO 17).
Ensure adequate power supply (5V for relays).
Test sensors individually.
Confirm pin configuration in code.
Replace faulty sensors.

4. Web Interface Not Loading
Solutions:

Enable JavaScript in the browser.
Clear browser cache and cookies.
Try a different browser (Chrome/Firefox recommended).
Check browser console for errors.
Ensure HTTPS for GitHub Pages.

5. Relay Not Working
Solutions:

Verify relay module wiring.
Confirm 5V power supply for relays.
Test relays with a multimeter.
Check pin configuration (GPIO 26, 27).
Replace faulty relay modules.

📊 System Architecture
┌─────────────────┐    WiFi     ┌──────────────┐    WebSocket    ┌─────────────────┐
│     ESP32       │◄───────────►│ MQTT Broker  │◄───────────────►│  Web Interface  │
│                 │             │ (EMQX)       │                 │   (Browser)     │
│ - DHT22         │             │              │                 │ - Real-time UI  │
│ - HC-SR04       │             │ - Pub/Sub    │                 │ - Controls      │
│ - Relays        │             │ - QoS        │                 │ - Monitoring    │
│ - Servo         │             │ - WebSocket  │                 │ - Glassmorphism │
│ - Auto Control  │             │ - Retain     │                 │ - Logs          │
└─────────────────┘             └──────────────┘                 └─────────────────┘

📊 Flowchart System
🔄 ESP32 Main Loop Flowchart
flowchart TD
    A[🚀 ESP32 Boot] --> B[📶 Connect WiFi]
    B --> C{WiFi Connected?}
    C -->|No| D[⏳ Wait 500ms] --> B
    C -->|Yes| E[📡 Connect MQTT]
    E --> F{MQTT Connected?}
    F -->|No| G[⏳ Wait 5s] --> E
    F -->|Yes| H[📝 Subscribe Topics]
    H --> I[🔄 Main Loop Start]
    
    I --> J[📊 Read Sensors]
    J --> K[🌡️ DHT22 Read]
    K --> L[📏 HC-SR04 Read]
    L --> M[🤖 Auto Control Logic]
    
    M --> N{Distance < 20cm?}
    N -->|Yes| O[🚪 Open Servo]
    N -->|No| P[🚪 Close Servo]
    
    O --> Q{Temp > 37°C?}
    P --> Q
    Q -->|Yes| R[🌀 Auto Fan ON]
    Q -->|No| S{Temp < 27°C?}
    S -->|Yes| T[🌀 Auto Fan OFF]
    S -->|No| U[📤 Publish Sensor Data]
    R --> U
    T --> U
    
    U --> V[📤 Publish Status Data]
    V --> W[📨 Handle MQTT Messages]
    W --> X[⏳ Delay 100ms]
    X --> I
    
    W --> Y{Command Received?}
    Y -->|Kipas ON| Z1[🌀 Turn Kipas ON]
    Y -->|Kipas OFF| Z2[🌀 Turn Kipas OFF]
    Y -->|Lampu ON| Z3[💡 Turn Lampu ON]
    Y -->|Lampu OFF| Z4[💡 Turn Lampu OFF]
    Y -->|Servo| Z5[🚪 Control Servo]
    
    Z1 --> AA[📤 Publish Status]
    Z2 --> AA
    Z3 --> AA
    Z4 --> AA
    Z5 --> AA
    AA --> X
    
    style A fill:#e1f5fe
    style I fill:#e8f5e8
    style J fill:#fff3e0
    style M fill:#fce4ec
    style U fill:#f3e5f5
    style W fill:#e0f2f1

🌐 Web Interface Flowchart
flowchart TD
    A1[🌐 Load Web Page] --> B1[📚 Load Libraries]
    B1 --> C1{MQTT.js Loaded?}
    C1 -->|No| D1[❌ Show Error] --> E1[🔄 Retry Load]
    E1 --> B1
    C1 -->|Yes| F1[🔗 Connect MQTT Broker]
    
    F1 --> G1{MQTT Connected?}
    G1 -->|No| H1[⏳ Wait 3s] --> I1[🔄 Retry Connection] --> F1
    G1 -->|Yes| J1[📝 Subscribe All Topics]
    
    J1 --> K1[✅ Update UI Status: Connected]
    K1 --> L1[🔄 Main Event Loop]
    
    L1 --> M1[📨 Listen MQTT Messages]
    M1 --> N1{Message Type?}
    
    N1 -->|Sensor Data| O1[📊 Update Sensor Display]
    N1 -->|Relay Status| P1[🔘 Update Control Buttons]
    N1 -->|Servo Status| Q1[🚪 Update Servo Visual]
    
    O1 --> R1[📈 Calculate Trends]
    R1 --> S1[🎨 Update UI Animations]
    
    P1 --> T1[🎨 Update Status Badges]
    Q1 --> U1[🎨 Update Door Icon]
    
    S1 --> V1[📝 Add to Message Log]
    T1 --> V1
    U1 --> V1
    
    V1 --> W1{Auto Scroll Enabled?}
    W1 -->|Yes| X1[⬇️ Scroll to Bottom]
    W1 -->|No| Y1[📍 Keep Position]
    
    X1 --> Z1[⏳ Wait for Next Message]
    Y1 --> Z1
    Z1 --> M1
    
    L1 --> AA1[👆 Handle User Clicks]
    AA1 --> BB1{🎯 Action Type?}
    
    BB1 -->|Control Button| CC1{🔘 Button Type?}
    CC1 -->|Kipas ON| DD1[📤 Publish: kipas → ON]
    CC1 -->|Kipas OFF| DD2[📤 Publish: kipas → OFF]
    CC1 -->|Lampu ON| DD3[📤 Publish: lampu → ON]
    CC1 -->|Lampu OFF| DD4[📤 Publish: lampu → OFF]
    CC1 -->|Servo| DD5[📤 Publish: servo/status]
    
    BB1 -->|Settings| EE1[⚙️ Open Settings Panel]
    EE1 --> FF1{🔧 Setting Type?}
    FF1 -->|Topic Prefix| GG1[📝 Update Topic Prefix]
    FF1 -->|Reconnect| HH1[🔄 Force Reconnect]
    FF1 -->|Clear Logs| II1[🗑️ Clear Message Log]
    
    DD1 --> JJ1[🎨 Button Animation]
    DD2 --> JJ1
    DD3 --> JJ1
    DD4 --> JJ1
    DD5 --> JJ1
    
    JJ1 --> KK1[📝 Log Sent Message]
    GG1 --> KK1
    HH1 --> F1
    II1 --> KK1
    KK1 --> Z1
    
    style A1 fill:#e1f5fe
    style L1 fill:#e8f5e8
    style M1 fill:#fff3e0
    style AA1 fill:#fce4ec
    style V1 fill:#f3e5f5

🔄 MQTT Communication Flow
sequenceDiagram
    participant W as 🌐 Web Interface
    participant B as 📡 MQTT Broker
    participant E as 🤖 ESP32
    
    Note over W,E: System Initialization
    W->>B: Connect (WebSocket)
    E->>B: Connect (TCP)
    
    W->>B: Subscribe to suhu, kelembapan, jarak
    W->>B: Subscribe to kipas, lampu, servo/status
    E->>B: Subscribe to kipas, lampu, servo/status
    
    Note over W,E: Sensor Data Flow (Every 3s)
    E->>B: Publish suhu
    E->>B: Publish kelembapan
    E->>B: Publish jarak
    B->>W: Forward sensor data
    W->>W: Update UI displays
    
    Note over W,E: Status Updates (Every 5s)
    E->>B: Publish kipas status
    E->>B: Publish lampu status
    E->>B: Publish servo status
    B->>W: Forward status data
    W->>W: Update control UI
    
    Note over W,E: User Control Flow
    W->>W: User clicks button
    W->>B: Publish command (e.g., kipas → ON)
    B->>E: Forward command
    E->>E: Execute command
    E->>B: Publish new status
    B->>W: Forward status update
    W->>W: Update UI feedback
    
    Note over W,E: Auto Control Flow
    E->>E: Distance < 20cm detected
    E->>E: Open servo automatically
    E->>B: Publish servo status
    B->>W: Forward status
    W->>W: Update servo visual
    
    E->>E: Temperature > 37°C detected
    E->>E: Turn fan ON
    E->>B: Publish kipas status
    B->>W: Forward status
    W->>W: Update fan status
    
    Note over W,E: Error Handling
    E->>B: Connection lost
    E->>E: Auto reconnect
    E->>B: Reconnect successful
    E->>B: Re-subscribe topics
    
    W->>B: Connection lost
    W->>W: Show "Connecting..." status
    W->>B: Auto reconnect
    W->>W: Show "Connected" status

🎯 Decision Tree - Auto Control Logic
flowchart TD
    A[📊 Sensor Reading Complete] --> B{🌡️ Temperature Check}
    
    B -->|Temp > 37°C| C[🔥 High Temperature]
    B -->|Temp ≤ 37°C| D{📏 Distance Check}
    
    C --> E{🌀 Fan Currently OFF?}
    E -->|Yes| F[✅ Turn Fan ON]
    E -->|No| G[➡️ Keep Fan ON]
    
    D -->|Distance < 20cm| H[📏 Close Distance]
    D -->|Distance ≥ 20cm| I[📏 Normal Distance]
    
    H --> J{🚪 Servo Currently Closed?}
    J -->|Yes| K[✅ Open Servo]
    J -->|No| L[➡️ Keep Servo Open]
    
    I --> M{🚪 Servo Currently Open?}
    M -->|Yes| N[❌ Close Servo]
    M -->|No| O[➡️ Keep Servo Closed]
    
    G --> P{🌡️ Temp < 27°C?}
    P -->|Yes| Q[❌ Turn Fan OFF]
    P -->|No| R[➡️ No Change Needed]
    
    F --> S[📤 Publish Status Update]
    K --> S
    L --> S
    N --> S
    O --> S
    Q --> S
    R --> S
    
    S --> T[⏳ Wait Next Cycle]
    T --> U[🔄 Return to Main Loop]
    
    style A fill:#e1f5fe
    style B fill:#ffebee
    style D fill:#e3f2fd
    style S fill:#f3e5f5
    style T fill:#e8f5e8

📱 User Interaction Flow
flowchart TD
    A[👤 User Opens Dashboard] --> B[🔍 Check Connection Status]
    B --> C{🌐 Connected?}
    
    C -->|No| D[⚠️ Show 'Connecting...']
    D --> E[⏳ Wait for Connection]
    E --> F{📡 MQTT Connected?}
    F -->|No| G[🔄 Auto Retry] --> E
    F -->|Yes| H[✅ Show 'Connected']
    
    C -->|Yes| H
    H --> I[📊 Display Real-time Data]
    
    I --> J[👆 User Interaction Options]
    
    J --> K{🎯 Action Type?}
    
    K -->|View Data| L[👀 Monitor Sensors]
    L --> M[📈 Watch Trend Indicators]
    M --> N[📝 Read Message Log]
    
    K -->|Control Device| O[🎛️ Click Control Button]
    O --> P{🔘 Button Type?}
    
    P -->|Kipas ON| Q[🌀 Send Kipas ON Command]
    P -->|Kipas OFF| R[🌀 Send Kipas OFF Command]
    P -->|Lampu ON| S[💡 Send Lampu ON Command]
    P -->|Lampu OFF| T[💡 Send Lampu OFF Command]
    P -->|Servo| U[🚪 Send Servo Command]
    
    Q --> V[📤 MQTT Publish]
    R --> V
    S --> V
    T --> V
    U --> V
    
    V --> W[⏳ Wait for Response]
    W --> X{📨 Status Update Received?}
    X -->|Yes| Y[✅ Update UI Success]
    X -->|No| Z[⏳ Timeout After 5s]
    Z --> AA[⚠️ Show Error Message]
    
    K -->|Settings| BB[⚙️ Modify Settings]
    BB --> CC{🔧 Setting Type?}
    CC -->|Topic Prefix| DD[📝 Update Topic Prefix]
    CC -->|Reconnect| EE[🔄 Force Reconnect]
    CC -->|Clear Logs| FF[🗑️ Clear Message Log]
    
    K -->|Keyboard Shortcut| GG[⌨️ Keyboard Input]
    GG --> HH{🎹 Key Combination?}
    HH -->|Ctrl+1| II[💡 Lampu ON]
    HH -->|Ctrl+2| JJ[💡 Lampu OFF]
    HH -->|Ctrl+3| KK[🌀 Kipas ON]
    HH -->|Ctrl+4| LL[🌀 Kipas OFF]
    
    II --> V
    JJ --> V
    KK --> V
    LL --> V
    
    Y --> MM[🔄 Continue Monitoring]
    AA --> MM
    DD --> NN[🔄 Reconnect with New Settings]
    EE --> NN
    FF --> MM
    N --> MM
    
    NN --> E
    MM --> I
    
    style A fill:#e1f5fe
    style J fill:#e8f5e8
    style K fill:#fff3e0
    style V fill:#fce4ec
    style MM fill:#f3e5f5

🔒 Security Considerations

Use an MQTT broker with authentication for production.
Implement SSL/TLS for secure connections.
Restrict topic access with Access Control Lists (ACLs).
Use a strong WiFi password.
Regularly update ESP32 firmware to patch vulnerabilities.

🚀 Advanced Features
Custom MQTT Broker
To use a custom MQTT broker:

ESP32: Update mqttServer and mqttPort in the code.
Web: Modify MQTT_BROKER URL in the JavaScript configuration.
Authentication: Add username/password if required by the broker.

Data Logging
Enhance the system with:

InfluxDB: Store time-series sensor data.
Grafana: Visualize historical data and trends.
Node-RED: Automate workflows and integrate with other systems.

Mobile App
Develop a mobile app using:

React Native with MQTT.js for cross-platform support.
Flutter with mqtt_client for native performance.
Ionic with Paho MQTT for hybrid development.

📈 Performance Optimization
ESP32 Optimization
// Reduce sensor reading frequency
const unsigned long sensorInterval = 2000;  // Read every 2 seconds

// Optimize MQTT keepalive
client.setKeepAlive(90);

// Use QoS 0 for frequent data
client.publish(topic, data, false);  // QoS 0, no retain

Web Optimization
// Limit log entries to prevent memory issues
while (messageLog.children.length > 50) {
    messageLog.removeChild(messageLog.firstChild);
}

// Debounce button clicks to prevent spam
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

🤝 Contributing
Contributions are welcome! To contribute:

Fork the repository.
Create a feature branch: git checkout -b feature/amazing-feature.
Commit changes: git commit -m 'Add amazing feature'.
Push to the branch: git push origin feature/amazing-feature.
Open a Pull Request.

Development Guidelines

Follow the existing code style and structure.
Test changes across multiple browsers (Chrome, Firefox, Safari).
Update documentation to reflect changes.
Include screenshots for UI-related updates.

📝 License
This project is licensed under the MIT License. See the LICENSE file for details.
🙏 Acknowledgments

EMQX: For providing a free MQTT broker.
MQTT.js: For a robust WebSocket MQTT client.
Arduino Community: For open-source libraries and support.
ESP32 Community: For comprehensive documentation and resources.

📞 Support

Issues: GitHub Issues
Discussions: GitHub Discussions
Email: your-email@example.com

🔗 Useful Links

ESP32 Documentation
MQTT.js Documentation
EMQX Broker
Arduino ESP32 Guide




⭐ Star this repository if you found it helpful!
Made with ❤️ for the IoT community
⬆ Back to Top

