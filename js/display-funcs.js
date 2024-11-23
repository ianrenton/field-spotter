/////////////////////////////
//   UI UPDATE FUNCTIONS   //
/////////////////////////////
// noinspection DuplicatedCode

// Update the objects that are rendered on the map. Clear old markers and draw new ones. This is
// called when the data model changes due to a server query.
function updateMapObjects() {
    // Iterate through spots, sorted by time so that new markers are created on top of older ones. For each, update an existing marker
    // or create a new marker if required.
    const spotObjects = Array.from(spots.values());
    spotObjects.sort((a, b) => a.time.diff(b.time));
    spotObjects.forEach(function (s) {
        const pos = getIconPosition(s);

        // Filter for the time threshold, programs, bands and modes we are interested in.
        // Also filter out spots where comments include "QRT" (shut down), and those before
        // "QSY" (frequency change) if requested.
        if (ageAllowedByFilters(s.time) && programAllowedByFilters(s.program) && modeAllowedByFilters(s.mode) && bandAllowedByFilters(s.band)
            && qrtStatusAllowedByFilters(s.qrt) && preQSYStatusAllowedByFilters(s.preqsy, s.time)) {

            if (markers.has(s.uid) && pos != null) {
                // Existing marker, so update it
                let m = markers.get(s.uid);

                // Regenerate marker color & text in case the spot has updated
                m.setIcon(getIcon(s));

                // Set tooltip
                m.tooltip = getTooltipText(s);
                if (passiveDisplay) {
                    m.bindTooltip(getPassiveDisplayTooltipText(s), {permanent: true, direction: 'top', offset: L.point(0, -40)});
                }

                // Set opacity with age
                let age = moment().diff(s.time, 'minutes');
                let opacity = ((maxSpotAgeMin - age) / maxSpotAgeMin / 2.0) + 0.5;
                m.setOpacity(opacity);

            } else if (pos != null) {
                // No existing marker, data is valid, so create
                let m = L.marker(pos, {icon: getIcon(s)});
                m.uid = s.uid;

                // Add to map and spiderfier
                markersLayer.addLayer(m);
                oms.addMarker(m);

                // Set tooltip
                m.tooltip = getTooltipText(s);
                if (passiveDisplay) {
                    m.bindTooltip(getPassiveDisplayTooltipText(s), {permanent: true, direction: 'top', offset: L.point(0, -40)});
                }

                // Set opacity with age
                let age = moment().diff(s.time, 'minutes');
                let opacity = ((maxSpotAgeMin - age) / maxSpotAgeMin / 2.0) + 0.5;
                m.setOpacity(opacity);

                // Add to internal data store
                markers.set(s.uid, m);
            }

        } else if (markers.has(s.uid)) {
            // Existing marker now excluded by filters, so remove
            const marker = markers.get(s.uid);
            marker.closePopup();
            markersLayer.removeLayer(marker);
            markers.delete(s.uid);
        }
    });

    // Iterate through markers. If one corresponds to a dropped spot, delete it
    markers.forEach(function (marker, uid) {
        if (!spots.has(uid)) {
            marker.closePopup();
            markersLayer.removeLayer(marker);
            markers.delete(uid);
        }
    });
}

