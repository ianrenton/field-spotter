/////////////////////////////
//        CONSTANTS        //
/////////////////////////////

const POTA_SPOTS_URL = "https://api.pota.app/spot/activator";
const POTA_POST_SPOT_URL = "https://api.pota.app/spot"
const SOTA_SPOTS_URL = "https://api-db2.sota.org.uk/api/spots/60/all/all";
const SOTA_SUMMIT_URL_ROOT = "https://api-db2.sota.org.uk/api/summits/";
const SOTA_EPOCH_URL = "https://api-db2.sota.org.uk/api/spots/epoch"
const WWFF_SPOTS_URL = "https://www.cqgma.org/api/spots/wwff/";
const GMA_SPOTS_URL = "https://www.cqgma.org/api/spots/25/"
const GMA_REF_INFO_URL_ROOT = "https://www.cqgma.org/api/ref/?"
const BASEMAP_LIGHT = "CartoDB.Voyager";
const BASEMAP_DARK = "CartoDB.DarkMatter";
const BASEMAP_OPACITY = 1.0;
const BANDS = [
{ name: "160m", startFreq: 1.8, stopFreq: 2.0, color: "#7cfc00", contrastColor: "black" },
{ name: "80m", startFreq: 3.5, stopFreq: 4.0, color: "#e550e5", contrastColor: "black" },
{ name: "60m", startFreq: 5.25, stopFreq: 5.41, color: "#00008b", contrastColor: "white" },
{ name: "40m", startFreq: 7.0, stopFreq: 7.3, color: "#5959ff", contrastColor: "white" },
{ name: "30m", startFreq: 10.1, stopFreq: 10.15, color: "#62d962", contrastColor: "black" },
{ name: "20m", startFreq: 14.0, stopFreq: 14.35, color: "#f2c40c", contrastColor: "black" },
{ name: "17m", startFreq: 18.068, stopFreq: 18.168, color: "#f2f261", contrastColor: "black" },
{ name: "15m", startFreq: 21.0, stopFreq: 21.45, color: "#cca166", contrastColor: "black" },
{ name: "12m", startFreq: 24.89, stopFreq: 24.99, color: "#b22222", contrastColor: "white" },
{ name: "10m", startFreq: 28.0, stopFreq: 29.7, color: "#ff69b4", contrastColor: "black" },
{ name: "6m", startFreq: 50.0, stopFreq: 54.0, color: "#FF0000", contrastColor: "white" },
{ name: "4m", startFreq: 70.0, stopFreq: 70.5, color: "#cc0044", contrastColor: "white" },
{ name: "2m", startFreq: 144.0, stopFreq: 148.0, color: "#FF1493", contrastColor: "black" },
{ name: "70cm", startFreq: 420.0, stopFreq: 450.0, color: "#999900", contrastColor: "white" },
{ name: "23cm", startFreq: 1240.0, stopFreq: 1325.0, color: "#5AB8C7", contrastColor: "black" },
{ name: "13cm", startFreq: 2300.0, stopFreq: 2450.0, color: "#FF7F50", contrastColor: "black" }];


/////////////////////////////
//      DATA STORAGE       //
/////////////////////////////

var spots = new Map(); // uid -> spot data
var markers = new Map(); // uid -> marker
var lastUpdateTime = moment(0);
var myPos = null;
var map;
var backgroundTileLayer;
var markersLayer;
var ownPosLayer;
var ownPosMarker;
var oms;
var globalPopup;
var terminator;
var lastSeenSOTAAPIEpoch = "";
var currentPopupSpotUID = null;
var currentLineToSpot = null;
var alreadyMovedMap = false;
var onMobile = window.matchMedia('screen and (max-width: 800px)').matches;


/////////////////////////////
//  UI CONFIGURABLE VARS   //
/////////////////////////////

// These are all parameters that can be changed by the user by clicking buttons on the GUI,
// and are persisted in local storage.
var programs = ["POTA", "SOTA", "WWFF", "GMA", "IOTA", "Castles", "Lighthouses", "Mills"];
var modes = ["Phone", "CW", "Digi"];
var bands = ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "4m", "2m", "70cm", "23cm", "13cm"];
var updateIntervalMin = 5;
var maxSpotAgeMin = 60;
var showQRT = false;
var showPreQSY = false;
var qsyOldSpotBehaviour = "show"; // Allowed values: "show", "grey", "10mingrace". Only honoured if showPreQSY = true.
var darkMode = false;
var passiveDisplay = false;
var enableAnimation = true;
var linkToCallsignLookupServiceEnabled = true;
var linkToProgramRefEnabled = true;
var callsignLookupService = "QRZ"; // Allowed values: "QRZ", "HamQTH". Only honoured if linkToCallsignLookupServiceEnabled = true.
var linkToWebSDREnabled = false;
var linkToWebSDRURL = "http://websdr.ewi.utwente.nl:8901/";
var respottingEnabled = false;
var myCallsign = ""; // For spotting