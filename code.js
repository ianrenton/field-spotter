/////////////////////////////
//        CONSTANTS        //
/////////////////////////////

const VERSION = "0.1";
const POTA_SPOTS_URL = "https://api.pota.app/spot/activator";
// @todo configurable time period?
const SOTA_SPOTS_URL = "https://api2.sota.org.uk/api/spots/-2/all";
const SOTA_SUMMIT_URL_ROOT = "https://api2.sota.org.uk/api/summits/";
const BASEMAP_NAME = "Esri.NatGeoWorldMap";
const BASEMAP_OPACITY = 0.5;
const BANDS = [
{ name: "160m", startFreq: 1.8, stopFreq: 2.0, color: "#7cfc00" },
{ name: "80m", startFreq: 3.5, stopFreq: 4.0, color: "#e550e5" },
{ name: "60m", startFreq: 5.25, stopFreq: 5.41, color: "#00008b" },
{ name: "40m", startFreq: 7.0, stopFreq: 7.3, color: "#5959ff" },
{ name: "30m", startFreq: 10.1, stopFreq: 10.15, color: "#62d962" },
{ name: "20m", startFreq: 14.0, stopFreq: 14.35, color: "#f2c40c" },
{ name: "17m", startFreq: 18.068, stopFreq: 18.168, color: "#f2f261" },
{ name: "15m", startFreq: 21.0, stopFreq: 21.45, color: "#cca166" },
{ name: "12m", startFreq: 24.89, stopFreq: 24.99, color: "#b22222" },
{ name: "10m", startFreq: 28.0, stopFreq: 29.7, color: "#ff69b4" },
{ name: "6m", startFreq: 50.0, stopFreq: 54.0, color: "#FF0000" },
{ name: "4m", startFreq: 70.0, stopFreq: 70.5, color: "#cc0044" },
{ name: "2m", startFreq: 144.0, stopFreq: 148.0, color: "#FF1493" },
{ name: "70cm", startFreq: 420.0, stopFreq: 450.0, color: "#999900" }];


/////////////////////////////
//      DATA STORAGE       //
/////////////////////////////

var spots = new Map(); // uid -> spot data
var markers = new Map(); // uid -> marker
var onMobile = window.matchMedia('screen and (max-width: 800px)').matches;
var lastQueryTime = moment();
var myPos = null;


/////////////////////////////
//  UI CONFIGURABLE VARS   //
/////////////////////////////

// These are all parameters that can be changed by the user by clicking buttons on the GUI,
// and are persisted in local storage.
var modes = [];
var bands = [];
var maxSpotAgeSec = 7200;


/////////////////////////////
//   API CALL FUNCTIONS    //
/////////////////////////////

// Kick off by fetching POTA and SOTA data
function fetchData() {
  fetchPOTAData();
  fetchSOTAData();
}

// Fetch POTA data, updating the internal data model and the map on success, updating the status icon appropriately
function fetchPOTAData() {
  $("#potaStatus").attr("class","menubuttonloading");
  $("#potaStatusIcon").attr("src","icons/loading.png");
  $.ajax({
    url: POTA_SPOTS_URL,
    dataType: 'json',
    timeout: 10000,
    success: async function(result) {
      handlePOTAData(result);
      updateMapObjects();
      $("#potaStatus").attr("class","menubuttongood");
      $("#potaStatusIcon").attr("src","icons/ok.png");
    },
    error: function() {
      $("#potaStatus").attr("class","menubuttonerror");
      $("#potaStatusIcon").attr("src","icons/failed.png");
    }
  });
}

// Fetch SOTA data, updating the internal data model and the map on success, updating the status icon appropriately
function fetchSOTAData() {
  $("#sotaStatus").attr("class","menubuttonloading");
  $("#sotaStatusIcon").attr("src","icons/loading.png");
  $.ajax({
    url: SOTA_SPOTS_URL,
    dataType: 'json',
    timeout: 10000,
    success: async function(result) {
      handleSOTAData(result);
      updateMapObjects();
      $("#sotaStatus").attr("class","menubuttongood");
      $("#sotaStatusIcon").attr("src","icons/ok.png");
    },
    error: function() {
      $("#sotaStatus").attr("class","menubuttonerror");
      $("#sotaStatusIcon").attr("src","icons/failed.png");
    }
  });
}