// Recalculate the contents of the "bands" popout panel. Called when it is pulled
// out, plus on every map pan/zoom event while it is open.
function recalculateBandsPanelContent() {
    // Get all spots currently in view
    const spotsForBandDisplay = getSpotUIDsInView().map(function (uid) {
        return spots.get(uid);
    });
    // Stop here if nothing to display
    let bandsPanelInner = $("#bandsPanelInner");
    if (spotsForBandDisplay.length === 0) {
        bandsPanelInner.html("<p id='bandPanelNoSpots'>There are no spots in view on the map. Pan and zoom to find some, or alter your filters, before using the band view.</p>");
        return;
    }
    // Convert to a map of band names to the spots on that band. Bands with no
    // spots in view will not be present.
    const bandToSpots = new Map();
    const bandNames = BANDS.map(function (b) {
        return b.name
    });
    bandNames.forEach(function (bandName) {
        const matchingSpots = spotsForBandDisplay.filter(function (s) {
            return s.band === bandName;
        });
        if (matchingSpots.length > 0) {
            bandToSpots.set(bandName, matchingSpots);
        }
    });
    // Build up HTML content for each band
    let html = "";
    const columnWidthPercent = Math.max(30, 100 / bandToSpots.size);
    let columnIndex = 0;
    bandToSpots.forEach(function (spotList, bandName) {
        // Get the band for these spots and prepare the header
        let band = BANDS.filter(function (b) {
            return b.name === bandName;
        })[0];
        html += "<div class='bandCol' style='width:" + columnWidthPercent + "%'>";
        html += "<div class='bandColHeader' style='background-color:" + band.color + "; color:" + band.contrastColor + "'>" + band.name + "</div>";
        html += "<div class='bandColMiddle'>";

        // Do some harsher de-duping. Because we only display callsign, frequency and mode here, the previous
        // de-duplication could have let some through that don't look like dupes on the map, but would do here.
        // Typically that's a person activating two programs at the same time, e.g. POTA & WWFF.
        spotList = removeDuplicatesForBandPanel(spotList);

        // Start printing the band
        const freqStep = (band.stopFreq - band.startFreq) / 40.0;
        html += "<ul>";
        html += "<li><span>-</span></li>";

        // Do 40 steps down the band
        for (let i = 0; i <= 40; i++) {

            // Work out if there are any spots in this step
            const freqStepStart = band.startFreq + i * freqStep;
            const freqStepEnd = freqStepStart + freqStep;
            const spotsInStep = spotList.filter(function (s) {
                // Normally we do >= start and < end, but in the special case where this is the last step and there is a spot
                // right at the end of the band, we include this too
                return s.freq >= freqStepStart && (s.freq < freqStepEnd || (s.freq === freqStepEnd && freqStepEnd === band.stopFreq));
            });

            if (spotsInStep.length > 0) {
                // If this step has spots in it, print them
                html += "<li class='withSpots'><span>";
                spotsInStep.sort((a, b) => (a.freq > b.freq) ? 1 : ((b.freq > a.freq) ? -1 : 0));
                spotsInStep.forEach(function (s) {
                    // Figure out the class to use for the spot's div, which defines its colour.
                    let spotDivClass = "bandColSpotCurrent";
                    if (currentPopupSpotUID === s.uid) {
                        spotDivClass = "bandColSpotSelected";
                    } else if (preQSYStatusShouldShowGrey(s.preqsy)) {
                        spotDivClass = "bandColSpotOld";
                    }
                    html += "<div class='bandColSpot " + spotDivClass + "' onClick='handleBandPanelSpotClick(\"" + s.uid + "\")'>" + s.activator + "<br/>" + (s.freq).toFixed(3);
                    if (s.mode != null && s.mode.length > 0 && s.mode !== "Unknown") {
                        html += " " + s.mode;
                    }
                    html += "</div>";
                });
                html += "</li></span>";

            } else {
                // Step had no spots in it, so just print a marker. This is a frequency on multiples of 4, or a dash otherwise.
                if (i % 4 === 0) {
                    html += "<li><span>&mdash;" + (band.startFreq + i * freqStep).toFixed(3) + "</span></li>";
                } else if (i % 4 === 2) {
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
    bandsPanelInner.html(html);

    // Desktop mouse wheel to scroll bands horizontally if used on the headers
    // noinspection JSDeprecatedSymbols
    $(".bandColHeader").on("wheel", () => bandsPanelInner.scrollLeft(bandsPanelInner.scrollLeft() + event.deltaY / 10.0));

    // On desktop, resize the bands panel. By default this is 30em, roughly matching 100% of a mobile device width,
    // but it looks better on desktop if we size it to something larger or smaller depending on the number of bands
    // we want to display. On mobile displays, we keep it as 100% as defined in CSS.
    if (!onMobile) {
        const percentWidth = Math.min(5 + bandToSpots.size * 8, 40);
        $("#bandsPanel").css("width", percentWidth + "%");
    } else {
        $("#bandsPanel").css("width", "100%");
    }
}


/////////////////////////////
//  SPOT DISPLAY FUNCTIONS //
/////////////////////////////

// Tooltip text for the normal click-to-appear tooltips
function getTooltipText(s) {
    // Activator
    let ttt = "";
    const callsignURL = getURLforCallsign(s.activator);
    if (linkToCallsignLookupServiceEnabled && callsignURL != null) {
        ttt += "<a href='" + callsignURL + "' target='_blank'>";
    }
    ttt += "<i class='fa-solid fa-user markerPopupIcon'></i>&nbsp;" + s.activator;
    if (linkToCallsignLookupServiceEnabled && callsignURL != null) {
        ttt += "</a>";
    }
    ttt += "<br/>";

    // Park/summit
    if (linkToProgramRefEnabled) {
        ttt += "<a href='" + getURLforReference(s.program, s.ref) + "' target='_blank'>";
    }
    ttt += "<span style='display:inline-block; white-space: nowrap;'>";
    ttt += "<i class='fa-solid " + getIconName(s.program) + " markerPopupIcon'></i>&nbsp;";
    ttt += "<span class='popupRefName'>" + s.ref + " " + s.refName + "</span></span>";
    if (linkToProgramRefEnabled) {
        ttt += "</a>";
    }
    ttt += "<br/>";

    // Frequency & band
    const urlForFreq = getURLForFrequency(s.freq);
    if (urlForFreq != null) {
        ttt += "<a href='" + urlForFreq + "' target='_blank'>";
    }
    ttt += "<i class='fa-solid fa-walkie-talkie markerPopupIcon'></i>&nbsp;" + s.freq.toFixed(3) + " MHz";
    if (urlForFreq != null) {
        ttt += "</a>";
    }

    ttt += " (" + s.band + ")";

    // Mode
    if (s.mode !== "Unknown") {
        ttt += " &nbsp;&nbsp; <i class='fa-solid fa-wave-square markerPopupIcon'></i>&nbsp;" + s.mode;
    }
    ttt += "<br/>";

    // Pre-QSY warning
    if (s.preqsy) {
        ttt += "<i class='fa-solid fa-triangle-exclamation'></i>&nbsp;Pre-QSY<br/>";
    }

    // Distance & bearing
    if (myPos != null) {
        let spotLatLng = new L.LatLng(s["lat"], s["lon"])
        let bearing = L.GeometryUtil.bearing(myPos, spotLatLng);
        if (bearing < 0) bearing = bearing + 360;
        let distance = L.GeometryUtil.length([myPos, spotLatLng]) / 1000.0;
        ttt += "<i class='fa-solid fa-ruler markerPopupIcon'></i>&nbsp;" + distance.toFixed(0) + "km &nbsp;&nbsp; <i class='fa-solid fa-compass markerPopupIcon'></i>&nbsp;" + bearing.toFixed(0) + "°<br/>";
    }

    // Time
    ttt += "<i class='fa-solid fa-clock markerPopupIcon'></i>&nbsp;" + s.time.format("HH:mm UTC") + " (" + s.time.fromNow() + ")";

    // Comment
    if (s.comment != null && s.comment.length > 0) {
        ttt += "<br/><i class='fa-solid fa-comment markerPopupIcon'></i> " + s.comment;
    }

    // Respotting form
    if (respottingEnabled && myCallsign.length > 0 && s.program === "POTA") {
        ttt += "<form onsubmit='respot(\"" + s.uid + "\"); return false;' class='respotForm'><input type='text' id='respotCommentFor" + s.uid + "' class='respotCommentBox textBox' name='comment' placeholder='Comment' /><button type='submit' class='configButton respotButton'>Re-Spot</button>&nbsp;<span id='respotStatusFor" + s.uid + "' /></form>";
    }

    return ttt;
}

// Tooltip text for the "passive mode" permanent tooltips
function getPassiveDisplayTooltipText(s) {
    let ttt = "<i class='fa-solid fa-user markerPopupIcon'></i> " + s.activator + "<br/>";
    ttt += "<i class='fa-solid fa-walkie-talkie markerPopupIcon'></i> " + s.freq.toFixed(3);
    if (s.mode !== "Unknown") {
        ttt += " " + s.mode;
    }
    return ttt;
}

// Gets the lat/long position for the icon representing a spot. Null is returned if the position
// is unknown or 0,0. If the user's own geolocation has been provided, we adjust the longitude of the
// spot to be their longitude +-180 degrees, so that we are correctly displaying markers either
// side of them on the map, and calculating the great circle distance and bearing as the short
// path.
function getIconPosition(s) {
    if (s["lat"] != null && s["lon"] != null && !isNaN(s["lat"]) && !isNaN(s["lon"]) && (s["lat"] !== 0.0 || s["lon"] !== 0.0)) {
        let wrapEitherSideOfLon = 0;
        if (myPos != null) {
            wrapEitherSideOfLon = myPos.lng;
        }
        let tmpLon = s["lon"];
        while (tmpLon < wrapEitherSideOfLon - 180) {
            tmpLon += 360;
        }
        while (tmpLon > wrapEitherSideOfLon + 180) {
            tmpLon -= 360;
        }
        return [s["lat"], tmpLon];
    } else {
        return null;
    }
}

// Handler for clicking a spot in the band panel.
function handleBandPanelSpotClick(uid) {
    // Open the popup for the marker
    centreAndPopupMarker(uid);

    // If on mobile, hide the band panel so you can see what happened
    if (onMobile) {
        if (enableAnimation) {
            $("#bandsPanel").hide("slide", {direction: "right"}, 500);
        } else {
            $("#bandsPanel").hide();
        }
    }
}

// Centre on the marker representing the spot with the provided UID, and open its popup.
// Used when clicking a spot in the band display.
function centreAndPopupMarker(uid) {
    // Close any existing popup and remove any existing line
    map.closePopup();
    if (currentLineToSpot != null) {
        map.removeLayer(currentLineToSpot);
    }

    // Get the new marker to centre and pop up on
    const m = markers.get(uid);
    if (m != null) {
        // Pan to position, including zooming if necessary
        map.setView(m.getLatLng(), (map.getZoom() < 5) ? 5 : map.getZoom(), {
            animate: enableAnimation,
            duration: enableAnimation ? 1.0 : 0.0
        });
        // After map move, open the tooltip (unless in passive display, when it will already be open)
        setTimeout(function () {
            if (!passiveDisplay) {
                openSpiderfierPopup(m);
            }
        }, enableAnimation ? 1000 : 0);
    }
}

// On marker click (after spiderfy when required), open popup. Also called when clicking
// a spot in the band display. This is needed instead of just doing marker.openTooltip()
// due to the way the spiderfier plugin needs to capture click events and manage a single
// global popup.
function openSpiderfierPopup(marker) {
    // Set popup content and position
    globalPopup.setContent(marker.tooltip);
    globalPopup.setLatLng(marker.getLatLng());

    // Add a callback to remove the line linking the marker to my position, and stop any
    // highlight on the band display, on popup close.
    globalPopup.on('remove', function () {
        if (currentLineToSpot != null) {
            map.removeLayer(currentLineToSpot);
        }
        // noinspection JSUndeclaredVariable
        currentPopupSpotUID = null;
        if ($("#bandsPanel").is(":visible")) {
            recalculateBandsPanelContent();
        }
    });

    // Open the popup
    map.openPopup(globalPopup);

    // Draw a line linking the marker to my position.
    if (myPos != null && spots.get(marker.uid) != null) {
        if (currentLineToSpot != null) {
            map.removeLayer(currentLineToSpot);
        }
        currentLineToSpot = L.geodesic([myPos, marker.getLatLng()], {
            color: freqToColor(spots.get(marker.uid).freq),
            wrap: false,
            steps: 5
        }).addTo(map);
    }

    // Store the UID of the selected marker, for highlighting in the band display if necessary
    currentPopupSpotUID = marker.uid;
    if ($("#bandsPanel").is(":visible")) {
        recalculateBandsPanelContent();
    }
}
