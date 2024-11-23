/////////////////////////////
//   API CALL FUNCTIONS    //
/////////////////////////////

// Kick off by fetching POTA, SOTA and WWFF data.
function fetchData() {
  spots.length = 0;
  fetchPOTAData();
  fetchSOTAData();
  fetchWWFFData();
  fetchGMAData();
  lastUpdateTime = moment();
}

// Fetch POTA data, updating the internal data model and the map on success
function fetchPOTAData() {
  if (programs.includes("POTA")) {
    $("span#potaApiStatus").html("<i class='fa-solid fa-hourglass-half'></i> Checking...");
    $.ajax({
      url: POTA_SPOTS_URL,
      dataType: 'json',
      timeout: 10000,
      success: async function(result) {
        handlePOTAData(result);
        cleanDataStore();
        removeDuplicates();
        markPreQSYSpots();
        updateMapObjects();
        $("span#potaApiStatus").html("<i class='fa-solid fa-check'></i> OK");
      },
      error: function() {
        $("span#potaApiStatus").html("<i class='fa-solid fa-triangle-exclamation'></i> Error!");
      }
    });
  } else {
    $("span#potaApiStatus").html("<i class='fa-solid fa-eye-slash'></i> Disabled");
  }
}

// Fetch SOTA data, updating the internal data model and the map on success
function fetchSOTAData() {
  if (programs.includes("SOTA")) {
    $("span#sotaApiStatus").html("<i class='fa-solid fa-hourglass-half'></i> Checking...");

    // Before we query the main SOTA spot API, we need to query its "epoch" to figure out if data
    // has actually changed since the last time we queried it. This spares their API from too
    // many calls.
    $.ajax({
      url: SOTA_EPOCH_URL,
      dataType: 'text',
      timeout: 10000,
      success: async function(result) {
        if (result != lastSeenSOTAAPIEpoch) {
          // OK, SOTA API data has changed, *now* we need to do a real query
          $.ajax({
            url: SOTA_SPOTS_URL,
            dataType: 'json',
            timeout: 10000,
            success: async function(result) {
              handleSOTAData(result);
              cleanDataStore();
              removeDuplicates();
              markPreQSYSpots();
              updateMapObjects();
              $("span#sotaApiStatus").html("<i class='fa-solid fa-check'></i> OK");
            },
            error: function() {
              $("span#sotaApiStatus").html("<i class='fa-solid fa-triangle-exclamation'></i> Error!");
            }
          });

        } else {
          // No new data since last query, so don't bother querying the API
          $("span#sotaApiStatus").html("<i class='fa-solid fa-check'></i> Still current");
        }
      },
      error: function(result) {
        $("span#sotaApiStatus").html("<i class='fa-solid fa-triangle-exclamation'></i> Error!");
      }
    });

  } else {
    $("span#sotaApiStatus").html("<i class='fa-solid fa-eye-slash'></i> Disabled");
  }
}

// Fetch WWFF data, updating the internal data model and the map on success
function fetchWWFFData() {
  if (programs.includes("WWFF")) {
    $("span#wwffApiStatus").html("<i class='fa-solid fa-hourglass-half'></i> Checking...");
    $.ajax({
      url: WWFF_SPOTS_URL,
      dataType: 'json',
      timeout: 30000,
      success: async function(result) {
        handleWWFFData(result);
        cleanDataStore();
        removeDuplicates();
        markPreQSYSpots();
        updateMapObjects();
        $("span#wwffApiStatus").html("<i class='fa-solid fa-check'></i> OK");
      },
      error: function() {
        $("span#wwffApiStatus").html("<i class='fa-solid fa-triangle-exclamation'></i> Error!");
      }
    });
  } else {
    $("span#wwffApiStatus").html("<i class='fa-solid fa-eye-slash'></i> Disabled");
  }
}

