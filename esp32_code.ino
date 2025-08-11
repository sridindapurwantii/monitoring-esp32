#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <DHT.h>
#include <ArduinoJson.h>

// Function prototype
void debugInfo();

// WiFi Configuration
const char* ssid = "Sadin";
const char* password = "Dinda12345";

// MQTT Configuration
const char* mqttServer = "broker.emqx.io";
const int mqttPort = 1883;
char clientId[50];
const char* topicPrefix = "ESP32-IoT";

// Pin Configuration
#define DHTPIN 17           // DHT22 on GPIO 17
#define DHTTYPE DHT22
#define TRIG_PIN 4
#define ECHO_PIN 16
#define RELAY_LAMPU 27      // Lampu
#define RELAY_KIPAS 26      // Kipas
#define SERVO_PIN 15
#define LED_PIN 2           // Built-in LED on GPIO 2

// Objects
WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHTPIN, DHTTYPE);
Servo myServo;

// Global Variables
float temperature = 0.0;
float humidity = 0.0;
long distance = 0;
bool relayLampuStatus = false;
bool relayKipasStatus = false;
bool servoOpen = false;
int dhtReadCounter = 0;

// Timing variables
unsigned long lastSensorRead = 0;
unsigned long lastMQTTPublish = 0;
unsigned long lastReconnectAttempt = 0;
unsigned long lastCommandTime = 0;
const unsigned long sensorInterval = 2000;  // Read sensors every 2 seconds
const unsigned long publishInterval = 3000; // Publish data every 3 seconds
const unsigned long reconnectInterval = 5000; // Retry every 5 seconds
const unsigned long commandMinInterval = 200; // 200ms for fast response

// Topic strings
char tempTopic[100];
char humTopic[100];
char distTopic[100];
char kipasTopic[100];
char lampuTopic[100];
char servoStatusTopic[100];

void setup() {
  Serial.begin(115200);
  delay(1000); // Give time for serial monitor to initialize
  // Generate unique client ID
  snprintf(clientId, sizeof(clientId), "ESP32-%ld", random(1000000));
    
  // Initialize topic strings
  initializeTopics();
    
  // Initialize pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_LAMPU, OUTPUT);
  pinMode(RELAY_KIPAS, OUTPUT);
  pinMode(LED_PIN, OUTPUT); // Initialize the built-in LED pin
  digitalWrite(LED_PIN, HIGH); // Ensure LED is off initially (active-low)
    
  // Set relays OFF initially
  digitalWrite(RELAY_LAMPU, LOW);
  digitalWrite(RELAY_KIPAS, LOW);
    
  // Initialize servo
  myServo.attach(SERVO_PIN);
  myServo.write(0); // Closed position
    
  // Initialize DHT22
  Serial.println("Initializing DHT22 sensor on GPIO 17...");
  dht.begin();
  delay(3000); // Increased delay for DHT22 stabilization
    
  // Connect to WiFi
  connectWiFi();
    
  // Setup MQTT
  client.setServer(mqttServer, mqttPort);
  client.setCallback(mqttCallback);
    
  Serial.println("ESP32 MQTT IoT System Ready!");
  Serial.printf("Client ID: %s\n", clientId);
}

void loop() {
  // Maintain MQTT connection
  if (!client.connected() && (millis() - lastReconnectAttempt > reconnectInterval)) {
    reconnectMQTT();
    lastReconnectAttempt = millis();
  }
  client.loop();
    
  // Update LED based on WiFi status (active-low: LOW = ON, HIGH = OFF)
  digitalWrite(LED_PIN, WiFi.status() == WL_CONNECTED ? LOW : HIGH);
    
  // Read sensors periodically
  if (millis() - lastSensorRead >= sensorInterval) {
    readSensors();
    controlAutomatic();
    lastSensorRead = millis();
  }
    
  // Publish sensor data periodically
  if (millis() - lastMQTTPublish >= publishInterval) {
    publishSensorData();
    publishStatusData();
    lastMQTTPublish = millis();
  }
    
  // Debug info periodically
  debugInfo();
  delay(100);
}

