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

// Iterate through a temporary list of spots, merging duplicates in a way suitable for the band panel. If two or more
// spots with the activator, mode and frequency are found, these will be merged and reduced until only one remains,
// with the best data. Note that unlike removeDuplicates(), which operates on the main spot map, this operates only
// on the temporary array of spots provided as an argument, and returns the output, for use when constructing the 
// band panel.
function removeDuplicatesForBandPanel(spotList) {
  var spotsToRemove = [];
  spotList.forEach(function(check) {
    spotList.forEach(function(s) {
      if (s != check) {
        if (s.activator == check.activator && s.freq == check.freq) {
          if (s.mode == check.mode || s.mode == "Unknown" || check.mode == "Unknown") {
            // Find which one to keep and which to delete
            var checkSpotNewer = check.time.isAfter(s.time);
            var keepSpot = checkSpotNewer ? check : s;
            var deleteSpot = checkSpotNewer ? s : check;
            // Update the "keep" spot if the older one had better data
            if (keepSpot.mode == "Unknown" && deleteSpot.mode != "Unknown") {
              keepSpot.mode = deleteSpot.mode;
            }
            // Aggregate list of spots to remove
            spotsToRemove.push(deleteSpot.uid);
          }
        }
      }
    });
  });
  return spotList.filter(s => !spotsToRemove.includes(s.uid));
}


