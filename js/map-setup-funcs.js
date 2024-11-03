/////////////////////////////
//       MAP SETUP         //
/////////////////////////////

function setUpMap() {
  // Create map
  map = L.map('map', {
    zoomControl: false,
    minZoom: 2,
    maxZoom: 12
  });

  // Add basemap
  backgroundTileLayer = L.tileLayer.provider(getBasemapForTheme(), {
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
  globalPopup = new L.Popup({offset: L.point({x: 0, y: -20})});
  oms.addListener('click', function(marker) {
    openSpiderfierPopup(marker);
  });

  // Add terminator/greyline
  terminator = L.terminator({
    interactive: false
  });
  terminator.setStyle({fillColor: '#00000050'});
  terminator.addTo(map);

  // Display a default view, then request geolocation which will display the own position marker
  // and move the view to it.
  map.setView([30, 0], 3);
  requestGeolocation();

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
  // Record that the projection changed. If this happens before initial "zoom to my location",
  // we ignore that to avoid moving the user's view.
  alreadyMovedMap = true;
}