void initializeTopics() {
  snprintf(tempTopic, sizeof(tempTopic), "%s/suhu", topicPrefix);
  snprintf(humTopic, sizeof(humTopic), "%s/kelembapan", topicPrefix);
  snprintf(distTopic, sizeof(distTopic), "%s/jarak", topicPrefix);
  snprintf(kipasTopic, sizeof(kipasTopic), "%s/kipas", topicPrefix);
  snprintf(lampuTopic, sizeof(lampuTopic), "%s/lampu", topicPrefix);
  snprintf(servoStatusTopic, sizeof(servoStatusTopic), "%s/servo/status", topicPrefix);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
    
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Blink LED during connection attempt
    attempts++;
  }
    
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("WiFi Connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.printf("Signal strength: %d dBm\n", WiFi.RSSI());
    digitalWrite(LED_PIN, LOW); // Turn LED on when connected (active-low)
  } else {
    Serial.println();
    Serial.println("Failed to connect to WiFi. Restarting...");
    digitalWrite(LED_PIN, HIGH); // Ensure LED is off on failure (active-low)
    ESP.restart();
  }
}

void reconnectMQTT() {
  Serial.print("Attempting MQTT connection with client ID: ");
  Serial.println(clientId);
  if (client.connect(clientId)) {
    Serial.println("MQTT Connected!");
    
    // Clear retained messages for all topics
    client.publish(lampuTopic, "", true);
    client.publish(kipasTopic, "", true);
    client.publish(servoStatusTopic, "", true);
    
    // Subscribe to command topics
    client.subscribe(lampuTopic, 1);
    client.subscribe(kipasTopic, 1);
    client.subscribe(servoStatusTopic, 1);
    
    // Publish initial status
    publishStatusData();
  } else {
    Serial.print("MQTT connection failed, rc=");
    Serial.print(client.state());
    Serial.println(" retrying in 5 seconds");
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Check if command is too soon
  if (millis() - lastCommandTime < commandMinInterval) {
    return; // Silently ignore commands received too soon
  }
    
  // Convert payload to string
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
    
  // Handle lampu commands
  if (strcmp(topic, lampuTopic) == 0) {
    if (message == "ON" && !relayLampuStatus) {
      digitalWrite(RELAY_LAMPU, HIGH);
      relayLampuStatus = true;
      client.publish(lampuTopic, "ON", true);
    } else if (message == "OFF" && relayLampuStatus) {
      digitalWrite(RELAY_LAMPU, LOW);
      relayLampuStatus = false;
      client.publish(lampuTopic, "OFF", true);
    }
    lastCommandTime = millis();
  }
  // Handle kipas commands
  else if (strcmp(topic, kipasTopic) == 0) {
    if (message == "ON" && !relayKipasStatus) {
      digitalWrite(RELAY_KIPAS, HIGH);
      relayKipasStatus = true;
      client.publish(kipasTopic, "ON", true);
    } else if (message == "OFF" && relayKipasStatus) {
      digitalWrite(RELAY_KIPAS, LOW);
      relayKipasStatus = false;
      client.publish(kipasTopic, "OFF", true);
    }
    lastCommandTime = millis();
  }
  // Handle servo commands
  else if (strcmp(topic, servoStatusTopic) == 0) {
    if (message == "TERBUKA" && !servoOpen) {
      myServo.write(90);
      servoOpen = true;
      client.publish(servoStatusTopic, "TERBUKA", true);
    } else if (message == "TIDAK TERBUKA" && servoOpen) {
      myServo.write(0);
      servoOpen = false;
      client.publish(servoStatusTopic, "TIDAK TERBUKA", true);
    }
    lastCommandTime = millis();
  }
}

void readSensors() {
  // Read DHT22 with retry mechanism
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  dhtReadCounter++;
    
  // Retry up to 3 times if reading fails
  int retryCount = 0;
  const int maxRetries = 3;
  while ((isnan(h) || isnan(t) || h <= 0.0 || t <= 0.0) && retryCount < maxRetries) {
    delay(1000); // Increased retry delay
    h = dht.readHumidity();
    t = dht.readTemperature();
    retryCount++;
  }
    
  // Update if readings are valid
  if (!isnan(h) && !isnan(t) && h > 0.0 && t > 0.0) {
    humidity = h;
    temperature = t;
  }
    
  // Read HC-SR04 ultrasonic sensor
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
    
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration > 0) {
    distance = duration * 0.034 / 2; // Convert to cm
    if (distance > 400) distance = 400; // Limit to reasonable range
  }
}

