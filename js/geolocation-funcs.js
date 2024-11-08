/////////////////////////////
//       GEOLOCATION       //
/////////////////////////////

// Request geolocation, using in order:
// 1. A manually set location (e.g. loaded from localstorage)
// 2. Browser geolocation
// 3. An online lookup service
// A marker will be created and the map zoomed to the location.
function requestGeolocation() {
  if (ownPosOverride != null) {
    setOwnLocation(new L.latLng(ownPosOverride.lat, ownPosOverride.lng));
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      setOwnLocation(new L.latLng(position.coords.latitude, position.coords.longitude));
    }, function(error) {
      requestGeolocationOnline();
    });
  } else {
    requestGeolocationOnline();
  }
}

// Request geolocation from an online service. Fallback in case normal geolocation fails.
// Annoying two step process. IPify offers IP address info via HTTPS for free, but
// not GeoIP info. Hacker Target offers GeoIP info via HTTPS for free, but there is no
// way to specify "use the IP address I am connecting from".
function requestGeolocationOnline() {
  $.ajax({
    url: IP_LOOKUP_URL,
    dataType: 'json',
    timeout: 10000,
    success: async function(result) {
      var ip = result.ip;
      $.ajax({
        url: GEOLOCATION_API_URL + ip,
        dataType: 'json',
        timeout: 10000,
        success: async function(result2) {
          setOwnLocation(new L.latLng(result2.latitude, result2.longitude));
        },
        error: function() {
          console.log("Geolocation lookup failed");
        }
      });
    },
    error: function() {
      console.log("IP lookup for geolocation failed");
    }
  });
}

// Set the user's location to the provided value, add/update the marker, and move the view
// to centre it, so long as the view hasn't yet been panned somewhere else.
function setOwnLocation(newPos) {
  // Store position
  myPos = newPos;

  // Pan and zoom the map to show the user's location. Suppress this if the user has already been
  // moving the map around, to avoid disrupting their experience
  if (!alreadyMovedMap) {
    map.setView(newPos, 5, {
      animate: enableAnimation,
      duration: enableAnimation ? 1.0 : 0.0
    });
  }

  // Add or replace the marker
  if (ownPosLayer == null) {
    ownPosLayer = new L.LayerGroup();
    ownPosLayer.addTo(map);
  }
  if (ownPosMarker != null) {
    ownPosLayer.removeLayer(ownPosMarker);
    oms.removeMarker(ownPosMarker);
    createOwnPosMarker(newPos);
  } else {
    // Short delay to remove some issues with the marker icon not being loaded first time
    setTimeout(function() {
      createOwnPosMarker(newPos);
    }, 1000);
  }

  // Update map objects to add distance and bearing to tooltips
  updateMapObjects();

  // Update the manual lat/lon position values to match, in case we got this position from
  // proper geolocation we can use this as a basis for potentially setting manual location
  // if the user wants. If this is getting called *from* a manually set geolocation, this
  // does nothing because the fields already have these values anyway.
  $("#ownPosOverrideLat").val(newPos.lat.toFixed(5));
  $("#ownPosOverrideLon").val(newPos.lng.toFixed(5));
}

// Create and apply the own position marker
function createOwnPosMarker(newPos) {
  ownPosMarker = L.marker(newPos, {icon: L.ExtraMarkers.icon({
      icon: 'fa-tower-cell',
      iconColor: 'white',
      markerColor: 'gray',
      shape: 'circle',
      prefix: 'fa',
      svg: true
    }),
    draggable: true,
    autoPan: true
  });
  ownPosMarker.tooltip = "You are here!<br/><span class='youAreHereNote'>(Or so we think. If not, just drag this marker where it should be and we'll remember.)</span>";
  // If the marker gets dragged, update own position and store the value
  ownPosMarker.on('dragend', function(event) {
    setOwnPositionOverride(ownPosMarker.getLatLng());
  });
  ownPosLayer.addLayer(ownPosMarker);
  oms.addMarker(ownPosMarker);
}