/////////////////////////////
// DATA HANDLING FUNCTIONS //
/////////////////////////////

// Interpret POTA data and update the internal data model
async function handlePOTAData(result) {
  // Clear existing POTA spots from the internal list
  Object.keys(spots).forEach(function (k) {
      if (spots[k].program === "POTA") {
          delete spots[k];
      }
  });

  // Add the retrieved spots to the list
  spotUpdate = objectToMap(result);
  spotUpdate.forEach(spot => {
    var uid = "POTA-" + spot.spotId
    var newSpot = {
      uid: uid,
      lat: spot.latitude,
      lon: spot.longitude,
      ref: spot.reference,
      refName: spot.name,
      activator: spot.activator,
      mode: spot.mode,
      freq: spot.frequency / 1000.0,
      band: freqToBand(spot.frequency / 1000.0),
      time: moment.utc(spot.spotTime),
      comment: spot.comment,
      program: "POTA"
    }
    spots.set(uid, newSpot);
  });
}

// Interpret SOTA data and update the internal data model
async function handleSOTAData(result) {
  // Clear existing SOTA spots from the internal list
  Object.keys(spots).forEach(function (k) {
      if (spots[k].program === "SOTA") {
          delete spots[k];
      }
  });

  // Add the retrieved spots to the list
  spotUpdate = objectToMap(result);
  spotUpdate.forEach(spot => {
    var uid = "SOTA-" + spot.id

    var newSpot = {
      uid: uid,
      ref: spot.associationCode + "/" + spot.summitCode,
      refName: spot.summitDetails,
      activator: spot.activatorCallsign,
      mode: spot.mode,
      freq: spot.frequency,
      band: freqToBand(spot.frequency),
      time: moment.utc(spot.timeStamp),
      comment: spot.comments,
      program: "SOTA"
    }
    spots.set(uid, newSpot);


    // For SOTA we have to separately look up the summit to get the lat/long, so trigger that call
    $.ajax({
      url: SOTA_SUMMIT_URL_ROOT + spot.associationCode + "/" + spot.summitCode,
      dataType: 'json',
      timeout: 10000,
      success: async function(result) {
        if (result != null) {
          summitData = objectToMap(result);
          updateSpot = spots.get(uid)
          updateSpot.lat = summitData.get("latitude");
          updateSpot.lon = summitData.get("longitude");
          updateSpot.refName = summitData.get("name");
          spots.set(uid, updateSpot);
          updateMapObjects();
        }
      }
    });
  });
}


/////////////////////////////
//   UI UPDATE FUNCTIONS   //
/////////////////////////////

// Update the objects that are rendered on the map. Clear old markers and draw new ones. This is
// called when the data model changes due to a server query.
async function updateMapObjects() {
  // Iterate through spots. For each, update an existing marker
  // or create a new marker if required.
  spots.forEach(function(t) {
    var pos = getIconPosition(t);

    // @todo filter on band, mode and age

    if (markers.has(t.uid) && pos != null) {
      var m = markers.get(t.uid);

      // Regenerate marker color & text in case the spot has updated
      m.setIcon(getMarker(t));
      m.tooltip = getTooltipText(t);

      // Set opacity with age
      age = moment().diff(t.time, 'seconds');
      opacity = ((maxSpotAgeSec - age) / maxSpotAgeSec / 2.0) + 0.5;
      m.setOpacity(opacity);

    } else if (pos != null) {
      // No existing marker, data is valid, so create
      var m = L.marker(pos, {icon: getMarker(t)});

      // Add to map and spiderfier
      markersLayer.addLayer(m);
      oms.addMarker(m);

      // Set tooltip
      m.tooltip = getTooltipText(t);

      // Set opacity with age
      age = moment().diff(t.time, 'seconds');
      opacity = ((maxSpotAgeSec - age) / maxSpotAgeSec / 2.0) + 0.5;
      m.setOpacity(opacity);

      // Add to internal data store
      markers.set(t.uid, m);
    }
  });

  // Iterate through markers. If one corresponds to a dropped spot, delete it
  markers.forEach(function(marker, uid, map) {
    if (!spots.has(uid)) {
      markersLayer.removeLayer(marker);
      markers.delete(uid);
    }
  });
}



