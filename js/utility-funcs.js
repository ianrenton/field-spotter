/////////////////////////////
//    UTILITY FUNCTIONS    //
/////////////////////////////

// Clean the data store by removing all spots older than the maximum allowed spot time of 1 hour. This ensures we do
// not endlessly use more memory if the software is left running.
function cleanDataStore() {
    // Clear existing POTA spots from the internal list
    Object.keys(spots).forEach(function (uid) {
        if (moment().diff(spots[uid].time, 'hours') > 1) {
            spots.delete(uid);
        }
    });
}

// Iterate through the list of spots, merging duplicates. If two or more spots with the same program, activator, reference, mode
// and frequency are found, these will be merged and reduced until only one remains, with the most recent timestamp and
// comment.
function removeDuplicates() {
    const spotsToRemove = [];
    spots.forEach(function (check) {
        spots.forEach(function (s) {
            if (s !== check) {
                if (s.program === check.program && s.activator === check.activator && s.ref === check.ref && s.freq === check.freq) {
                    if (s.mode === check.mode || s.mode === "Unknown" || check.mode === "Unknown") {
                        // Find which one to keep and which to delete
                        const checkSpotNewer = check.time.isAfter(s.time);
                        const keepSpot = checkSpotNewer ? check : s;
                        const deleteSpot = checkSpotNewer ? s : check;
                        // Update the "keep" spot if the older one had better data
                        if (keepSpot.mode === "Unknown" && deleteSpot.mode !== "Unknown") {
                            keepSpot.mode = deleteSpot.mode;
                        }
                        if (keepSpot.comment.length === 0 && deleteSpot.comment.length > 0) {
                            keepSpot.comment = deleteSpot.comment;
                        }
                        // Aggregate list of spots to remove
                        spotsToRemove.push(deleteSpot.uid);
                    }
                }
            }
        });
    });
    spotsToRemove.forEach(function (uid) {
        spots.delete(uid);
    });
}

