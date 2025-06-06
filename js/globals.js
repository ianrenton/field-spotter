/////////////////////////////
//        CONSTANTS        //
/////////////////////////////
// noinspection HttpUrlsUsage

export const POTA_SPOTS_URL = "https://api.pota.app/spot/activator";
export const POTA_POST_SPOT_URL = "https://api.pota.app/spot";
export const SOTA_SPOTS_URL = "https://api-db2.sota.org.uk/api/spots/60/all/all";
export const SOTA_SUMMIT_URL_ROOT = "https://api-db2.sota.org.uk/api/summits/";
export const SOTA_EPOCH_URL = "https://api-db2.sota.org.uk/api/spots/epoch";
export const WWFF_SPOTS_URL = "https://spots.wwff.co/static/spots.json";
export const GMA_SPOTS_URL = "https://www.cqgma.org/api/spots/25/";
export const GMA_REF_INFO_URL_ROOT = "https://www.cqgma.org/api/ref/?";
export const WWBOTA_SPOTS_URL = "https://api.wwbota.org/spots/?age=2";
export const IP_LOOKUP_URL = "https://api.ipify.org/?format=json";
export const GEOLOCATION_API_URL = "https://api.hackertarget.com/geoip/?output=json&q=";
export const BASEMAP_LIGHT = "CartoDB.Voyager";
export const BASEMAP_DARK = "CartoDB.DarkMatter";
export const BASEMAP_OPACITY = 1.0;
export const BANDS = [
    {name: "160m", startFreq: 1.8, stopFreq: 2.0, color: "#7cfc00", contrastColor: "black"},
    {name: "80m", startFreq: 3.5, stopFreq: 4.0, color: "#e550e5", contrastColor: "black"},
    {name: "60m", startFreq: 5.25, stopFreq: 5.41, color: "#00008b", contrastColor: "white"},
    {name: "40m", startFreq: 7.0, stopFreq: 7.3, color: "#5959ff", contrastColor: "white"},
    {name: "30m", startFreq: 10.1, stopFreq: 10.15, color: "#62d962", contrastColor: "black"},
    {name: "20m", startFreq: 14.0, stopFreq: 14.35, color: "#f2c40c", contrastColor: "black"},
    {name: "17m", startFreq: 18.068, stopFreq: 18.168, color: "#f2f261", contrastColor: "black"},
    {name: "15m", startFreq: 21.0, stopFreq: 21.45, color: "#cca166", contrastColor: "black"},
    {name: "12m", startFreq: 24.89, stopFreq: 24.99, color: "#b22222", contrastColor: "white"},
    {name: "10m", startFreq: 28.0, stopFreq: 29.7, color: "#ff69b4", contrastColor: "black"},
    {name: "6m", startFreq: 50.0, stopFreq: 54.0, color: "#FF0000", contrastColor: "white"},
    {name: "4m", startFreq: 70.0, stopFreq: 70.5, color: "#cc0044", contrastColor: "white"},
    {name: "2m", startFreq: 144.0, stopFreq: 148.0, color: "#FF1493", contrastColor: "black"},
    {name: "70cm", startFreq: 420.0, stopFreq: 450.0, color: "#999900", contrastColor: "white"},
    {name: "23cm", startFreq: 1240.0, stopFreq: 1325.0, color: "#5AB8C7", contrastColor: "black"},
    {name: "13cm", startFreq: 2300.0, stopFreq: 2450.0, color: "#FF7F50", contrastColor: "black"}];


/////////////////////////////
//      DATA STORAGE       //
/////////////////////////////

export const spots = new Map(); // uid -> spot data
export const markers = new Map(); // uid -> marker
export let lastUpdateTime = moment(0);
export let myPos = null;
export let map;
export let backgroundTileLayer;
export let markersLayer;
export let ownPosLayer;
export let ownPosMarker;
export let oms;
export let globalPopup;
export let terminator;
export let maidenheadGrid;
export let wabGrid;
export let lastSeenSOTAAPIEpoch = "";
export let currentPopupSpotUID = null;
export let currentLineToSpot = null;
export let alreadyMovedMap = false;
export const onMobile = window.matchMedia('screen and (max-width: 800px)').matches;


/////////////////////////////
//  UI CONFIGURABLE VARS   //
/////////////////////////////

// These are all parameters that can be changed by the user by clicking buttons on the GUI,
// and are persisted in local storage.
export let programs = ["POTA", "SOTA", "WWFF", "GMA", "Bunkers", "IOTA", "Castles", "Lighthouses", "Mills"];
export let modes = ["Phone", "CW", "Digi"];
export let bands = ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "4m", "2m", "70cm", "23cm", "13cm"];
export let updateIntervalMin = 5;
export let maxSpotAgeMin = 60;
export let showQRT = false;
export let showPreQSY = false;
export let qsyOldSpotBehaviour = "show"; // Allowed values: "show", "grey", "10mingrace". Only honoured if showPreQSY = true.
export let darkMode = false;
export let passiveDisplay = false;
export let enableAnimation = true;
export let showTerminator = true;
export let showMaidenheadGrid = false;
export let showWABGrid = false;
export let linkToCallsignLookupServiceEnabled = true;
export let linkToProgramRefEnabled = true;
export let sotaLinksTo = "Sotlas" // Allowed values: "Sotlas", "Sotadata". Only honoured if linkToProgramRefEnabled = true.
export let callsignLookupService = "QRZ"; // Allowed values: "QRZ", "HamQTH". Only honoured if linkToCallsignLookupServiceEnabled = true.
export let linkToWebSDREnabled = false;
export let linkToWebSDRURL = "http://websdr.ewi.utwente.nl:8901/";
export let webSDRRequiresCWOffset = false;
export let webSDRKiwiMode = false;
export let respottingEnabled = false;
export let myCallsign = ""; // For spotting
export let ownPosOverride = null; // LatLng. Set if own position override is set or loaded from localstorage. If null, myPos will be set from browser geolocation or GeoIP lookup.