// Iterate through the list of spots, finding and marking spots that look like they are "pre QSY", i.e. there is another
// more recent spot with the same program, activator and reference, but on a different frequency or mode.
function markPreQSYSpots() {
  var spotsToMark = [];
  spots.forEach(function(check) {
    spots.forEach(function(s) {
      if (s != check) {
        if (s.program == check.program && s.activator == check.activator && s.ref == check.ref && (s.freq != check.freq || s.mode != check.mode)) {
          // Find which one to mark as pre-qsy
          var checkSpotNewer = check.time.isAfter(s.time);
          var markSpot = checkSpotNewer ? s : check;
          spotsToMark.push(markSpot.uid);
        }
      }
    });
  });
  spotsToMark.forEach(function(uid) {
    spots.get(uid).preqsy = true;
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

// Convert a frequency to a colour to use on markers or frequency band headers.
function freqToColor(f) {
  for (band of BANDS) {
    if (f >= band.startFreq && f <= band.stopFreq) {
      return band.color
    }
  }
  return "gray";
}

// Convert a frequency to a colour to use on marker icons or text that should contrast with the normal band colour.
function freqToContrastColor(f) {
  for (band of BANDS) {
    if (f >= band.startFreq && f <= band.stopFreq) {
      return band.contrastColor
    }
  }
  return "black";
}

// Convert a "reftype" from the GMA API into a program name string.
function gmaRefTypeToProgram(reftype) {
  if (reftype == "Summit") {
    return "GMA";
  } else if (reftype == "WWFF") {
    return "WWFF";
  } else if (reftype == "IOTA Island") {
    return "IOTA";
  } else if (reftype == "Lighthouse (ILLW)" || reftype == "Lighthouse (ARLHS)") {
    return "Lighthouses";
  } else if (reftype == "Castle") {
    return "Castles";
  } else if (reftype == "Mill") {
    return "Mills";
  } else {
    return "";
  }
}

// Get an icon for a spot, based on its band, using PSK Reporter colours, its program etc.
function getIcon(s) {
  return L.ExtraMarkers.icon({
    icon: getIconName(s.program),
    iconColor: preQSYStatusShouldShowGrey(s.preqsy) ? "black" : freqToContrastColor(s.freq),
    markerColor: preQSYStatusShouldShowGrey(s.preqsy) ? "gray" : freqToColor(s.freq),
    shape: 'circle',
    prefix: 'fa',
    svg: true
  });
}

// Get Font Awesome icon name from the name of the program (e.g. POTA, SOTA)
function getIconName(program) {
  if (program == "POTA") {
    return "fa-tree";
  } else if (program == "SOTA") {
    return "fa-mountain-sun";
  } else if (program == "WWFF") {
    return "fa-seedling";
  } else if (program == "GMA") {
    return "fa-person-hiking";
  } else if (program == "IOTA") {
    return "fa-umbrella-beach";
  } else if (program == "Castles") {
    return "fa-chess-rook";
  } else if (program == "Lighthouses") {
    return "fa-tower-observation";
  } else if (program == "Mills") {
    return "fa-fan";
  } else {
    return "fa-question";
  }
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

// Take an activator's callsign and produce a URL to go to a relevant page from QRZ or HamQTH, depending
// on the user's choice. If they chose "None", null is returned here.
// If the callsign has prefixes or suffixes, we can't really tell what's what so assume the longest
// part of the given callsign is their "simple" callsign. e.g. "EA1/M0TRT/P" becomes "M0TRT".
function getURLforCallsign(callsign) {
  var shortCall = callsign.split("/").sort(function (a, b) { return b.length - a.length; })[0];
  if (callsignLookupService == "QRZ") {
    return "https://www.qrz.com/db/" + shortCall;
  } else if (callsignLookupService == "HamQTH") {
    return "https://www.hamqth.com/" + shortCall;
  } else {
    return null;
  }
}

// Take a program and reference, and produce a URL to go to the relevant part/summit/etc. page on
// the program's website.
function getURLforReference(program, reference) {
  if (program == "POTA") {
    return "https://pota.app/#/park/" + reference;
  } else if (program == "SOTA") {
    return "https://www.sotadata.org.uk/en/summit/" + reference;
  } else if (program == "WWFF") {
    return "https://wwff.co/directory/?showRef=" + reference;
  } else if (program == "GMA" || program == "IOTA" || program == "Castles" || program == "Lighthouses" || program == "Mills") {
    return "https://www.cqgma.org/zinfo.php?ref=" + reference;
  } else {
    return null;
  }
}

// Take a frequency, and produce a WebSDR URL to listen in. Returns null if linkToWebSDREnabled is false.
// Freq in MHz.
function getURLForFrequency(freq) {
  if (linkToWebSDREnabled) {
    var url = linkToWebSDRURL;
    if (url.slice(-1) == "/") {
      url = url.slice(0, -1); 
    }
    url += "/?tune=" + (freq * 1000).toFixed(0);
    return url;
  } else {
    return null;
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

// Is the spot's QRT (shut down) status allowed through the filter?
function qrtStatusAllowedByFilters(qrt) {
  return !qrt || showQRT;
}

// Is the spot's pre-QSY (older than latest known frequency/mode change) status allowed through the filter?
// The result depends on the user's selection of what to do with old spots after QSY is detected. If the
// spot is not "pre-QSY" this always returns true. If the user has selected to show pre-QSY spots indefinitely
// or to grey them out but show them indefinitely, this also always returns true. If the user has selected
// to give such spots a 10-minute grace period, the spot time is factored in and true is returned if the
// age of the spot is <10 minutes.
function preQSYStatusAllowedByFilters(preqsy, spotTime) {
  return !preqsy || showPreQSY || qsyOldSpotBehaviour == "grey"
    || (qsyOldSpotBehaviour == "10mingrace" && moment().diff(spotTime, 'minutes') < 10);
}

// Should the spot's pre-QSY (older than latest known frequency/mode change) status result in the spot being
// shown greyed out?
function preQSYStatusShouldShowGrey(preqsy) {
  return preqsy && qsyOldSpotBehaviour == "grey";
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

// Use the browser API to request the user's own position. If found, display a marker there and move the view
// to centre it, so long as the view hasn't yet been panned somewhere else.
function requestGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      myPos = new L.latLng(position.coords.latitude, position.coords.longitude);

      // Pan and zoom the map to show the user's location. Suppress this if the user has already been
      // moving the map around, to avoid disrupting their experience
      if (!alreadyMovedMap) {
        map.setView(myPos, 5, {
          animate: enableAnimation,
          duration: enableAnimation ? 1.0 : 0.0
        });
      }

      // Add a marker for us
      if (ownPosLayer == null) {
        ownPosLayer = new L.LayerGroup();
        ownPosLayer.addTo(map);
      }
      if (ownPosMarker != null) {
        ownPosLayer.removeLayer(ownPosMarker);
        oms.removeMarker(ownPosMarker);
      }
      setTimeout(function() {
        ownPosMarker = L.marker(myPos, {icon: L.ExtraMarkers.icon({
          icon: 'fa-tower-cell',
          iconColor: 'white',
          markerColor: 'gray',
          shape: 'circle',
          prefix: 'fa',
          svg: true
        })});
        ownPosMarker.tooltip = "You are here!";
        ownPosLayer.addLayer(ownPosMarker);
        oms.addMarker(ownPosMarker);
      }, 1000);

      // Update map objects to add distance and bearing to tooltips
      updateMapObjects();
    }, function(error) {
      console.log("Could not get geolocation: " + error.message);
    });
  } else {
    console.log("Browser cannot provide geolocation.");
  }
}

// Depending on whether you are in light or dark mode, get the basemap name.
function getBasemapForTheme() {
  return darkMode ? BASEMAP_DARK : BASEMAP_LIGHT;
}

// Sets the UI to dark or light mode, and store the setting
function setDarkMode(newDarkMode) {
  darkMode = newDarkMode;

  document.documentElement.setAttribute("color-mode", darkMode ? "dark" : "light");
  var metaThemeColor = document.querySelector("meta[name=theme-color]");
  metaThemeColor.setAttribute("content", darkMode ? "black" : "white");

  $("#map").css('background-color', darkMode ? "black" : "white");

  if (backgroundTileLayer != null) {
    map.removeLayer(backgroundTileLayer);
  }
  backgroundTileLayer = L.tileLayer.provider(getBasemapForTheme(), {
    opacity: BASEMAP_OPACITY,
    edgeBufferTiles: 1
  });
  backgroundTileLayer.addTo(map);
  backgroundTileLayer.bringToBack();

  localStorage.setItem('darkMode', darkMode);
}