// Fetch GMA data, updating the internal data model and the map on success
function fetchGMAData() {
  if (programs.includes("GMA") || programs.includes("IOTA") || programs.includes("Castles") || programs.includes("Lighthouses") || programs.includes("Mills")) {
    $("span#gmaApiStatus").html("<i class='fa-solid fa-hourglass-half'></i> Checking...");
    $.ajax({
      url: GMA_SPOTS_URL,
      dataType: 'json',
      timeout: 30000,
      success: async function(result) {
        handleGMAData(result);
        cleanDataStore();
        removeDuplicates();
        markPreQSYSpots();
        updateMapObjects();
        $("span#gmaApiStatus").html("<i class='fa-solid fa-check'></i> OK");
      },
      error: function() {
        $("span#gmaApiStatus").html("<i class='fa-solid fa-triangle-exclamation'></i> Error!");
      }
    });
  } else {
    $("span#gmaApiStatus").html("<i class='fa-solid fa-eye-slash'></i> Disabled");
  }
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
      // Check for QRT. The API does not give us this, so the best we can do is monitor spot comments for the
      // string "QRT", which is how operators typically report it.
      qrt: (spot.comments != null) ? spot.comments.toUpperCase().includes("QRT") : false,
      // Set "pre QSY" status to false for now, we will work this out once the list of spots is fully populated.
      preqsy: false,
      program: "POTA"
    }
    spots.set(uid, newSpot);
  });
}

// Interpret SOTA data and update the internal data model
async function handleSOTAData(result) {
  // Add the retrieved spots to the list
  spotUpdate = objectToMap(result);
  spotUpdate.forEach(spot => {
    var uid = "SOTA-" + spot.id

    var newSpot = {
      uid: uid,
      ref: spot.summitCode,
      refName: spot.summitName,
      activator: spot.activatorCallsign,
      // Note for future me: spot.callsign is the *reporter* callsign not the activator callsign
      mode: normaliseMode(spot.mode, spot.comments),
      freq: spot.frequency,
      band: freqToBand(spot.frequency),
      time: moment.utc(spot.timeStamp),
      comment: filterComment(spot.comments),
      // Check for QRT. The API does now give us this, but for backwards compatibility we still monitor spot
      // comments for the string "QRT", which is how operators typically report it.
      qrt: (spot.type != null && spot.type == "QRT") || (spot.comments != null && spot.comments.toUpperCase().includes("QRT")),
      // Set "pre QSY" status to false for now, we will work this out once the list of spots is fully populated.
      preqsy: false,
      program: "SOTA"
    }
    spots.set(uid, newSpot);

    // For SOTA we have to separately look up the summit to get the lat/long. If we have it cached, look
    // it up in the cache, if not then trigger a call to the API to get it, then cache it
    var cacheKey = "sotacache-"+ spot.summitCode;
    var cacheHit = JSON.parse(localStorage.getItem(cacheKey));
    if (null === cacheHit) {
      $.ajax({
        url: SOTA_SUMMIT_URL_ROOT + spot.summitCode,
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

    // Store the epoch field. This will be the same for every spot. We use this globally to decide whether it's worth
    // re-querying the SOTA API to see if anything has changed.
    lastSeenSOTAAPIEpoch = spot.epoch;
  });
}

// Update a SOTA spot with lat/lon. Called with "apiResponse" either direct from the API,
// or a cached version loaded from localStorage.
async function updateSOTASpot(uid, cacheKey, apiResponse) {
  summitData = objectToMap(apiResponse);
  updateSpot = spots.get(uid);
  // Spot might not be present in our list because it was a removed duplicate, so
  // need to check for that
  if (updateSpot != null) {
    updateSpot.lat = summitData.get("latitude");
    updateSpot.lon = summitData.get("longitude");
    spots.set(uid, updateSpot);
    updateMapObjects();
  }
  localStorage.setItem(cacheKey, JSON.stringify(apiResponse));
}

// Interpret WWFF data and update the internal data model
async function handleWWFFData(result) {
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
      // Check for QRT. The API does not give us this, so the best we can do is monitor spot comments for the
      // string "QRT", which is how operators typically report it.
      qrt: (spot.TEXT != null) ? spot.TEXT.toUpperCase().includes("QRT") : false,
      // Set "pre QSY" status to false for now, we will work this out once the list of spots is fully populated.
      preqsy: false,
      program: "WWFF"
    }
    spots.set(uid, newSpot);
  });
}

