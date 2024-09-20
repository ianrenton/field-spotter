/////////////////////////////
//        CONSTANTS        //
/////////////////////////////

const VERSION = "0.1";
const POTA_SPOTS_URL = "https://api.pota.app/spot/activator";
const SOTA_SPOTS_URL = "https://api2.sota.org.uk/api/spots/-1/all";
const SOTA_SUMMIT_URL_ROOT = "https://api2.sota.org.uk/api/summits/";
const WWFF_SPOTS_URL = "https://www.cqgma.org/api/spots/wwff/";
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
{ name: "70cm", startFreq: 420.0, stopFreq: 450.0, color: "#999900" },
{ name: "23cm", startFreq: 1240.0, stopFreq: 1325.0, color: "#5AB8C7" },
{ name: "13cm", startFreq: 2300.0, stopFreq: 2450.0, color: "#FF7F50" }];


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
var terminator;
var currentLineToSpot = null;


/////////////////////////////
//  UI CONFIGURABLE VARS   //
/////////////////////////////

// These are all parameters that can be changed by the user by clicking buttons on the GUI,
// and are persisted in local storage.
var programs = ["POTA", "SOTA", "WWFF"];
var modes = ["Phone", "CW", "Digi"];
var bands = ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "4m", "2m", "70cm", "23cm", "13cm"];
var updateIntervalMin = 5;
var maxSpotAgeMin = 60;
var hideQRT = true;
var passiveDisplay = false;
var enableAnimation = true;


/////////////////////////////
//   API CALL FUNCTIONS    //
/////////////////////////////

// Kick off by fetching POTA and SOTA data
function fetchData() {
  spots.length = 0;
  fetchPOTAData();
  fetchSOTAData();
  fetchWWFFData();
  lastUpdateTime = moment();
}

// Fetch POTA data, updating the internal data model and the map on success
function fetchPOTAData() {
  $("span#potaApiStatus").html("<i class='fa-solid fa-hourglass-half'></i> Checking...");
  $.ajax({
    url: POTA_SPOTS_URL,
    dataType: 'json',
    timeout: 10000,
    success: async function(result) {
      handlePOTAData(result);
      potaDataTime = moment(0);
      removeDuplicates();
      updateMapObjects();
      $("span#potaApiStatus").html("<i class='fa-solid fa-check'></i> OK");
    },
    error: function() {
      $("span#potaApiStatus").html("<i class='fa-solid fa-triangle-exclamation'></i> Error!");
    }
  });
}

// Fetch SOTA data, updating the internal data model and the map on success
function fetchSOTAData() {
  $("span#sotaApiStatus").html("<i class='fa-solid fa-hourglass-half'></i> Checking...");
  $.ajax({
    url: SOTA_SPOTS_URL,
    dataType: 'json',
    timeout: 10000,
    success: async function(result) {
      handleSOTAData(result);
      sotaDataTime = moment(0);
      removeDuplicates();
      updateMapObjects();
      $("span#sotaApiStatus").html("<i class='fa-solid fa-check'></i> OK");
    },
    error: function() {
      $("span#sotaApiStatus").html("<i class='fa-solid fa-triangle-exclamation'></i> Error!");
    }
  });
}

