// Aftershock - Base Station firmware
// Arduino UNO + Educational Shield + Ethernet Shield
// This board does not detect impacts itself - that happens on the phone.
// It receives alert commands from Node-RED and raises a physical alarm.

#include <SPI.h>
#include <Ethernet.h>

// Educational Shield pin map
const int PIN_LED_GREEN = 6;
const int PIN_LED_RED = 9;
const int PIN_LED_BLUE = 10;
const int PIN_BUZZER = 5;
const int PIN_RELAY = 2;
const int PIN_BUTTON_ACK = 7;
const int PIN_POT = A1;

// This shield's LEDs are active-low: LOW turns them on, HIGH turns them off.
const int LED_ON = LOW;
const int LED_OFF = HIGH;

// Network configuration - adjust to match your LAN and Node-RED host.
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };
IPAddress boardIp(192, 168, 1, 177);   // static fallback if DHCP fails
IPAddress nodeRedIp(192, 168, 1, 246); // machine running Node-RED
const int nodeRedPort = 1880;
const char* TELEMETRY_PATH = "/aftershock/telemetry";
const char* FELT_REPORT_PATH = "/aftershock/felt-report";
const char* RESOLVE_PATH = "/aftershock/resolve";

EthernetServer server(80); // alert commands from Node-RED

// 0 = idle, 1 = medium, 2 = critical. Set via GET /alert?level=N.
int alertLevel = 0;

// Debounce: lastRawButtonState is the raw pin reading, stableButtonState is
// the debounced value the rest of the code uses.
int lastRawButtonState = HIGH;
int stableButtonState = HIGH;
unsigned long lastButtonChangeMs = 0;
const unsigned long DEBOUNCE_MS = 50;

unsigned long lastTelemetryMs = 0;

const unsigned long TELEMETRY_INTERVAL_MS = 5000;

unsigned long lastBlinkMs = 0;
bool blinkOn = false;

unsigned long lastHeartbeatMs = 0;
bool heartbeatOn = false;

void setup() {
  Serial.begin(9600);

  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_BLUE, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_BUTTON_ACK, INPUT_PULLUP);

  if (Ethernet.begin(mac) == 0) {
    Serial.println("DHCP failed, falling back to static IP");
    Ethernet.begin(mac, boardIp);
  }
  server.begin();

  Serial.print("Base station ready at ");
  Serial.println(Ethernet.localIP());
}

void loop() {
  // No delay() in this loop or anything it calls - the server must stay
  // responsive to incoming alert commands.
  handleIncomingCommand();
  handleButton();
  sendTelemetryIfDue();
  updateOutputs();
}

// GET /alert?level=0|1|2 from Node-RED.
void handleIncomingCommand() {
  EthernetClient client = server.available();
  if (!client) return;

  String requestLine = client.readStringUntil('\n');
  while (client.connected() && client.available()) {
    client.readStringUntil('\n');
  }

  int levelIndex = requestLine.indexOf("level=");
  if (requestLine.startsWith("GET /alert") && levelIndex != -1) {
    int newLevel = requestLine.charAt(levelIndex + 6) - '0';
    if (newLevel >= 0 && newLevel <= 2) {
      alertLevel = newLevel;
      Serial.print("Alert level set to ");
      Serial.println(alertLevel);
    }
  }

  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: text/plain");
  client.println("Content-Length: 2");
  client.println("Connection: close");
  client.println();
  client.print("OK");
  client.flush();
  delay(1);
  client.stop();
}

// Idle + press = manual felt-report. Alerting + press = resolve.
void handleButton() {
  int reading = digitalRead(PIN_BUTTON_ACK);
  if (reading != lastRawButtonState) {
    lastButtonChangeMs = millis();
    lastRawButtonState = reading;
  }

  if (millis() - lastButtonChangeMs > DEBOUNCE_MS && stableButtonState != lastRawButtonState) {
    stableButtonState = lastRawButtonState;
    if (stableButtonState == LOW) {
      if (alertLevel > 0) {
        resolveIncident();
      } else {
        sendFeltReport();
      }
    }
  }
}

void resolveIncident() {
  alertLevel = 0;
  String body = "{\"source\":\"button\"}";
  postJson(RESOLVE_PATH, body);
}

void sendTelemetryIfDue() {
  if (millis() - lastTelemetryMs < TELEMETRY_INTERVAL_MS) return;
  lastTelemetryMs = millis();

  int potValue = analogRead(PIN_POT);
  // 1.50g-4.00g threshold, sent as centi-g (150-400).
  int thresholdCentiG = map(potValue, 0, 1023, 150, 400);

  String body = "{";
  body += "\"thresholdCentiG\":" + String(thresholdCentiG) + ",";
  body += "\"alertLevel\":" + String(alertLevel);
  body += "}";

  postJson(TELEMETRY_PATH, body);
}

void sendFeltReport() {
  String body = "{\"source\":\"button\"}";
  postJson(FELT_REPORT_PATH, body);
}

// Fire-and-forget POST - does not wait for or read the response.
void postJson(const char* path, const String& body) {
  EthernetClient client;
  if (!client.connect(nodeRedIp, nodeRedPort)) {
    Serial.println("Could not reach Node-RED");
    return;
  }

  client.print("POST ");
  client.print(path);
  client.println(" HTTP/1.1");
  client.print("Host: ");
  client.println(nodeRedIp);
  client.println("Content-Type: application/json");
  client.print("Content-Length: ");
  client.println(body.length());
  client.println("Connection: close");
  client.println();
  client.println(body);

  client.stop();
}

void updateOutputs() {
  // Heartbeat: blue LED, 1s interval, independent of alert state.
  if (millis() - lastHeartbeatMs > 1000) {
    lastHeartbeatMs = millis();
    heartbeatOn = !heartbeatOn;
  }
  digitalWrite(PIN_LED_BLUE, heartbeatOn ? LED_ON : LED_OFF);

  if (alertLevel == 0) {
    digitalWrite(PIN_LED_GREEN, LED_ON);
    digitalWrite(PIN_LED_RED, LED_OFF);
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_RELAY, LOW);
    return;
  }

  digitalWrite(PIN_LED_GREEN, LED_OFF);

  unsigned long blinkInterval = (alertLevel == 2) ? 150 : 500; // critical blinks faster
  if (millis() - lastBlinkMs > blinkInterval) {
    lastBlinkMs = millis();
    blinkOn = !blinkOn;
  }

  digitalWrite(PIN_LED_RED, blinkOn ? LED_ON : LED_OFF); // plain on/off, no PWM
  digitalWrite(PIN_BUZZER, blinkOn ? HIGH : LOW);
  digitalWrite(PIN_RELAY, alertLevel == 2 ? HIGH : LOW); // relay: critical only
}