// Interpret GMA data and update the internal data model
async function handleGMAData(result) {
  // Add the retrieved spots to the list
  spotUpdate = objectToMap(result);
  spotUpdate.get("RCD").forEach(spot => {
    // GMA API doesn't provide a unique spot ID, so use a hash function to create one from the source data.
    var uid = "GMA-" + hashCode(spot);

    var newSpot = {
      uid: uid,
      ref: spot.REF,
      refName: spot.NAME,
      activator: spot.ACTIVATOR.toUpperCase(),
      mode: normaliseMode(spot.MODE, spot.TEXT),
      freq: parseFloat(spot.QRG) / 1000.0,
      band: freqToBand(parseFloat(spot.QRG) / 1000.0),
      time: moment.utc(spot.DATE + spot.TIME, "YYYYMMDDhhmm"),
      comment: filterComment(spot.TEXT),
      // Check for QRT. The API does not give us this, so the best we can do is monitor spot comments for the
      // string "QRT", which is how operators typically report it.
      qrt: (spot.TEXT != null) ? spot.TEXT.toUpperCase().includes("QRT") : false,
      // Set "pre QSY" status to false for now, we will work this out once the list of spots is fully populated.
      preqsy: false
    }
    spots.set(uid, newSpot);

    // For GMA we have to separately look up the activation location to get what programme it is. We actually get
    // the lat/lon from here as well, not because it isn't in the original spot API response, but so that we don't
    // place a marker until we know the programme type. Now perform that lookup for the spot. If we have it cached,
    // look it up in the cache, if not then trigger a call to the API to get it, then cache it
    var cacheKey = "gmacache-"+ spot.REF;
    var cacheHit = JSON.parse(localStorage.getItem(cacheKey));
    if (null === cacheHit) {
      $.ajax({
        url: GMA_REF_INFO_URL_ROOT + spot.REF,
        dataType: 'json',
        timeout: 30000,
        success: async function(result) {
          if (result != null) {
            updateGMASpot(uid, cacheKey, result);
          }
        }
      });
    } else {
      updateGMASpot(uid, cacheKey, cacheHit);
    }
  });
}

// Update a GMA spot with lat/lon and programme. Called with "apiResponse" either direct from the API,
// or a cached version loaded from localStorage.
async function updateGMASpot(uid, cacheKey, apiResponse) {
  refData = objectToMap(apiResponse);
  updateSpot = spots.get(uid);
  // Spot might not be present in our list because it was a removed duplicate, so
  // need to check for that.
  if (updateSpot != null) {
    // Apply an ugly hack here to delete any spots from the general GMA API that turn out to be WWFF,
    // because we already get these from a different API.
    if (refData.get("reftype") != "WWFF") {
      updateSpot.program = gmaRefTypeToProgram(refData.get("reftype"));
      updateSpot.lat = parseFloat(refData.get("latitude"));
      updateSpot.lon = parseFloat(refData.get("longitude"));
      spots.set(uid, updateSpot);
    } else {
      spots.delete(uid);
    }
    updateMapObjects();
  }
  localStorage.setItem(cacheKey, JSON.stringify(apiResponse));
}

// Post a re-spot to the POTA API
async function potaRespot(uid, comment, statusIndicator) {
    // Set "in progress" indicator
  statusIndicator.html("<i class='fa-solid fa-hourglass-half'></i>");

  // Fetch the corresponding spot
  var spot = spots.get(uid);

  // Post to POTA API
  $.ajax({
    type: "POST",
    url: POTA_POST_SPOT_URL,
    dataType: "json",
    data: JSON.stringify({
      activator: spot.activator,
      spotter: myCallsign,
      frequency: spot.freq * 1000,
      reference: spot.ref,
      mode: spot.mode,
      source: "Field Spotter",
      comments: comment
    }),
    success: async function(result) {
      handleGMAData(result);
      removeDuplicates();
      markPreQSYSpots();
      updateMapObjects();
      statusIndicator.html("<i class='fa-solid fa-check'></i>");
    },
    error: function() {
      statusIndicator.html("<i class='fa-solid fa-triangle-exclamation'></i>");
    }
  });
}