// Fetch WWFF data, updating the internal data model and the map on success
function fetchWWFFData() {
  $("span#wwffApiStatus").html("<i class='fa-solid fa-hourglass-half'></i> Checking...");
  $.ajax({
    url: WWFF_SPOTS_URL,
    dataType: 'json',
    timeout: 10000,
    success: async function(result) {
      handleWWFFData(result);
      wwffDataTime = moment(0);
      removeDuplicates();
      updateMapObjects();
      $("span#wwffApiStatus").html("<i class='fa-solid fa-check'></i> OK");
    },
    error: function() {
      $("span#wwffApiStatus").html("<i class='fa-solid fa-triangle-exclamation'></i> Error!");
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
          spots.delete(k);
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
      mode: normaliseMode(spot.mode, spot.comments),
      freq: spot.frequency / 1000.0,
      band: freqToBand(spot.frequency / 1000.0),
      time: moment.utc(spot.spotTime),
      comment: filterComment(spot.comments),
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
          spots.delete(k);
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
      mode: normaliseMode(spot.mode, spot.comments),
      freq: parseFloat(spot.frequency),
      band: freqToBand(parseFloat(spot.frequency)),
      time: moment.utc(spot.timeStamp),
      comment: filterComment(spot.comments),
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
  // Spot might not be present in our list because it was a removed duplicate, so
  // need to check for that
  if (updateSpot != null) {
    updateSpot.lat = summitData.get("latitude");
    updateSpot.lon = summitData.get("longitude");
    updateSpot.refName = summitData.get("name");
    spots.set(uid, updateSpot);
    updateMapObjects();
  }
  localStorage.setItem(cacheKey, JSON.stringify(apiResponse));
}

// Interpret WWFF data and update the internal data model
async function handleWWFFData(result) {
  // Clear existing WWFF spots from the internal list
  Object.keys(spots).forEach(function (k) {
      if (spots[k].program === "WWFF") {
          spots.delete(k);
      }
  });

  // Add the retrieved spots to the list
  spotUpdate = objectToMap(result);
  spotUpdate.get("RCD").forEach(spot => {
    // WWFF API doesn't provide a unique spot ID, so use a hash function to create one from the source data.
    var uid = "WWFF-" + hashCode(spot);
    var newSpot = {
      uid: uid,
      lat: parseFloat(spot.LAT),
      lon: parseFloat(spot.LON),
      ref: spot.REF,
      refName: spot.NAME,
      activator: spot.ACTIVATOR.toUpperCase(),
      mode: normaliseMode(spot.MODE, spot.TEXT),
      freq: parseFloat(spot.QRG) / 1000.0,
      band: freqToBand(parseFloat(spot.QRG) / 1000.0),
      time: moment.utc(spot.DATE + spot.TIME, "YYYYMMDDhhmm"),
      comment: filterComment(spot.TEXT),
      program: "WWFF"
    }
    spots.set(uid, newSpot);
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
  spots.forEach(function(s) {
    var pos = getIconPosition(s);

    // Filter for the time threshold, programs, bands and modes we are interested in.
    // Also filter out spots where comments include "QRT" (shut down), if requested.
    if (ageAllowedByFilters(s.time) && programAllowedByFilters(s.program) && modeAllowedByFilters(s.mode) && bandAllowedByFilters(s.band) && qrtStatusAllowedByFilters(s.comment)) {

      if (markers.has(s.uid) && pos != null) {
        // Existing marker, so update it
        var m = markers.get(s.uid);

        // Regenerate marker color & text in case the spot has updated
        m.setIcon(getIcon(s));
        m.tooltip = getTooltipText(s);
        if (passiveDisplay) {
          m.bindTooltip(getPassiveDisplayTooltipText(s), { permanent: true, direction: 'top', offset:L.point(0, -40) });
        }

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
        if (passiveDisplay) {
          m.bindTooltip(getPassiveDisplayTooltipText(s), { permanent: true, direction: 'top', offset:L.point(0, -40) });
        }

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
      marker.closePopup();
      markersLayer.removeLayer(marker);
      markers.delete(s.uid);
    }
  });

  // Iterate through markers. If one corresponds to a dropped spot, delete it
  markers.forEach(function(marker, uid, map) {
    if (!spots.has(uid)) {
      marker.closePopup();
      markersLayer.removeLayer(marker);
      markers.delete(uid);
    }
  });
}

// Recalculate the contents of the "bands" popout panel. Called when it is pulled
// out, plus on every map pan/zoom event while it is open.
async function recalculateBandsPanelContent() {
  // Get all spots currently in view
  var spotsForBandDisplay = getSpotUIDsInView().map(function (uid) {
    return spots.get(uid);
  });
  // Stop here if nothing to display
  if (spotsForBandDisplay.length == 0) {
    $("#bandsPanelInner").html("<p id='bandPanelNoSpots'>There are no spots in view on the map. Pan and zoom to find some, or alter your filters, before using the band view.</p>");
    return;
  }
  // Convert to a map of band names to the spots on that band. Bands with no
  // spots in view will not be present.
  var bandToSpots = new Map();
  var bandNames = BANDS.map(function (b) { return b.name })
  bandNames.forEach(function(bandName) {
    var matchingSpots = spotsForBandDisplay.filter(function (s) {
      return s.band == bandName;
    });
    if (matchingSpots.length > 0) {
      bandToSpots.set(bandName, matchingSpots);
    }
  });
  // Build up HTML content for each band
  var html = "";
  var columnWidthPercent = Math.max(30, 100 / bandToSpots.size);
  var columnIndex = 0;
  bandToSpots.forEach(function (spotList, bandName, map) {
    band = BANDS.filter(function (b) { return b.name == bandName; })[0];
    html += "<div class='bandCol' style='width:" + columnWidthPercent + "%'>";
    html += "<div class='bandColHeader' style='background-color:" + band.color + "'>" + band.name + "</div>";
    html += "<div class='bandColMiddle'>";

    var freqStep = (band.stopFreq - band.startFreq) / 40.0;
    html += "<ul>";
    html += "<li><span>-</span></li>";

    // Do 40 steps down the band
    for (let i=0; i<=40; i++) {

      // Work out if there are any spots in this step
      var freqStepStart = band.startFreq + i * freqStep;
      var freqStepEnd = freqStepStart + freqStep;
      var spotsInStep = spotList.filter(function (s) {
        // Normally we do >= start and < end, but in the special case where this is the last step and there is a spot
        // right at the end of the band, we include this too
        return s.freq >= freqStepStart && (s.freq < freqStepEnd || (s.freq == freqStepEnd && freqStepEnd == band.stopFreq));
      });

      if (spotsInStep.length > 0) {
        // If this step has spots in it, print them
        html += "<li class='withSpots'><span>";
        spotsInStep.sort((a,b) => (a.freq > b.freq) ? 1 : ((b.freq > a.freq) ? -1 : 0))
        spotsInStep.forEach(function(s) {
          html += "<div class='bandColSpot'>" + s.activator + "<br/>" + (s.freq).toFixed(3);
          if (s.mode != null && s.mode.length > 0 && s.mode != "Unknown") {
            html += " " + s.mode + "</div>";
          }
        });
        html += "</li></span>";

      } else {
        // Step had no spots in it, so just print a marker. This is a frequency on multiples of 4, or a dash otherwise.
        if (i % 4 == 0) {
          html += "<li><span>&mdash;" + (band.startFreq + i * freqStep).toFixed(3) + "</span></li>";
        } else if (i % 4 == 2) {
          html += "<li><span>&ndash;</span></li>";
        } else {
          html += "<li><span>-</span></li>";
        }
      }
    }
    html += "<li><span>-</span></li>";
    html += "</ul>";

    html += "</div></div>";
    columnIndex++;
  });
  // Update the DOM with the band HTML
  $("#bandsPanelInner").html(html);
}



/////////////////////////////
//  SPOT DISPLAY FUNCTIONS //
/////////////////////////////

// Tooltip text for the normal click-to-appear tooltips
function getTooltipText(s) {
  ttt = "<i class='fa-solid fa-user markerPopupIcon'></i> " + s.activator + "<br/>";
  ttt += "<span style='display:inline-block; white-space: nowrap;'>";
  if (s.program == "POTA") {
    ttt += "<i class='fa-solid fa-tree markerPopupIcon'></i> ";
  } else if (s.program == "SOTA") {
    ttt += "<i class='fa-solid fa-mountain-sun markerPopupIcon'></i> ";
  } else {
    ttt += "<i class='fa-solid fa-paw markerPopupIcon'></i> ";
  }

  ttt += "<span class='popupRefName'>" + s.ref + " " + s.refName + "</span></span><br/>";
  ttt += "<i class='fa-solid fa-walkie-talkie markerPopupIcon'></i> " + s.freq.toFixed(3) + " MHz (" + s.band + ")";
  if (s.mode != "Unknown") {
    ttt += "&nbsp;&nbsp; <i class='fa-solid fa-wave-square markerPopupIcon'></i> " + s.mode;
  }
  ttt += "<br/>";
  if (myPos != null) {
    spotLatLng = new L.latLng(s["lat"], s["lon"])
    bearing = L.GeometryUtil.bearing(myPos, spotLatLng);
    if (bearing < 0) bearing = bearing + 360;
    distance = L.GeometryUtil.length([myPos, spotLatLng]) / 1000.0;
    ttt += "<i class='fa-solid fa-ruler markerPopupIcon'></i> " + distance.toFixed(0) + "km  &nbsp;&nbsp; <i class='fa-solid fa-compass markerPopupIcon'></i> " + bearing.toFixed(0) + "°<br/>";
  }
  ttt += "<i class='fa-solid fa-clock markerPopupIcon'></i> " + s.time.format("HH:mm UTC") + " (" + s.time.fromNow() + ")";
  if (s.comment != null && s.comment.length > 0) {
    ttt += "<br/><i class='fa-solid fa-comment markerPopupIcon'></i> " + s.comment;
  }
  return ttt;
}

// Tooltip text for the "passive mode" permanent tooltips
function getPassiveDisplayTooltipText(s) {
  ttt = "<i class='fa-solid fa-user markerPopupIcon'></i> " + s.activator + "<br/>";
  ttt += "<i class='fa-solid fa-walkie-talkie markerPopupIcon'></i> " + s.freq.toFixed(3);
  if (s.mode != "Unknown") {
    ttt += " " + s.mode;
  }
  return ttt;
}

function getIconPosition(s) {
  if (s["lat"] != null && s["lon"] != null && !isNaN(s["lat"]) && !isNaN(s["lon"])) {
    return [s["lat"], s["lon"]];
  } else {
    return null;
  }
}



/////////////////////////////
//    UTILITY FUNCTIONS    //
/////////////////////////////


// Iterate through the list of spots, merging duplicates. If two or more spots with the same program, activator, reference, mode
// and frequency are found, these will be merged and reduced until only one remains, with the most recent timestamp and
// comment.
function removeDuplicates() {
  var spotsToRemove = [];
  spots.forEach(function(check) {
    spots.forEach(function(s) {
      if (s != check) {
        if (s.program == check.program && s.activator == check.activator && s.ref == check.ref && s.freq == check.freq) {
          if (s.mode == check.mode || s.mode == "Unknown" || check.mode == "Unknown") {
            // Find which one to keep and which to delete
            var checkSpotNewer = check.time.isAfter(s.time);
            var keepSpot = checkSpotNewer ? check : s;
            var deleteSpot = checkSpotNewer ? s : check;
            // Update the "keep" spot if the older one had better data
            if (keepSpot.mode == "Unknown" && deleteSpot.mode != "Unknown") {
              keepSpot.mode = deleteSpot.mode;
            }
            if (keepSpot.comment.length == 0 && deleteSpot.comment.length > 0) {
              keepSpot.comment = deleteSpot.comment;
            }
            // Aggregate list of spots to remove
            spotsToRemove.push(deleteSpot.uid);
          }
        }
      }
    });
  });
  spotsToRemove.forEach(function(uid) {
    spots.delete(uid);
  });
}

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
  var icon = "fa-tree";
  if (s.program == "SOTA") {
    icon = "fa-mountain-sun";
  } else if (s.program == "WWFF") {
    icon = "fa-paw";
  }
  return L.ExtraMarkers.icon({
    icon: icon,
    markerColor: freqToColor(s.freq),
    shape: 'circle',
    prefix: 'fa',
    svg: true
  });
}

// Normalise a mode to caps and replace blanks with "Unknown". If the mode is not provided but a comment
// contains a mode-like string, use that instead
function normaliseMode(m, comment) {
  if (!m || m.length === 0 ) {
    var mode = "Unknown";
    ["CW", "PHONE", "SSB", "USB", "LSB", "FM", "DV", "DIGI", "DATA", "FT8", "FT4", "RTTY", "SSTV"].forEach(function(test) {
      if (comment.toUpperCase().includes(test)) {
        mode = test;
      }
    });
    return mode;
  } else {
    return m.toUpperCase();
  }
}

// Filter certain things out of comments, such as the software used to report the spot, which just
// clutter up a mobile screen without being useful. If a null comment is provided, this also converts
// it to an empty string to avoid needing to null check later on.
function filterComment(comment) {
  if (comment == null) {
    return "";
  } else {
    comment = comment.replace(/\[(.*?)\]:/, "");
    comment = comment.replace(/\[(.*?)\]/, "");
    comment = comment.replace(/\"\"/, "");
    return comment.trim();
  }
}

// Is the spot's program allowed through the filter?
function programAllowedByFilters(program) {
  return programs.includes(program);
}

// Is the spot's mode allowed through the filter?
function modeAllowedByFilters(mode) {
  return modes.includes(mode)
  || (modes.includes("Phone") && (mode == "SSB" || mode == "USB" || mode == "LSB" || mode == "AM" || mode == "FM" || mode == "DV" || mode == "Unknown"))
  || (modes.includes("Digi") && (mode == "DATA" || mode == "FT8" || mode == "FT4" || mode == "RTTY" || mode == "SSTV"));
}

// Is the spot's band allowed through the filter?
function bandAllowedByFilters(band) {
  return bands.includes(band);
}

// Is the spot's age allowed through the filter?
function ageAllowedByFilters(spotTime) {
  var age = moment().diff(spotTime, 'minutes');
  return age < maxSpotAgeMin;
}

// Is the spot's QRT (shut down) status allowed through the filter? No API gives a good way of
// determining this, so the best we can do is monitor spot comments for the string "QRT", which
// is how operators typically report it.
function qrtStatusAllowedByFilters(comment) {
  var qrt = false;
  if (comment != null) {
    qrt = comment.toUpperCase().includes("QRT");
  }
  return !qrt || !hideQRT;
}

// Get the list of spot UIDs in the current map viewport
function getSpotUIDsInView() {
  var uids = [];
  map.eachLayer( function(layer) {
    if (layer instanceof L.Marker) {
      if (map.getBounds().contains(layer.getLatLng()) && layer.uid != null) {
        uids.push(layer.uid);
      }
    }
  });
  return uids;
}

// Create a hashcode for a spot (or any object). Used to work around the WWFF API not providing unique spot IDs.
function hashCode(spot) {
  var s = JSON.stringify(spot);
  for(var i = 0, h = 0; i < s.length; i++)
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h;
}


/////////////////////////////
//       MAP SETUP         //
/////////////////////////////

function setUpMap() {
  // Create map
  map = L.map('map', {
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
  var popup = new L.Popup({offset: L.point({x: 0, y: -20})});
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
    if (myPos != null && spots.get(marker.uid) != null) {
      currentLineToSpot = L.geodesic([myPos, marker.getLatLng()], {
        color: freqToColor(spots.get(marker.uid).freq)
      }).addTo(map);
    }
  });

  // Add terminator/greyline
  terminator = L.terminator();
  terminator.setStyle({fillColor: '#00000050'});
  terminator.addTo(map);

  // Request geolocation
  map.setView([30, 0], 3);
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      myPos = new L.latLng(position.coords.latitude, position.coords.longitude);
      map.setView(myPos, 5, {
        animate: enableAnimation,
        duration: enableAnimation ? 1.0 : 0.0
      });
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

  // Add callbacks on moving the view
  map.on('moveend', function() {
      mapProjChanged();
  });
  map.on('zoomend', function() {
      mapProjChanged();
  });
}

// Callback on map projection (pan/zoom) change. Used to update the list of
// spots needing to be drawn on the band popout, if it is visible
async function mapProjChanged() {
  if ($("#bandsPanel").is(":visible")) {
    recalculateBandsPanelContent();
  }
}


/////////////////////////////
//     CONTROLS SETUP      //
/////////////////////////////

// Manage boxes that slide out from the right
function manageRightBoxes(toggle, hide1, hide2, callback) {
  var showDelay = 0;
  if (enableAnimation) {
    if ($(hide1).is(":visible")) {
      $(hide1).hide("slide", { direction: "right" }, 500);
      showDelay = 600;
    }
    if ($(hide2).is(":visible")) {
      $(hide2).hide("slide", { direction: "right" }, 500);
      showDelay = 600;
    }

    setTimeout(function(){ $(toggle).toggle("slide", { direction: "right" }, 500, callback); }, showDelay);
  
  } else {
    if ($(hide1).is(":visible")) {
      $(hide1).hide();
    }
    if ($(hide2).is(":visible")) {
      $(hide2).hide();
    }
    $(toggle).toggle(0, callback);
  }
}

$("#infoButton").click(function() {
  manageRightBoxes("#infoPanel", "#configPanel", "#bandsPanel", null);
});
$("#configButton").click(function() {
  manageRightBoxes("#configPanel", "#infoPanel", "#bandsPanel", null);
});
$("#bandsButton").click(function() {
  manageRightBoxes("#bandsPanel", "#configPanel", "#infoPanel", function() {
    // Check if we showed the bands panel, if so recalculate its content
    if ($("#bandsPanel").is(":visible")) {
      recalculateBandsPanelContent();
    }
  });
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
  localStorage.setItem('programs', JSON.stringify(programs));
  updateMapObjects();
}
$("#showPOTA").change(function() {
  setProgramEnable("POTA", $(this).is(':checked'));
});
$("#showSOTA").change(function() {
  setProgramEnable("SOTA", $(this).is(':checked'));
});
$("#showWWFF").change(function() {
  setProgramEnable("WWFF", $(this).is(':checked'));
});

// Modes
function setModeEnable(type, enable) {
  if (enable) {
    modes.push(type);
  } else {
    for( var i = 0; i < modes.length; i++){ if ( modes[i] === type) { modes.splice(i, 1); }}
  }
  localStorage.setItem('modes', JSON.stringify(modes));
  updateMapObjects();
}
$("#showPhone").change(function() {
  setModeEnable("Phone", $(this).is(':checked'));
});
$("#showCW").change(function() {
  setModeEnable("CW", $(this).is(':checked'));
});
$("#showDigi").change(function() {
  setModeEnable("Digi", $(this).is(':checked'));
});

// Bands
function setBandEnable(type, enable) {
  if (enable) {
    bands.push(type);
  } else {
    for( var i = 0; i < bands.length; i++){ if ( bands[i] === type) { bands.splice(i, 1); }}
  }
  localStorage.setItem('bands', JSON.stringify(bands));
  updateMapObjects();
}
$("#show160m").change(function() {
  setBandEnable("160m", $(this).is(':checked'));
});
$("#show80m").change(function() {
  setBandEnable("80m", $(this).is(':checked'));
});
$("#show60m").change(function() {
  setBandEnable("60m", $(this).is(':checked'));
});
$("#show40m").change(function() {
  setBandEnable("40m", $(this).is(':checked'));
});
$("#show30m").change(function() {
  setBandEnable("30m", $(this).is(':checked'));
});
$("#show20m").change(function() {
  setBandEnable("20m", $(this).is(':checked'));
});
$("#show17m").change(function() {
  setBandEnable("17m", $(this).is(':checked'));
});
$("#show15m").change(function() {
  setBandEnable("15m", $(this).is(':checked'));
});
$("#show12m").change(function() {
  setBandEnable("12m", $(this).is(':checked'));
});
$("#show10m").change(function() {
  setBandEnable("10m", $(this).is(':checked'));
});
$("#show6m").change(function() {
  setBandEnable("6m", $(this).is(':checked'));
});
$("#show4m").change(function() {
  setBandEnable("4m", $(this).is(':checked'));
});
$("#show2m").change(function() {
  setBandEnable("2m", $(this).is(':checked'));
});
$("#show70cm").change(function() {
  setBandEnable("70cm", $(this).is(':checked'));
});
$("#show23cm").change(function() {
  setBandEnable("23cm", $(this).is(':checked'));
});
$("#show13cm").change(function() {
  setBandEnable("13cm", $(this).is(':checked'));
});

// Hide QRT
$("#hideQRT").change(function() {
  hideQRT = $(this).is(':checked');
  localStorage.setItem('hideQRT', hideQRT);
  updateMapObjects();
});

// Passive mode
$("#passiveDisplay").change(function() {
  passiveDisplay = $(this).is(':checked');
  // When toggling passive display on or off, delete and regenerate all markers
  markers.forEach(function(marker, uid, map) {
    marker.closePopup();
    markersLayer.removeLayer(marker);
    markers.delete(uid);
  });
  localStorage.setItem('passiveDisplay', passiveDisplay);
  updateMapObjects();
});

// Enable animation
$("#enableAnimation").change(function() {
  enableAnimation = $(this).is(':checked');
  localStorage.setItem('enableAnimation', enableAnimation);
});

// Desktop mouse wheel to scroll bands horizontally if necessary
$("#bandsPanelInner").on("wheel", (e) => event.currentTarget.scrollLeft += event.deltaY / 10.0);


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
  updateIntervalMin = localStorageGetOrDefault('updateIntervalMin', updateIntervalMin);
  $("#updateInterval").val(updateIntervalMin);

  // Max spot age
  maxSpotAgeMin = localStorageGetOrDefault('maxSpotAgeMin', maxSpotAgeMin);
  $("#maxSpotAge").val(maxSpotAgeMin);

  // Programs
  programs = localStorageGetOrDefault('programs', programs);
  $("#showPOTA").prop('checked', programs.includes("POTA"));
  $("#showSOTA").prop('checked', programs.includes("SOTA"));
  $("#showWWFF").prop('checked', programs.includes("WWFF"));

  // Modes
  modes = localStorageGetOrDefault('modes', modes);
  $("#showPhone").prop('checked', modes.includes("Phone"));
  $("#showCW").prop('checked', modes.includes("CW"));
  $("#showDigi").prop('checked', modes.includes("Digi"));

  // Bands
  bands = localStorageGetOrDefault('bands', bands);
  $("#show160m").prop('checked', bands.includes("160m"));
  $("#show80m").prop('checked', bands.includes("80m"));
  $("#show60m").prop('checked', bands.includes("60m"));
  $("#show40m").prop('checked', bands.includes("40m"));
  $("#show30m").prop('checked', bands.includes("30m"));
  $("#show20m").prop('checked', bands.includes("20m"));
  $("#show17m").prop('checked', bands.includes("17m"));
  $("#show15m").prop('checked', bands.includes("15m"));
  $("#show12m").prop('checked', bands.includes("12m"));
  $("#show10m").prop('checked', bands.includes("10m"));
  $("#show6m").prop('checked', bands.includes("6m"));
  $("#show4m").prop('checked', bands.includes("4m"));
  $("#show2m").prop('checked', bands.includes("2m"));
  $("#show70cm").prop('checked', bands.includes("70cm"));
  $("#show23cm").prop('checked', bands.includes("23cm"));
  $("#show13cm").prop('checked', bands.includes("13cm"));

  // Hide QRT
  hideQRT = localStorageGetOrDefault('hideQRT', hideQRT);
  $("#hideQRT").prop('checked', hideQRT);

  // Passive display mode
  passiveDisplay = localStorageGetOrDefault('passiveDisplay', passiveDisplay);
  $("#passiveDisplay").prop('checked', passiveDisplay);

  // Enable animation
  enableAnimation = localStorageGetOrDefault('enableAnimation', enableAnimation);
  $("#enableAnimation").prop('checked', enableAnimation);
}


/////////////////////////////
//      PWA INSTALL        //
/////////////////////////////

// Prevent the Chrome/Safari default install prompt, instead use the event to show our own in the info panel
let installPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  $("#installOnAnotherDevice").hide();
  $("#installPrompt").show();
});

// Handle the user clicking our install button
$("#installPrompt").click(async function() {
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
  $("#installPrompt").hide();
}

// Disable both the install and install-on-another-device prompts if already installed
if (navigator.standalone || window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches) {
  $("#installOnAnotherDevice").hide();
  $("#installPrompt").hide();
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
// Update terminator/greyline every 5 minutes
setInterval(function() { terminator.setTime() }, 300);