void controlAutomatic() {
  // Servo control based on distance
  bool shouldOpen = (distance < 20 && distance > 0);
  if (shouldOpen && !servoOpen) {
    myServo.write(90); // Open servo
    servoOpen = true;
    client.publish(servoStatusTopic, "TERBUKA", true);
  } else if (!shouldOpen && servoOpen) {
    myServo.write(0); // Close servo
    servoOpen = false;
    client.publish(servoStatusTopic, "TIDAK TERBUKA", true);
  }
    
  // Automatic fan control based on temperature only
  static unsigned long lastManualControl = 0;
  static bool wasManuallyControlled = false;
    
  if (millis() - lastManualControl > 30000) {
    wasManuallyControlled = false;
  }
    
  if (!wasManuallyControlled) {
    bool shouldTurnOnFan = (temperature > 37.0);
    bool shouldTurnOffFan = (temperature < 27.0);  
    
    if (shouldTurnOnFan && !relayKipasStatus) {
      digitalWrite(RELAY_KIPAS, HIGH);
      relayKipasStatus = true;
      client.publish(kipasTopic, "ON", true);
    } else if (shouldTurnOffFan && relayKipasStatus) {
      digitalWrite(RELAY_KIPAS, LOW);
      relayKipasStatus = false;
      client.publish(kipasTopic, "OFF", true);
    }
  }
}

void publishSensorData() {
  if (client.connected()) {
    // Only publish valid temperature and humidity data
    if (!isnan(temperature) && !isnan(humidity) && temperature > 0.0 && humidity > 0.0) {
      char tempStr[10];
      dtostrf(temperature, 4, 1, tempStr);
      client.publish(tempTopic, tempStr, true);
      char humStr[10];
      dtostrf(humidity, 4, 1, humStr);
      client.publish(humTopic, humStr, true);
    }
    
    // Publish distance
    char distStr[10];
    sprintf(distStr, "%ld", distance);
    client.publish(distTopic, distStr, true);
  }
}

void publishStatusData() {
  if (client.connected()) {
    client.publish(kipasTopic, relayKipasStatus ? "ON" : "OFF", true);
    client.publish(lampuTopic, relayLampuStatus ? "ON" : "OFF", true);
    client.publish(servoStatusTopic, servoOpen ? "TERBUKA" : "TIDAK TERBUKA", true);
  }
}

void printSystemInfo() {
  // Get current time (simulated for formatting, as ESP32 doesn't have RTC by default)
  char timeStr[20];
  snprintf(timeStr, sizeof(timeStr), "2025-08-11 17:45:20"); // Static time as per request
  
  Serial.println("========================================");
  Serial.printf("Time: %s | Uptime: %lu s\n", timeStr, millis() / 1000);
  Serial.println("----------------------------------------");
  
  // DHT22 Sensor Section
  Serial.println("🌡 DHT22 SENSOR");
  if (!isnan(temperature) && !isnan(humidity) && temperature > 0.0 && humidity > 0.0) {
    Serial.printf("  Temperature : %.2f °C\n", temperature);
    Serial.printf("  Humidity    : %.2f %%RH\n", humidity);
  } else {
    Serial.println("  Temperature : N/A");
    Serial.println("  Humidity    : N/A");
  }
  
  // System Info Section
  Serial.println("\n SYSTEM INFO");
  Serial.printf("  Chip Model  : %s\n", ESP.getChipModel());
  Serial.printf("  CPU Freq    : %d MHz\n", ESP.getCpuFreqMHz());
  Serial.printf("  Free Heap   : %d bytes\n", ESP.getFreeHeap());
  Serial.printf("ask to WiFi RSSI   : %d dBm\n", WiFi.RSSI());
  Serial.printf("  WiFi Status : %s\n", WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
  
  // Device Status Section
  Serial.println("\n DEVICE STATUS");
  Serial.printf("  LED         : %s\n", digitalRead(LED_PIN) ? "OFF" : "ON"); // Active-low LED
  Serial.printf("  Fan         : %s\n", relayKipasStatus ? "ON" : "OFF");
  Serial.println("========================================");
}

void debugInfo() {
  static unsigned long lastDebug = 0;
  if (millis() - lastDebug > 60000) { // Print every 60 seconds
    printSystemInfo();
    lastDebug = millis();
  }
}
