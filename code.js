/////////////////////////////
//        CONSTANTS        //
/////////////////////////////

const VERSION = "0.1";
const POTA_SPOTS_URL = "https://api.pota.app/spot/activator";
const SOTA_SPOTS_URL = "https://api2.sota.org.uk/api/spots/-1/all";
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
var lastUpdateTime = moment(0);
var myPos = null;
var map;
var markersLayer;
var oms;
var currentLineToSpot = null;


/////////////////////////////
//  UI CONFIGURABLE VARS   //
/////////////////////////////

// These are all parameters that can be changed by the user by clicking buttons on the GUI,
// and are persisted in local storage.
var programs = ["POTA", "SOTA"];
var modes = [];
var bands = [];
var updateIntervalMin = 5;
var maxSpotAgeMin = 60;


/////////////////////////////
//   API CALL FUNCTIONS    //
/////////////////////////////

// Kick off by fetching POTA and SOTA data
function fetchData() {
  fetchPOTAData();
  fetchSOTAData();
  lastUpdateTime = moment();
}

// Fetch POTA data, updating the internal data model and the map on success, updating the status icon appropriately
function fetchPOTAData() {
  $("span#potaApiStatus").html("<i class='fa-solid fa-hourglass-half'></i> Checking...");
  $.ajax({
    url: POTA_SPOTS_URL,
    dataType: 'json',
    timeout: 10000,
    success: async function(result) {
      handlePOTAData(result);
      potaDataTime = moment(0);
      updateMapObjects();
      $("span#potaApiStatus").html("<i class='fa-solid fa-check'></i> OK");
    },
    error: function() {
      $("span#potaApiStatus").html("<i class='fa-solid fa-triangle-exclamation'></i> Error!");
    }
  });
}

// Fetch SOTA data, updating the internal data model and the map on success, updating the status icon appropriately
function fetchSOTAData() {
  $("span#sotaApiStatus").html("<i class='fa-solid fa-hourglass-half'></i> Checking...");
  $.ajax({
    url: SOTA_SPOTS_URL,
    dataType: 'json',
    timeout: 10000,
    success: async function(result) {
      handleSOTAData(result);
      sotaDataTime = moment(0);
      updateMapObjects();
      $("span#sotaApiStatus").html("<i class='fa-solid fa-check'></i> OK");
    },
    error: function() {
      $("span#sotaApiStatus").html("<i class='fa-solid fa-triangle-exclamation'></i> Error!");
    }
  });
}

// Check for Update function - called every second, this retrieves new data from
// the server so long as the next update time has been reached. The update
// interval is configurable, so this gets called rapidly but doesn't often
// do anything.
function checkForUpdate() {
  $("span#lastUpdateTime").text(lastUpdateTime.format("HH:mm UTC") + " (" + lastUpdateTime.fromNow() + ")");
  if (moment().diff(lastUpdateTime, 'minutes') >= updateIntervalMin) {
    fetchData();
  }
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

    // For SOTA we have to separately look up the summit to get the lat/long. If we have it cached, look
    // it up in the cache, if not then trigger a call to the API to get it, then cache it
    var cacheKey = "sotacache-"+ spot.associationCode + "-" + spot.summitCode;
    var cacheHit = JSON.parse(localStorage.getItem(cacheKey));
    if (null === cacheHit) {
      $.ajax({
        url: SOTA_SUMMIT_URL_ROOT + spot.associationCode + "/" + spot.summitCode,
        dataType: 'json',
        timeout: 10000,
        success: async function(result) {
          if (result != null) {
            updateSOTASpot(uid, cacheKey, result);
          }
        }
      });
    } else {
      updateSOTASpot(uid, cacheKey, cacheHit);
    }
  });
}

// Update a SOTA spot with lat/lon and summit name. Called with "apiResponse" either direct from the API,
// or a cached version loaded from localStorage.
async function updateSOTASpot(uid, cacheKey, apiResponse) {
  summitData = objectToMap(apiResponse);
  updateSpot = spots.get(uid);
  updateSpot.lat = summitData.get("latitude");
  updateSpot.lon = summitData.get("longitude");
  updateSpot.refName = summitData.get("name");
  spots.set(uid, updateSpot);
  updateMapObjects();
  localStorage.setItem(cacheKey, JSON.stringify(apiResponse));
}

/////////////////////////////
//   UI UPDATE FUNCTIONS   //
/////////////////////////////

