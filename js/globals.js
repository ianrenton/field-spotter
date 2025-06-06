/////////////////////////////
//        CONSTANTS        //
/////////////////////////////
// noinspection HttpUrlsUsage

const POTA_SPOTS_URL = "https://api.pota.app/spot/activator";
const POTA_POST_SPOT_URL = "https://api.pota.app/spot";
const SOTA_SPOTS_URL = "https://api-db2.sota.org.uk/api/spots/60/all/all";
const SOTA_SUMMIT_URL_ROOT = "https://api-db2.sota.org.uk/api/summits/";
const SOTA_EPOCH_URL = "https://api-db2.sota.org.uk/api/spots/epoch";
const WWFF_SPOTS_URL = "https://spots.wwff.co/static/spots.json";
const GMA_SPOTS_URL = "https://www.cqgma.org/api/spots/25/";
const GMA_REF_INFO_URL_ROOT = "https://www.cqgma.org/api/ref/?";
const WWBOTA_SPOTS_URL = "https://api.wwbota.org/spots/?age=2";
const IP_LOOKUP_URL = "https://api.ipify.org/?format=json";
const GEOLOCATION_API_URL = "https://api.hackertarget.com/geoip/?output=json&q=";
const BASEMAP_LIGHT = "CartoDB.Voyager";
const BASEMAP_DARK = "CartoDB.DarkMatter";
const BASEMAP_OPACITY = 1.0;
const BANDS = [
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
const WAB_SQUARES_LARGE_GB = ["HP", "HT", "HU", "HW", "HX", "HY", "HZ", "NA", "NB", "NC", "ND", "NF", "NG", "NH", "NJ", "NK", "NL", "NM", "NN", "NO", "NR", "NS", "NT", "NU", "NW", "NX", "NY", "NZ", "OV", "SC", "SD", "SE", "SH", "SJ", "SK", "SM", "SN", "SO", "SP", "SR", "SS", "ST", "SU", "SV", "SW", "SX", "SY", "SZ", "TA", "TF", "TG", "TL", "TM", "TR", "TQ", "TV"];
const WAB_SQUARES_LARGE_NI = ["C", "D", "G", "H", "J"];
const WAB_SQUARES_LARGE_CI = ["WA", "WV"];


/////////////////////////////
//      DATA STORAGE       //
/////////////////////////////

const spots = new Map(); // uid -> spot data
const markers = new Map(); // uid -> marker
let lastUpdateTime = moment(0);
let myPos = null;
let map;
let backgroundTileLayer;
let markersLayer;
let ownPosLayer;
let ownPosMarker;
let oms;
let globalPopup;
let terminator;
let maidenheadGrid;
let wabGrid;
let lastSeenSOTAAPIEpoch = "";
let currentPopupSpotUID = null;
let currentLineToSpot = null;
let alreadyMovedMap = false;
let wabLayerLastDetailLevel = -1; // track changes in detail level required based on map zoom
const onMobile = window.matchMedia('screen and (max-width: 800px)').matches;


/////////////////////////////
//  UI CONFIGURABLE VARS   //
/////////////////////////////

// These are all parameters that can be changed by the user by clicking buttons on the GUI,
// and are persisted in local storage.
let programs = ["POTA", "SOTA", "WWFF", "GMA", "Bunkers", "IOTA", "Castles", "Lighthouses", "Mills"];
let modes = ["Phone", "CW", "Digi"];
let bands = ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "4m", "2m", "70cm", "23cm", "13cm"];
let updateIntervalMin = 5;
let maxSpotAgeMin = 60;
let showQRT = false;
let showPreQSY = false;
let qsyOldSpotBehaviour = "show"; // Allowed values: "show", "grey", "10mingrace". Only honoured if showPreQSY = true.
let darkMode = false;
let passiveDisplay = false;
let enableAnimation = true;
let showTerminator = true;
let showMaidenheadGrid = false;
let showWABGrid = false;
let linkToCallsignLookupServiceEnabled = true;
let linkToProgramRefEnabled = true;
let sotaLinksTo = "Sotlas" // Allowed values: "Sotlas", "Sotadata". Only honoured if linkToProgramRefEnabled = true.
let callsignLookupService = "QRZ"; // Allowed values: "QRZ", "HamQTH". Only honoured if linkToCallsignLookupServiceEnabled = true.
let linkToWebSDREnabled = false;
let linkToWebSDRURL = "http://websdr.ewi.utwente.nl:8901/";
let webSDRRequiresCWOffset = false;
let webSDRKiwiMode = false;
let respottingEnabled = false;
let myCallsign = ""; // For spotting
let ownPosOverride = null; // LatLng. Set if own position override is set or loaded from localstorage. If null, myPos will be set from browser geolocation or GeoIP lookup.


/////////////////////////////
//     OS GRID LIBRARY     //
/////////////////////////////

// There is an open source library for transforming between WGS84 and Ordnance Survey grid references,
// but it is only available as a module, so we need some workarounds to load it in our non-modular code.
// It's loaded dynamically so we need to handle when it finishes loading asynchronously. We also wrap
// its functions in our own (in utility-funcs.js) to avoid having to interact with the module's exports
// directly from other places.
let osGridLibrary;
import("./modules/osgridref.js")
    .then(module => {
        osGridLibrary = module;
        if (ieGridLibrary && utmLibrary) {
            regenerateWABGridLayer();
        }
    })
    .catch(error => {
        console.log("Error loading OS Grid Ref library, GB WAB squares may not be available.");
        console.log(error);
    });
let ieGridLibrary;
import("./modules/iegridref.js")
    .then(module => {
        ieGridLibrary = module;
        if (osGridLibrary && utmLibrary) {
            regenerateWABGridLayer();
        }
    })
    .catch(error => {
        console.log("Error loading IE Grid Ref library, NI WAB squares may not be available.");
        console.log(error);
    });
let utmLibrary;
import("./modules/utm_ci.js")
    .then(module => {
        utmLibrary = module;
        if (osGridLibrary && ieGridLibrary) {
            regenerateWABGridLayer();
        }
    })
    .catch(error => {
        console.log("Error loading UTM library, Channel Islands WAB squares may not be available.");
        console.log(error);
    });