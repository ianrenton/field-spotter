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
    oms = new OverlappingMarkerSpiderfier(map, {keepSpiderfied: true, legWeight: 2.0});
    globalPopup = new L.Popup({offset: L.point({x: 0, y: -20})});
    // noinspection JSDeprecatedSymbols,JSCheckFunctionSignatures
    oms.addListener('click', function (marker) {
        openSpiderfierPopup(marker);
    });

    // Add terminator/greyline (toggleable)
    terminator = L.terminator({
        interactive: false
    });
    terminator.setStyle({fillColor: '#00000050'});
    if (showTerminator) {
        terminator.addTo(map);
    }

    // Add Maidenhead grid (toggleable)
    maidenheadGrid = L.maidenhead({
        color : 'rgba(0, 0, 0, 0.4)'
    });
    if (showMaidenheadGrid) {
        maidenheadGrid.addTo(map);
    }

    // Add WAB squares (toggleable). Don't even create it if it's not enabled, as it loads 6MB of data!
    enableWABGrid(showWABGrid);

    // Display a default view. Soon a geolocation request will happen, which will display the own
    // position marker and move the view to it, but this is a default for now or in case geolocation
    // doesn't work.
    map.setView([30, 0], 3);

    // Add callbacks on moving the view
    map.on('moveend', function () {
        mapProjChanged();
    });
    map.on('zoomend', function () {
        mapProjChanged();
    });
}

// Callback on map projection (pan/zoom) change. Used to update the list of
// spots needing to be drawn on the band popout, if it is visible
function mapProjChanged() {
    if ($("#bandsPanel").is(":visible")) {
        recalculateBandsPanelContent();
    }
    // Record that the projection changed. If this happens before initial "zoom to my location",
    // we ignore that to avoid moving the user's view.
    alreadyMovedMap = true;
}