/////////////////////////////
//  SPOT DISPLAY FUNCTIONS //
/////////////////////////////

function getTooltipText(t) {
  ttt = "<i class='fa-solid fa-user'></i> " + t.activator + "<br/>";
  ttt += "<span style='white-space:nowrap; display:inline-block;'>";
  if (t.program == "SOTA") {
    ttt += "<i class='fa-solid fa-mountain'></i> ";
  } else {
    ttt += "<i class='fa-solid fa-tree'></i> ";
  }

  ttt += t.ref + " " + t.refName + "</span><br/>";
  ttt += "<i class='fa-solid fa-walkie-talkie'></i> " + t.freq + " MHz (" + t.band + ")<br/>";
  if (myPos != null) {
    spotLatLng = new L.latLng(t["lat"], t["lon"])
    bearing = L.GeometryUtil.bearing(myPos, spotLatLng);
    if (bearing < 0) bearing = bearing + 360;
    distance = L.GeometryUtil.length([myPos, spotLatLng]) / 1000.0;
    ttt += "<i class='fa-solid fa-ruler'></i> " + distance.toFixed(0) + "km  &nbsp;&nbsp; <i class='fa-solid fa-compass'></i> " + bearing.toFixed(0) + "°<br/>";
  }
  ttt += "<i class='fa-solid fa-clock'></i> " + t.time.format("HH:mm UTC") + " (" + t.time.fromNow() + ")";
  return ttt;
}

function getIconPosition(t) {
  if (t["lat"] != null) {
    return [t["lat"], t["lon"]];
  } else {
    return null;
  }
}



/////////////////////////////
//    UTILITY FUNCTIONS    //
/////////////////////////////


// Utility to convert an object created by JSON.parse() into a proper JS map.
function objectToMap(o) {
  let m = new Map();
  for(let k of Object.keys(o)) {
    m.set(k, o[k]); 
  }
  return m;
}

// Convert a frequency in MHz to an amateur radio frequency band (expressed in wavelength as a string)
function freqToBand(f) {
  for (band of BANDS) {
    if (f >= band.startFreq && f <= band.stopFreq) {
      return band.name
    }
  }
  return "Unknown";
}

// Convert a frequency to a colour to use on marker icons.
function freqToColor(f) {
  for (band of BANDS) {
    if (f >= band.startFreq && f <= band.stopFreq) {
      return band.color
    }
  }
  return "gray";
}

// Get a marker for a spot, based on its band, using PSK Reporter colours, its program etc.
function getMarker(s) {
  return L.ExtraMarkers.icon({
    icon: (s.program == "SOTA") ? "fa-mountain" : "fa-tree",
    markerColor: freqToColor(s.freq),
    shape: 'circle',
    prefix: 'fa',
    svg: true
  });
}


/////////////////////////////
//       MAP SETUP         //
/////////////////////////////

// Create map
var map = L.map('map', {
  zoomControl: false,
  minZoom: 3,
  maxZoom: 12
});

// Request geolocation
map.setView([30, 0], 3);
function showPosition(position) {
  myPos = new L.latLng(position.coords.latitude, position.coords.longitude);
  map.setView(myPos, 5);
  // Add a marker for us
  var ownPosLayer = new L.LayerGroup();
  ownPosLayer.addTo(map);
  var m = L.marker(myPos, {icon: L.ExtraMarkers.icon({
    icon: "fa-tower-cell",
    markerColor: 'gray',
    shape: 'circle',
    prefix: 'fa',
    svg: true
  })});
  ownPosLayer.addLayer(m);
  // Update map objects to add distance and bearing to tooltips
  updateMapObjects();
}
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(showPosition);
}

// Add basemap
backgroundTileLayer = L.tileLayer.provider(BASEMAP_NAME, {
  opacity: BASEMAP_OPACITY,
  edgeBufferTiles: 1
});
backgroundTileLayer.addTo(map);
backgroundTileLayer.bringToBack();

