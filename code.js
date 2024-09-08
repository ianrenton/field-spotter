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
var modes = []
var bands = []


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

    // @todo filter on band and mode

    if (markers.has(t.uid) && pos != null) {
      var m = markers.get(t.uid);

      // Regenerate popup in case the spot time etc. has changed.
      m.bindPopup(getTooltipText(t));

      // Regenerate marker color in case the frequency has changed
      if (m._icon != null) {
        m._icon.style.filter = getMarkerIconStyle(t);
      }

    } else if (pos != null) {
      // No existing marker, data is valid, so create
      var m = L.marker(pos);

      // Set popup
      m.bindPopup(getTooltipText(t));

      // Add to map
      markersLayer.addLayer(m);

      // Set marker color
      if (m._icon != null) {
        m._icon.style.filter = getMarkerIconStyle(t);
      }

      // Add to internal data store
      markers.set(t.uid, m);
    }
  });

  // Iterate through markers. If one corresponds to a dropped entity, delete it
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
  return t.program + "<br/>" + t.activator + "<br/>" + t.ref + " " + t.refName + "<br/>" + t.freq + " MHz<br/>" + t.time.format("HH:mm:ss UTC") + " (" + t.time.fromNow() + ")";
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
  var mhz = Math.floor(f);
  if (mhz == 1 || mhz == 2) {
    return "160m";
  } else if (mhz == 3 || mhz == 4) {
    return "80m";
  } else if (mhz == 5) {
    return "60m";
  } else if (mhz == 7) {
    return "40m";
  } else if (mhz == 10) {
    return "30m";
  } else if (mhz == 14) {
    return "20m";
  } else if (mhz == 18) {
    return "17m";
  } else if (mhz == 21) {
    return "15m";
  } else if (mhz == 24) {
    return "12m";
  } else if (mhz == 28) {
    return "10m";
  } else if (mhz >= 50 && mhz <= 54) {
    return "6m";
  } else if (mhz == 70) {
    return "4m";
  } else if (mhz >= 144 && mhz <= 148) {
    return "2m";
  } else if (mhz >= 420 && mhz <= 440) {
    return "70cm";
  } else {
    return "Unknown";
  }
}

// Get a marker CSS style for a spot, based on its band, using PSK Reporter colours
// @todo junk this way of doing it and draw our own markers in the specific colours
function getMarkerIconStyle(t) {
  var mhz = Math.floor(t.freq);
  if (mhz == 1 || mhz == 2) {
    return "hue-rotate(220deg)"; // Yellow-green
  } else if (mhz == 3 || mhz == 4) {
    return "hue-rotate(110deg)"; // Pink
  } else if (mhz == 5) {
    return "hue-rotate(30deg)"; // Blue-purple
  } else if (mhz == 7) {
    return "hue-rotate(10deg)"; // Purpley-blue
  } else if (mhz == 10) {
    return "hue-rotate(240deg)"; // Green
  } else if (mhz == 14) {
    return "hue-rotate(180deg)"; // Yellow
  } else if (mhz == 18) {
    return "";
  } else if (mhz == 21) {
    return "hue-rotate(160deg)"; // Brown?
  } else if (mhz == 24) {
    return "hue-rotate(130deg)"; // Red
  } else if (mhz == 28) {
    return "hue-rotate(120deg)"; // Pink
  } else if (mhz >= 50 && mhz <= 54) {
    return "hue-rotate(140deg)"; // Red
  } else if (mhz == 70) {
    return "hue-rotate(130deg)"; // Red
  } else if (mhz >= 144 && mhz <= 148) {
    return "hue-rotate(120deg)"; // Pink
  } else if (mhz >= 420 && mhz <= 440) {
    return "hue-rotate(160deg)"; // Brown?
  } else {
    return "";
  }
}


/////////////////////////////
//       MAP SETUP         //
/////////////////////////////

// Create map
var map = L.map('map', {
  zoomControl: false
})

// Request geolocation
map.setView([30, 0], 3);
function showPosition(position) {
  myPos = [position.coords.latitude, position.coords.longitude];
  map.setView(myPos, 5);
  // Add a marker for us
  var ownPosLayer = new L.LayerGroup();
  ownPosLayer.addTo(map);
  var m = L.circleMarker(myPos);
  ownPosLayer.addLayer(m);
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


/////////////////////////////
//     CONTROLS SETUP      //
/////////////////////////////

// @todo slide out right info and config, slide out bottom bands
function manageRightBoxes(show, hide1, hide2) {
  var showDelay = 0;
  if ($(hide1).is(":visible")) {
    $(hide1).slideUp();
    showDelay = 600;
  }
  if ($(hide2).is(":visible")) {
    $(hide2).slideUp();
    showDelay = 600;
  }

  setTimeout(function(){ $(show).slideToggle(); }, showDelay);
}

$("#infoButton").click(function() {
  manageRightBoxes("#infoPanel", "#configPanel", "#trackTablePanel");
});
$("#configButton").click(function() {
  manageRightBoxes("#configPanel", "#infoPanel", "#trackTablePanel");
});
$("#trackTableButton").click(function() {
  manageRightBoxes("#trackTablePanel", "#configPanel", "#infoPanel");
});

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