// Iterate through a temporary list of spots, merging duplicates in a way suitable for the band panel. If two or more
// spots with the activator, mode and frequency are found, these will be merged and reduced until only one remains,
// with the best data. Note that unlike removeDuplicates(), which operates on the main spot map, this operates only
// on the temporary array of spots provided as an argument, and returns the output, for use when constructing the
// band panel.
function removeDuplicatesForBandPanel(spotList) {
    const spotsToRemove = [];
    spotList.forEach(function (check) {
        spotList.forEach(function (s) {
            if (s !== check) {
                if (s.activator === check.activator && s.freq === check.freq) {
                    if (s.mode === check.mode || s.mode === "Unknown" || check.mode === "Unknown") {
                        // Find which one to keep and which to delete
                        const checkSpotNewer = check.time.isAfter(s.time);
                        const keepSpot = checkSpotNewer ? check : s;
                        const deleteSpot = checkSpotNewer ? s : check;
                        // Update the "keep" spot if the older one had better data
                        if (keepSpot.mode === "Unknown" && deleteSpot.mode !== "Unknown") {
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
    const spotsToMark = [];
    spots.forEach(function (check) {
        spots.forEach(function (s) {
            if (s !== check) {
                if (s.program === check.program && s.activator === check.activator && s.ref === check.ref && (s.freq !== check.freq || s.mode !== check.mode)) {
                    // Find which one to mark as pre-qsy
                    const checkSpotNewer = check.time.isAfter(s.time);
                    const markSpot = checkSpotNewer ? s : check;
                    spotsToMark.push(markSpot.uid);
                }
            }
        });
    });
    spotsToMark.forEach(function (uid) {
        spots.get(uid).preqsy = true;
    });
}

// Utility to convert an object created by JSON.parse() into a proper JS map.
function objectToMap(o) {
    let m = new Map();
    for (let k of Object.keys(o)) {
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
    if (reftype === "Summit") {
        return "GMA";
    } else if (reftype === "WWFF") {
        return "WWFF";
    } else if (reftype === "IOTA Island") {
        return "IOTA";
    } else if (reftype === "Lighthouse (ILLW)" || reftype === "Lighthouse (ARLHS)") {
        return "Lighthouses";
    } else if (reftype === "Castle") {
        return "Castles";
    } else if (reftype === "Mill") {
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
    if (program === "POTA") {
        return "fa-tree";
    } else if (program === "SOTA") {
        return "fa-mountain-sun";
    } else if (program === "WWFF") {
        return "fa-seedling";
    } else if (program === "GMA") {
        return "fa-person-hiking";
    } else if (program === "Bunkers") {
        return "fa-radiation";
    } else if (program === "IOTA") {
        return "fa-umbrella-beach";
    } else if (program === "Castles") {
        return "fa-chess-rook";
    } else if (program === "Lighthouses") {
        return "fa-tower-observation";
    } else if (program === "Mills") {
        return "fa-fan";
    } else {
        return "fa-question";
    }
}

// Normalise a mode to caps and replace blanks with "Unknown". If the mode is not provided but a comment
// contains a mode-like string, use that instead
function normaliseMode(m, comment) {
    if (!m || m.length === 0) {
        let mode = "Unknown";
        ["CW", "PHONE", "SSB", "USB", "LSB", "FM", "DV", "DIGI", "DATA", "FT8", "FT4", "RTTY", "SSTV", "JS8"].forEach(function (test) {
            if (comment && comment.toUpperCase().includes(test)) {
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
        comment = comment.replace(/\[(.*?)]:/, "");
        comment = comment.replace(/\[(.*?)]/, "");
        comment = comment.replace(/""/, "");
        return comment.trim();
    }
}

// Take an activator's callsign and produce a URL to go to a relevant page from QRZ or HamQTH, depending
// on the user's choice. If they chose "None", null is returned here.
// If the callsign has prefixes or suffixes, we can't really tell what's what so assume the longest
// part of the given callsign is their "simple" callsign. e.g. "EA1/M0TRT/P" becomes "M0TRT".
function getURLforCallsign(callsign) {
    const shortCall = callsign.split("/").sort(function (a, b) {
        return b.length - a.length;
    })[0];
    if (callsignLookupService === "QRZ") {
        return "https://www.qrz.com/db/" + shortCall;
    } else if (callsignLookupService === "HamQTH") {
        return "https://www.hamqth.com/" + shortCall;
    } else {
        return null;
    }
}

// Take a program and reference, and produce a URL to go to the relevant part/summit/etc. page on
// the program's website.
function getURLforReference(program, reference) {
    if (program === "POTA") {
        return "https://pota.app/#/park/" + reference;
    } else if (program === "SOTA") {
        if (sotaLinksTo === "Sotadata") {
            return "https://www.sotadata.org.uk/en/summit/" + reference;
        } else if (sotaLinksTo === "Sotlas") {
            return "https://sotl.as/summits/" + reference;
        } else {
            return null;
        }
    } else if (program === "WWFF") {
        return "https://wwff.co/directory/?showRef=" + reference;
    } else if (program === "Bunkers") {
        if (reference.substring(0,3) === "B/G") {
            return "https://bunkerwiki.org/?s=" + reference;
        } else {
            return null;
        }
    } else if (program === "GMA" || program === "IOTA" || program === "Castles" || program === "Lighthouses" || program === "Mills") {
        return "https://www.cqgma.org/zinfo.php?ref=" + reference;
    } else {
        return null;
    }
}

// Take frequency and mode, and produce a WebSDR URL to listen in. Returns null if linkToWebSDREnabled is false.
// Freq in MHz.
function getURLForFrequency(freq, mode) {
    if (linkToWebSDREnabled) {
        let url = linkToWebSDRURL;
        if (url.slice(-1) === "/") {
            url = url.slice(0, -1);
        }

        // If the WebSDR requires a tuning offset so that the CW signal ends up in the passband, adjust the tuning accordingly. This
        // only applies to some SDRs (see #45) so it can be toggled by the user.
        let freqparam = (freq * 1000).toFixed(2);
        if (mode === "CW" && webSDRRequiresCWOffset) {
            freqparam = ((freq * 1000)-0.75).toFixed(2);
        }

        // Usually a mode from a spot is just "SSB" if SSB is in use, rather than LSB or USB. When giving the mode to
        // a WebSDR we need to specify USB or LSB.
        let modeparam = mode;
        if (mode === "SSB") {
            if (freq > 10) {
                modeparam = "USB";
            } else {
                modeparam = "LSB";
            }
        }

        // KiwiSDR and WebSDR require different URL params
        if (webSDRKiwiMode) {
            url += "/?f=" + freqparam + modeparam.toLowerCase();
        } else {
            url += "/?tune=" + freqparam + modeparam.toUpperCase();
        }
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
        || (modes.includes("Phone") && (mode === "PHONE" || mode === "SSB" || mode === "USB" || mode === "LSB" || mode === "AM" || mode === "FM" || mode === "DV" || mode === "Unknown"))
        || (modes.includes("Digi") && (mode === "DIGI" || mode === "DATA" || mode === "FT8" || mode === "FT4" || mode === "RTTY" || mode === "SSTV" || mode === "JS8"));
}

// Is the spot's band allowed through the filter?
function bandAllowedByFilters(band) {
    return bands.includes(band);
}

// Is the spot's age allowed through the filter?
// Note we have special handling for Bunkers. In BOTA programmes re-spotting doesn't typically happen,
// instead the activator sets their own spot to Live for the duration of their activation, then to
// QRT when done. So BOTA spots are allowed to live longer than the cut-off for other programmes,
// up to a fixed age of 12 hours to cut off anyone who forgot to mark their spot as QRT.
function ageAllowedByFilters(spotTime, program) {
    const age = moment().diff(spotTime, 'minutes');
    if (program !== "Bunkers") {
        return age < maxSpotAgeMin;
    } else {
        return age < 720;
    }
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
    return !preqsy || (showPreQSY && (qsyOldSpotBehaviour === "show" || qsyOldSpotBehaviour === "grey"
        || (qsyOldSpotBehaviour === "10mingrace" && moment().diff(spotTime, 'minutes') < 10)));
}

// Should the spot's pre-QSY (older than latest known frequency/mode change) status result in the spot being
// shown greyed out?
function preQSYStatusShouldShowGrey(preqsy) {
    return preqsy && qsyOldSpotBehaviour === "grey";
}

// Get the list of spot UIDs in the current map viewport
function getSpotUIDsInView() {
    const uids = [];
    map.eachLayer(function (layer) {
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
    const s = JSON.stringify(spot);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        chr = s.charCodeAt(i);
        h = ((h << 5) - h) + chr;
        h |= 0; // Convert to 32bit integer
    }
    return h;
}

// Depending on whether you are in light or dark mode, get the basemap name.
function getBasemapForTheme() {
    return darkMode ? BASEMAP_DARK : BASEMAP_LIGHT;
}

// Sets the UI to dark or light mode, and store the setting
function setDarkMode(newDarkMode) {
    darkMode = newDarkMode;

    document.documentElement.setAttribute("color-mode", darkMode ? "dark" : "light");
    const metaThemeColor = document.querySelector("meta[name=theme-color]");
    metaThemeColor.setAttribute("content", darkMode ? "black" : "white");

    $("#map").css('background-color', darkMode ? "black" : "white");

    if (newDarkMode) {
        maidenheadGrid.options.color = MAIDENHEAD_GRID_COLOR_DARK;
        cqZones.options.color = CQ_ZONES_COLOR_DARK;
        ituZones.options.color = ITU_ZONES_COLOR_DARK;
        wabGrid.options.color = WAB_GRID_COLOR_DARK;
    } else {
        maidenheadGrid.options.color = MAIDENHEAD_GRID_COLOR_LIGHT;
        cqZones.options.color = CQ_ZONES_COLOR_LIGHT;
        ituZones.options.color = ITU_ZONES_COLOR_LIGHT;
        wabGrid.options.color = WAB_GRID_COLOR_LIGHT;
    }
    if (showMaidenheadGrid) {
        map.removeLayer(maidenheadGrid);
        maidenheadGrid.addTo(map);
        backgroundTileLayer.bringToBack();
    }
    if (showCQZones) {
        map.removeLayer(cqZones);
        cqZones.addTo(map);
        backgroundTileLayer.bringToBack();
    }
    if (showITUZones) {
        map.removeLayer(ituZones);
        ituZones.addTo(map);
        backgroundTileLayer.bringToBack();
    }
    if (showWABGrid) {
        map.removeLayer(wabGrid);
        wabGrid.addTo(map);
        backgroundTileLayer.bringToBack();
    }

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

// Shows/hides the terminator overlay
function enableTerminator(show) {
    showTerminator = show;
    localStorage.setItem('showTerminator', show);

    if (terminator) {
        if (show) {
            terminator.addTo(map);
            backgroundTileLayer.bringToBack();
        } else {
            map.removeLayer(terminator);
        }
    }
}

// Shows/hides the Maidenhead grid overlay
function enableMaidenheadGrid(show) {
    showMaidenheadGrid = show;
    localStorage.setItem('showMaidenheadGrid', show);

    if (maidenheadGrid) {
        if (show) {
            maidenheadGrid.addTo(map);
            backgroundTileLayer.bringToBack();
        } else {
            map.removeLayer(maidenheadGrid);
        }
    }
}

// Shows/hides the CQ zone overlay
function enableCQZones(show) {
    showCQZones = show;
    localStorage.setItem('showCQZones', show);

    if (cqZones) {
        if (show) {
            cqZones.addTo(map);
            backgroundTileLayer.bringToBack();
        } else {
            map.removeLayer(cqZones);
        }
    }
}

// Shows/hides the ITU zone overlay
function enableITUZones(show) {
    showITUZones = show;
    localStorage.setItem('showITUZones', show);

    if (ituZones) {
        if (show) {
            ituZones.addTo(map);
            backgroundTileLayer.bringToBack();
        } else {
            map.removeLayer(ituZones);
        }
    }
}

// Shows/hides the WAB grid overlay
function enableWABGrid(show) {
    showWABGrid = show;
    localStorage.setItem('showWABGrid', show);

    if (wabGrid) {
        if (show) {
            wabGrid.addTo(map);
            backgroundTileLayer.bringToBack();
        } else {
            map.removeLayer(wabGrid);
        }
    }
}

// Debounce calls to function
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}