// Update the objects that are rendered on the map. Clear old markers and draw new ones. This is
// called when the data model changes due to a server query.
async function updateMapObjects() {
  // Iterate through spots. For each, update an existing marker
  // or create a new marker if required.
  spots.forEach(function(s) {
    var pos = getIconPosition(s);

    // Filter for the programs, bands and modes we are interested in
    if (programs.includes(s.program)) {

      if (markers.has(s.uid) && pos != null) {
        // Existing marker, so update it
        var m = markers.get(s.uid);

        // Regenerate marker color & text in case the spot has updated
        m.setIcon(getIcon(s));
        m.tooltip = getTooltipText(s);

        // Set opacity with age
        age = moment().diff(s.time, 'minutes');
        opacity = ((maxSpotAgeMin - age) / maxSpotAgeMin / 2.0) + 0.5;
        m.setOpacity(opacity);

      } else if (pos != null) {
        // No existing marker, data is valid, so create
        var m = L.marker(pos, {icon: getIcon(s)});
        m.uid = s.uid;

        // Add to map and spiderfier
        markersLayer.addLayer(m);
        oms.addMarker(m);

        // Set tooltip
        m.tooltip = getTooltipText(s);

        // Set opacity with age
        age = moment().diff(s.time, 'minutes');
        opacity = ((maxSpotAgeMin - age) / maxSpotAgeMin / 2.0) + 0.5;
        m.setOpacity(opacity);

        // Add to internal data store
        markers.set(s.uid, m);
      }

    } else if (markers.has(s.uid)) {
      // Existing marker now excluded by filters, so remove
      var marker = markers.get(s.uid);
      markersLayer.removeLayer(marker);
      markers.delete(s.uid);
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
  ttt = "<i class='fa-solid fa-user' style='display: inline-block; width: 1.2em;'></i> " + t.activator + "<br/>";
  ttt += "<span style='display:inline-block;'>";
  if (t.program == "SOTA") {
    ttt += "<i class='fa-solid fa-mountain-sun' style='display: inline-block; width: 1.2em;'></i> ";
  } else {
    ttt += "<i class='fa-solid fa-tree' style='display: inline-block; width: 1.2em;'></i> ";
  }

  ttt += t.ref + " " + t.refName + "</span><br/>";
  ttt += "<i class='fa-solid fa-walkie-talkie' style='display: inline-block; width: 1.2em;'></i> " + t.freq + " MHz (" + t.band + ")<br/>";
  if (myPos != null) {
    spotLatLng = new L.latLng(t["lat"], t["lon"])
    bearing = L.GeometryUtil.bearing(myPos, spotLatLng);
    if (bearing < 0) bearing = bearing + 360;
    distance = L.GeometryUtil.length([myPos, spotLatLng]) / 1000.0;
    ttt += "<i class='fa-solid fa-ruler' style='display: inline-block; width: 1.2em;'></i> " + distance.toFixed(0) + "km  &nbsp;&nbsp; <i class='fa-solid fa-compass' style='display: inline-block; width: 1.2em;'></i> " + bearing.toFixed(0) + "°<br/>";
  }
  ttt += "<i class='fa-solid fa-clock' style='display: inline-block; width: 1.2em;'></i> " + t.time.format("HH:mm UTC") + " (" + t.time.fromNow() + ")";
  return ttt;
}

function getIconPosition(s) {
  if (s["lat"] != null) {
    return [s["lat"], s["lon"]];
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

// Get an icon for a spot, based on its band, using PSK Reporter colours, its program etc.
function getIcon(s) {
  return L.ExtraMarkers.icon({
    icon: (s.program == "SOTA") ? "fa-mountain-sun" : "fa-tree",
    markerColor: freqToColor(s.freq),
    shape: 'circle',
    prefix: 'fa',
    svg: true
  });
}


/////////////////////////////
//       MAP SETUP         //
/////////////////////////////

function setUpMap() {
  // Create map
  var map = L.map('map', {
    zoomControl: false,
    minZoom: 3,
    maxZoom: 12
  });

  // Add basemap
  backgroundTileLayer = L.tileLayer.provider(BASEMAP_NAME, {
    opacity: BASEMAP_OPACITY,
    edgeBufferTiles: 1
  });
  backgroundTileLayer.addTo(map);
  backgroundTileLayer.bringToBack();

  // Add marker layer
  markersLayer = new L.LayerGroup();
  markersLayer.addTo(map);

  // Add spiderfier
  oms = new OverlappingMarkerSpiderfier(map, { keepSpiderfied: true, legWeight: 2.0} );
  var popup = new L.Popup({offset: L.point({x: 0, y: -20}), maxWidth : 600});
  oms.addListener('click', function(marker) {
    // On marker click (after spiderfy when required), open popup
    popup.setContent(marker.tooltip);
    popup.setLatLng(marker.getLatLng());
    // Add a callback to remove the line linking the marker to my position on popup clase
    popup.on('remove', function() {
      if (currentLineToSpot != null) {
        map.removeLayer(currentLineToSpot);
      }
    });
    map.openPopup(popup);
    // Draw a line linking the marker to my position.
    if (myPos != null) {
      currentLineToSpot = L.geodesic([myPos, marker.getLatLng()], {
        color: freqToColor(spots.get(marker.uid).freq)
      }).addTo(map);
    }
  });

  // Request geolocation
  map.setView([30, 0], 3);
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
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
      m.tooltip = "You are here!";
      ownPosLayer.addLayer(m);
      oms.addMarker(m);
      // Update map objects to add distance and bearing to tooltips
      updateMapObjects();
    });
  }
}


/////////////////////////////
//     CONTROLS SETUP      //
/////////////////////////////

// Manage boxes that slide out from the right
function manageRightBoxes(toggle, hide1, hide2) {
  var showDelay = 0;
  if ($(hide1).is(":visible")) {
    $(hide1).hide("slide", { direction: "right" }, 500);
    showDelay = 600;
  }
  if ($(hide2).is(":visible")) {
    $(hide2).hide("slide", { direction: "right" }, 500);
    showDelay = 600;
  }

  setTimeout(function(){ $(toggle).toggle("slide", { direction: "right" }, 500); }, showDelay);
}

$("#infoButton").click(function() {
  manageRightBoxes("#infoPanel", "#configPanel", "#bandsPanel");
});
$("#configButton").click(function() {
  manageRightBoxes("#configPanel", "#infoPanel", "#bandsPanel");
});
$("#bandsButton").click(function() {
  manageRightBoxes("#bandsPanel", "#configPanel", "#infoPanel");
});

// Manual update button
$("#updateNow").click(function() {
  fetchData();
});

// Update interval
$("#updateInterval").change(function() {
  updateIntervalMin = parseInt($(this).val());
  localStorage.setItem('updateIntervalMin', updateIntervalMin);
});

// Max spot age
$("#maxSpotAge").change(function() {
  maxSpotAgeMin = parseInt($(this).val());
  localStorage.setItem('maxSpotAgeMin', maxSpotAgeMin);
  updateMapObjects();
});

// Programs
function setProgramEnable(type, enable) {
  if (enable) {
    programs.push(type);
  } else {
    for( var i = 0; i < programs.length; i++){ if ( programs[i] === type) { programs.splice(i, 1); }}
  }
  console.log(programs)
  localStorage.setItem('programs', JSON.stringify(programs));
  updateMapObjects();
}
$("#showPOTA").change(function() {
  setProgramEnable("POTA", $(this).is(':checked'));
});
$("#showSOTA").change(function() {
  setProgramEnable("SOTA", $(this).is(':checked'));
});

// @todo the rest


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
  // Update interval
  updateIntervalMin = localStorageGetOrDefault('updateIntervalMin', 5);
  $("#updateInterval").val(updateIntervalMin);

  // Max spot age
  maxSpotAgeMin = localStorageGetOrDefault('maxSpotAgeMin', 5);
  $("#maxSpotAge").val(maxSpotAgeMin);

  // Programs
  programs = localStorageGetOrDefault('programs', programs);
  $("#showPOTA").prop('checked', programs.includes("POTA"));
  $("#showSOTA").prop('checked', programs.includes("SOTA"));

  // @todo the rest
}


/////////////////////////////
//      PWA INSTALL        //
/////////////////////////////

// Prevent the Chrome/Safari default install prompt, instead use the event to show our own in the info panel
let installPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  $("installOnAnotherDevice").hide();
  $("installPrompt").show();
});

// Handle the user clicking our install button
$("installPrompt").click(async function() {
  if (!installPrompt) {
    return;
  }
  await installPrompt.prompt();
  disableInAppInstallPrompt();
});

// Disable our install prompt after the user installs the app
window.addEventListener("appinstalled", () => {
  disableInAppInstallPrompt();
});
function disableInAppInstallPrompt() {
  installPrompt = null;
  $("installPrompt").hide();
}


/////////////////////////////
//        KICK-OFF         //
/////////////////////////////

// Set up map
setUpMap();
// Load settings
loadLocalStorage();
// Load data for the first time
fetchData();
// Every second, check if we need to update data based on the user's configured update interval,
// and update other UI elements regarding data age.
setInterval(checkForUpdate, 1000);