// Add marker layer
var markersLayer = new L.LayerGroup();
markersLayer.addTo(map);

// Add spiderfier
var oms = new OverlappingMarkerSpiderfier(map, { keepSpiderfied: true, legWeight: 2.0} );
var popup = new L.Popup({offset: L.point({x: 0, y: -20}), maxWidth : 600});
oms.addListener('click', function(marker) {
  popup.setContent(marker.tooltip);
  popup.setLatLng(marker.getLatLng());
  map.openPopup(popup);
});


/////////////////////////////
//     CONTROLS SETUP      //
/////////////////////////////

// Manage boxes that slide out from the right
function manageRightBoxes(toggle, hide) {
  if ($(toggle).is(":visible")) {
    $(toggle).hide("slide", { direction: "right" }, 500);
  } else {
    var showDelay = 0;
    if ($(hide).is(":visible")) {
      $(hide).hide("slide", { direction: "right" }, 500);
      showDelay = 600;
    }
    setTimeout(function(){ $(toggle).show("slide", { direction: "right" }, 500); }, showDelay);
  }
}

$("#infoButton").click(function() {
  manageRightBoxes("#infoPanel", "#configPanel");
});
$("#configButton").click(function() {
  manageRightBoxes("#configPanel", "#infoPanel");
});


// @todo slide out bottom bands

// @todo the actual things we want to save and load, not queryInterval

// Types
function setTypeEnable(type, enable) {
  if (enable) {
    trackTypesVisible.push(type);
  } else {
    for( var i = 0; i < trackTypesVisible.length; i++){ if ( trackTypesVisible[i] === type) { trackTypesVisible.splice(i, 1); }}
  }
  localStorage.setItem('trackTypesVisible', JSON.stringify(trackTypesVisible));
  updateMapObjects();
}

$("#showAircraft").change(function() {
  setTypeEnable("AIRCRAFT", $(this).is(':checked'));
});
$("#showShips").change(function() {
  setTypeEnable("SHIP", $(this).is(':checked'));
});
$("#showAISShoreStations").change(function() {
  setTypeEnable("AIS_SHORE_STATION", $(this).is(':checked'));
});
$("#showATONs").change(function() {
  setTypeEnable("AIS_ATON", $(this).is(':checked'));
});
$("#showAPRSMobile").change(function() {
  setTypeEnable("APRS_MOBILE", $(this).is(':checked'));
});
$("#showAPRSBase").change(function() {
  setTypeEnable("APRS_BASE_STATION", $(this).is(':checked'));
});
$("#showRadiosondes").change(function() {
  setTypeEnable("RADIOSONDE", $(this).is(':checked'));
});
$("#showMeshtastic").change(function() {
  setTypeEnable("MESHTASTIC_NODE", $(this).is(':checked'));
});
$("#showAirports").change(function() {
  setTypeEnable("AIRPORT", $(this).is(':checked'));
});
$("#showSeaPorts").change(function() {
  setTypeEnable("SEAPORT", $(this).is(':checked'));
});
$("#showBase").change(function() {
  setTypeEnable("BASE_STATION", $(this).is(':checked'));
});

// Query interval
$("#queryInterval").change(function() {
  queryInterval = parseInt($(this).val());
  localStorage.setItem('queryInterval', queryInterval);
});


/////////////////////////////
// LOCAL STORAGE FUNCTIONS //
/////////////////////////////

// Load from local storage or use default
function localStorageGetOrDefault(key, defaultVal) {
  var valStr = localStorage.getItem(key);
  if (null === valStr) {
    return defaultVal;
  } else {
    return JSON.parse(valStr);
  }
}

// Load from local storage and set GUI up appropriately
function loadLocalStorage() {
  // @todo the actual things we want to save and load, not queryInterval
  queryInterval = localStorageGetOrDefault('queryInterval', 1000);

  $("#queryInterval").val(queryInterval);
}


/////////////////////////////
//        KICK-OFF         //
/////////////////////////////

// Load settings
loadLocalStorage();
// Load data for the first time
fetchData();
// Reload data every 5 minutes
setInterval(fetchData, 300000);
