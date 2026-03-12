// ── i18n ──
var i18n = {
  fr: {
    headerTitle: 'Flux de messages',
    headerSubtitle: 'Communication inter-managers',
    cycleBtn: 'Cycle complet',
    historyBtn: 'Lecture historique',
    nextBtn: 'Suivant',
    prevBtn: 'Precedent',
    startBtn: 'Demarrer',
    speedLabel: 'Vitesse',
    idleMsg: 'Choisissez un scenario pour demarrer l\'animation.',
    subTableTitle: 'Table d\'abonnements (EV)',
    piTitle: 'Process Image (EV — RAM)',
    thManager: 'Manager',
    legendRequest: 'Requete / dpSet',
    legendNotify: 'Notification',
    legendResponse: 'Reponse / Callback',
    legendPersist: 'Persistance',
    legendArchive: 'Online Change (NGA \u2192 PostgreSQL)',
    legendOpcua: 'OPC UA (terrain)',
    kafkaBtn: 'Node.js \u2192 Kafka',
    mcpBtn: 'Claude AI (MCP)',
    legendKafka: 'Kafka (streaming)',
    legendMcp: 'MCP / Claude AI',
    menuSubtitle: 'Choisissez un scenario',
    tile_dpGet: 'Lecture ponctuelle d\'une valeur depuis la process image (RAM).',
    tile_dpSet: 'Ecriture d\'une consigne operateur vers tous les managers abonnes.',
    tile_dpConnect: 'Abonnement publish/subscribe a un datapoint.',
    tile_plcLive: 'Donnees spontanees du PLC, notification push temps reel.',
    tile_cycle: 'Cycle complet de regulation du four avec 2 UIs.',
    tile_history: 'Lecture de l\'historique via NGA et PostgreSQL.',
    tile_kafka: 'Streaming vers Kafka pour maintenance predictive.',
    tile_mcp: 'Optimisation PID via Claude Desktop App et MCP.',
    tile_uns: 'Architecture Unified Namespace (UNS) via MQTT.',
    intro_dpGet: 'Lecture ponctuelle d\'une valeur. Le CTRL PID envoie une requete dpGet a l\'Event Manager, qui lit la valeur dans sa process image (RAM) et la retourne immediatement. Aucun abonnement n\'est cree.',
    intro_dpSet: 'Ecriture d\'une consigne operateur. Le UI Panel envoie un dpSet qui traverse l\'Event Manager, la persistance (DM/SQLite), l\'archivage (NGA/PostgreSQL), notifie tous les managers abonnes (CTRL PID, Driver, autres UIs), et descend jusqu\'a l\'automate via OPC UA.',
    intro_dpConnect: 'Abonnement publication/souscription. Le UI Panel s\'abonne a un DPE. L\'Event Manager enregistre l\'abonnement, envoie la valeur initiale, puis notifiera automatiquement le panel a chaque changement futur.',
    intro_plcLive: 'Donnees spontanees du PLC. La temperature change dans l\'automate et remonte automatiquement via le Driver vers l\'Event Manager, qui distribue par multicast a tous les managers abonnes (CTRL PID, UIs). Aucun polling — notification push temps reel.',
    intro_cycle: 'Cycle complet de regulation du four : le Driver lit la temperature, l\'Event Manager distribue aux managers abonnes, le CTRL PID calcule la commande, le Driver envoie vers l\'automate. Illustre le fonctionnement temps reel de WinCC OA avec 2 UI Managers (Operator + Monitoring).',
    intro_history: 'Lecture de l\'historique via NGA. Le UI Trends demande les 2 dernieres heures de TC_101.temperature. La requete traverse l\'Event Manager vers le NGA Frontend, qui interroge PostgreSQL, puis retourne les donnees par le chemin inverse.',
    intro_kafka: 'Streaming vers Kafka pour maintenance predictive. Le JS Manager collecte les donnees du four (temperature, vibrations) et les publie sur un topic Kafka. Un service ML detecte une anomalie de vibration et renvoie une alerte vers WinCC OA.',
    intro_mcp: 'Optimisation PID via Claude Desktop App et MCP. L\'ingenieur maintenance demande a Claude d\'analyser les performances PID du four. Via le protocole MCP, le serveur passerelle Node.js lit les parametres PID et les tendances sur l\'Event Manager. Claude analyse les courbes et propose un reglage optimise.',
    intro_uns: 'Architecture Unified Namespace (UNS) via MQTT. Le MQTT Publisher natif de WinCC OA publie les changements de datapoints vers un broker MQTT (Mosquitto). Le MES s\'abonne aux donnees de production (cycle, pieces), le Cloud Historian a toutes les donnees brutes. Aucune integration point-a-point.',
  },
  en: {
    headerTitle: 'Message Flow',
    headerSubtitle: 'Inter-manager communication',
    cycleBtn: 'Full cycle',
    historyBtn: 'History read',
    nextBtn: 'Next',
    prevBtn: 'Previous',
    startBtn: 'Start',
    speedLabel: 'Speed',
    idleMsg: 'Choose a scenario to start the animation.',
    subTableTitle: 'Subscription Table (EV)',
    piTitle: 'Process Image (EV — RAM)',
    thManager: 'Manager',
    legendRequest: 'Request / dpSet',
    legendNotify: 'Notification',
    legendResponse: 'Response / Callback',
    legendPersist: 'Persistence',
    legendArchive: 'Online Change (NGA \u2192 PostgreSQL)',
    legendOpcua: 'OPC UA (field)',
    kafkaBtn: 'Node.js \u2192 Kafka',
    mcpBtn: 'Claude AI (MCP)',
    legendKafka: 'Kafka (streaming)',
    legendMcp: 'MCP / Claude AI',
    menuSubtitle: 'Choose a scenario',
    tile_dpGet: 'One-time value read from the process image (RAM).',
    tile_dpSet: 'Operator setpoint write to all subscribed managers.',
    tile_dpConnect: 'Publish/subscribe subscription to a datapoint.',
    tile_plcLive: 'Spontaneous PLC data, real-time push notifications.',
    tile_cycle: 'Full furnace regulation cycle with 2 UIs.',
    tile_history: 'History read via NGA and PostgreSQL.',
    tile_kafka: 'Kafka streaming for predictive maintenance.',
    tile_mcp: 'PID optimization via Claude Desktop App and MCP.',
    tile_uns: 'Unified Namespace (UNS) architecture via MQTT.',
    intro_dpGet: 'One-time value read. CTRL PID sends a dpGet request to the Event Manager, which reads the value from its process image (RAM) and returns it immediately. No subscription is created.',
    intro_dpSet: 'Operator setpoint write. The UI Panel sends a dpSet that traverses the Event Manager, persistence (DM/SQLite), archiving (NGA/PostgreSQL), notifies all subscribed managers (CTRL PID, Driver, other UIs), and reaches the PLC via OPC UA.',
    intro_dpConnect: 'Publish/subscribe subscription. The UI Panel subscribes to a DPE. The Event Manager registers the subscription, sends the initial value, then will automatically notify the panel on every future change.',
    intro_plcLive: 'Spontaneous PLC data. Temperature changes in the PLC and flows automatically via the Driver to the Event Manager, which multicasts to all subscribed managers (CTRL PID, UIs). No polling — real-time push notifications.',
    intro_cycle: 'Full furnace regulation cycle: Driver reads temperature, Event Manager distributes to subscribed managers, CTRL PID computes the command, Driver sends to PLC. Demonstrates WinCC OA real-time operation with 2 UI Managers (Operator + Monitoring).',
    intro_history: 'History read via NGA. The UI Trends panel requests the last 2 hours of TC_101.temperature. The request flows through Event Manager to NGA Frontend, which queries PostgreSQL, then returns data via the reverse path.',
    intro_kafka: 'Kafka streaming for predictive maintenance. JS Manager collects furnace data (temperature, vibrations) and publishes to a Kafka topic. An ML service detects a vibration anomaly and sends an alert back to WinCC OA.',
    intro_mcp: 'PID optimization via Claude Desktop App and MCP. The maintenance engineer asks Claude to analyze furnace PID performance. Via the MCP protocol, the Node.js gateway reads PID parameters and trends from the Event Manager. Claude analyzes the curves and suggests optimized tuning.',
    intro_uns: 'Unified Namespace (UNS) architecture via MQTT. The WinCC OA native MQTT Publisher publishes datapoint changes to an MQTT broker (Mosquitto). MES subscribes to production data (cycle, parts), Cloud Historian to all raw data. No point-to-point integration needed.',
  }
};

// Detect browser locale: use 'fr' if navigator language starts with 'fr', otherwise default to 'en'
var detectedLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
var currentLang = detectedLang;

function t(key) {
  return i18n[currentLang][key] || i18n['en'][key] || key;
}

function setLang(lang) {
  currentLang = lang;
  document.getElementById('lang-fr').className = 'lang-btn' + (lang === 'fr' ? ' active' : '');
  document.getElementById('lang-en').className = 'lang-btn' + (lang === 'en' ? ' active' : '');
  document.documentElement.lang = lang;
  updateStaticUI();
}

// Apply detected language on load
document.addEventListener('DOMContentLoaded', function() { setLang(detectedLang); });

function updateStaticUI() {
  // Only the step descriptions and scenario intros change with language
  // UI labels (buttons, legend, panel titles) are fixed in English
  // If a scenario intro is visible, refresh it
  if (pendingScenario) {
    var introDesc = document.getElementById('intro-desc');
    if (introDesc) introDesc.innerHTML = t('intro_' + pendingScenario);
  }
}
