/////////////////////////////
//     CONTROLS SETUP      //
/////////////////////////////
// noinspection JSJQueryEfficiency

import "./globals.js";
import {fetchData, potaRespot} from "./api-funcs.js";
import {updateMapObjects, recalculateBandsPanelContent} from "./display-funcs.js";
import {requestGeolocation, setOwnLocation} from "./geolocation-funcs.js";
import {enableMaidenheadGrid, enableTerminator, enableWABGrid, setDarkMode} from "./utility-funcs.js";

// Manage boxes that slide out from the right
function manageRightBoxes(toggle, hide1, hide2, hide3, hide4, callback) {
    let showDelay = 0;
    if (enableAnimation) {
        if ($(hide1).is(":visible")) {
            $(hide1).hide("slide", {direction: "right"}, 500);
            showDelay = 600;
        }
        if ($(hide2).is(":visible")) {
            $(hide2).hide("slide", {direction: "right"}, 500);
            showDelay = 600;
        }
        if ($(hide3).is(":visible")) {
            $(hide3).hide("slide", {direction: "right"}, 500);
            showDelay = 600;
        }
        if ($(hide4).is(":visible")) {
            $(hide4).hide("slide", {direction: "right"}, 500);
            showDelay = 600;
        }

        if (!$(toggle).is(":visible")) {
            setTimeout(function () {
                $("#closeButton").show();
            }, showDelay + 500);
        } else {
            $("#closeButton").hide();
        }
        setTimeout(function () {
            $(toggle).toggle("slide", {direction: "right"}, 500, callback);
        }, showDelay);

    } else {
        if ($(hide1).is(":visible")) {
            $(hide1).hide();
        }
        if ($(hide2).is(":visible")) {
            $(hide2).hide();
        }
        if ($(hide3).is(":visible")) {
            $(hide3).hide();
        }
        if ($(hide4).is(":visible")) {
            $(hide4).hide();
        }
        $(toggle).toggle(0, callback);
        if ($(toggle).is(":visible")) {
            $("#closeButton").show();
        } else {
            $("#closeButton").hide();
        }
    }
}

// Close all right boxes
function closeRightBoxes() {
    let allBoxes = ["#infoPanel", "#filtersPanel", "#displayPanel", "#dataPanel", "#bandsPanel"];
    for (let i = 0; i < allBoxes.length; i++) {
        if (enableAnimation) {
            if ($(allBoxes[i]).is(":visible")) {
                $(allBoxes[i]).hide("slide", {direction: "right"}, 500);
            }
        } else {
            $(allBoxes[i]).hide();
        }
        $("#closeButton").hide();
    }
}

// Set own position to the provided value and store it
export function setOwnPositionOverride(latlon) {
    myPos = latlon;
    ownPosOverride = latlon;
    localStorage.setItem('ownPosOverride', JSON.stringify(latlon));
    $("#ownPosOverrideCheckbox").prop('checked', true);
    $("#ownPosOverrideConfig").css("display", "inline-block");
    $("#ownPosOverrideLat").val(latlon.lat.toFixed(5));
    $("#ownPosOverrideLon").val(latlon.lng.toFixed(5));

    // Update map objects to add distance and bearing to tooltips
    updateMapObjects();
}

// Set program show/hide
function setProgramEnable(type, enable) {
    if (enable) {
        programs.push(type);
    } else {
        for (let i = 0; i < programs.length; i++) {
            if (programs[i] === type) {
                programs.splice(i, 1);
            }
        }
    }
    localStorage.setItem('programs', JSON.stringify(programs));
    // If we just enabled a program, we have some extra fetching to do. If we just disabled one, we already have
    // more than the data we need, we just need to update the map markers to hide the new mode.
    if (enable) {
        fetchData();
    } else {
        updateMapObjects();
    }
}

// Set mode show/hide
function setModeEnable(type, enable) {
    if (enable) {
        modes.push(type);
    } else {
        for (let i = 0; i < modes.length; i++) {
            if (modes[i] === type) {
                modes.splice(i, 1);
            }
        }
    }
    localStorage.setItem('modes', JSON.stringify(modes));
    updateMapObjects();
}

// Set band show/hide
function setBandEnable(type, enable) {
    if (enable) {
        bands.push(type);
    } else {
        for (let i = 0; i < bands.length; i++) {
            if (bands[i] === type) {
                bands.splice(i, 1);
            }
        }
    }
    localStorage.setItem('bands', JSON.stringify(bands));
    updateMapObjects();
}

// Set up jQuery bindings
export function setUpJQueryBindings() {
    $("#infoButton").click(function () {
        manageRightBoxes("#infoPanel", "#filtersPanel", "#displayPanel", "#dataPanel", "#bandsPanel", null);
    });
    $("#filtersButton").click(function () {
        manageRightBoxes("#filtersPanel", "#displayPanel", "#dataPanel", "#infoPanel", "#bandsPanel", null);
    });
    $("#displayButton").click(function () {
        manageRightBoxes("#displayPanel", "#filtersPanel", "#dataPanel", "#infoPanel", "#bandsPanel", null);
    });
    $("#dataButton").click(function () {
        manageRightBoxes("#dataPanel", "#filtersPanel", "#displayPanel", "#infoPanel", "#bandsPanel", null);
    });
    $("#bandsButton").click(function () {
        manageRightBoxes("#bandsPanel", "#filtersPanel", "#displayPanel", "#dataPanel", "#infoPanel", function () {
            // Check if we showed the bands panel, if so recalculate its content
            if ($("#bandsPanel").is(":visible")) {
                recalculateBandsPanelContent();
            }
        });
    });
    $("#closeButton").click(function () {
        closeRightBoxes();
    });

    // Manual update button
    $("#updateNow").click(function () {
        fetchData();
    });

    // Update interval
    $("#updateInterval").change(function () {
        updateIntervalMin = parseInt($(this).val());
        localStorage.setItem('updateIntervalMin', updateIntervalMin);
    });

    // Max spot age
    $("#maxSpotAge").change(function () {
        maxSpotAgeMin = parseInt($(this).val());
        localStorage.setItem('maxSpotAgeMin', maxSpotAgeMin);
        updateMapObjects();
    });

    // Programs
    $("#showPOTA").change(function () {
        setProgramEnable("POTA", $(this).is(':checked'));
    });
    $("#showSOTA").change(function () {
        setProgramEnable("SOTA", $(this).is(':checked'));
    });
    $("#showWWFF").change(function () {
        setProgramEnable("WWFF", $(this).is(':checked'));
    });
    $("#showGMA").change(function () {
        setProgramEnable("GMA", $(this).is(':checked'));
    });
    $("#showBunkers").change(function () {
        setProgramEnable("Bunkers", $(this).is(':checked'));
    });
    $("#showIOTA").change(function () {
        setProgramEnable("IOTA", $(this).is(':checked'));
    });
    $("#showCastles").change(function () {
        setProgramEnable("Castles", $(this).is(':checked'));
    });
    $("#showLighthouses").change(function () {
        setProgramEnable("Lighthouses", $(this).is(':checked'));
    });
    $("#showMills").change(function () {
        setProgramEnable("Mills", $(this).is(':checked'));
    });

    // Modes
    $("#showPhone").change(function () {
        setModeEnable("Phone", $(this).is(':checked'));
    });
    $("#showCW").change(function () {
        setModeEnable("CW", $(this).is(':checked'));
    });
    $("#showDigi").change(function () {
        setModeEnable("Digi", $(this).is(':checked'));
    });

    // Bands
    $("#show160m").change(function () {
        setBandEnable("160m", $(this).is(':checked'));
    });
    $("#show80m").change(function () {
        setBandEnable("80m", $(this).is(':checked'));
    });
    $("#show60m").change(function () {
        setBandEnable("60m", $(this).is(':checked'));
    });
    $("#show40m").change(function () {
        setBandEnable("40m", $(this).is(':checked'));
    });
    $("#show30m").change(function () {
        setBandEnable("30m", $(this).is(':checked'));
    });
    $("#show20m").change(function () {
        setBandEnable("20m", $(this).is(':checked'));
    });
    $("#show17m").change(function () {
        setBandEnable("17m", $(this).is(':checked'));
    });
    $("#show15m").change(function () {
        setBandEnable("15m", $(this).is(':checked'));
    });
    $("#show12m").change(function () {
        setBandEnable("12m", $(this).is(':checked'));
    });
    $("#show10m").change(function () {
        setBandEnable("10m", $(this).is(':checked'));
    });
    $("#show6m").change(function () {
        setBandEnable("6m", $(this).is(':checked'));
    });
    $("#show4m").change(function () {
        setBandEnable("4m", $(this).is(':checked'));
    });
    $("#show2m").change(function () {
        setBandEnable("2m", $(this).is(':checked'));
    });
    $("#show70cm").change(function () {
        setBandEnable("70cm", $(this).is(':checked'));
    });
    $("#show23cm").change(function () {
        setBandEnable("23cm", $(this).is(':checked'));
    });
    $("#show13cm").change(function () {
        setBandEnable("13cm", $(this).is(':checked'));
    });

    // Show QRT
    $("#showQRT").change(function () {
        showQRT = $(this).is(':checked');
        localStorage.setItem('showQRT', showQRT);
        updateMapObjects();
    });

    // QSY old spot behaviour
    $("#showPreQSY").change(function () {
        showPreQSY = $(this).is(':checked');
        localStorage.setItem('showPreQSY', showPreQSY);
        $("#qsyOldSpotBehaviour").css("display", showPreQSY ? "inline-block" : "none");
        updateMapObjects();
    });
    $("#qsyOldSpotBehaviour").change(function () {
        qsyOldSpotBehaviour = $(this).val();
        localStorage.setItem('qsyOldSpotBehaviour', JSON.stringify(qsyOldSpotBehaviour));
        updateMapObjects();
    });

    // Link to program reference page
    $("#linkToProgramRefEnabled").change(function () {
        linkToProgramRefEnabled = $(this).is(':checked');
        localStorage.setItem('linkToProgramRefEnabled', linkToProgramRefEnabled);
        $("#sotaLinksToRow").css("display", linkToProgramRefEnabled ? "inline-block" : "none");
        updateMapObjects();
    });
    $("#sotaLinksTo").change(function () {
        sotaLinksTo = $(this).val();
        localStorage.setItem('sotaLinksTo', JSON.stringify(sotaLinksTo));
        updateMapObjects();
    });

    // Callsign lookup service
    $("#linkToCallsignLookupServiceEnabled").change(function () {
        linkToCallsignLookupServiceEnabled = $(this).is(':checked');
        localStorage.setItem('linkToCallsignLookupServiceEnabled', linkToCallsignLookupServiceEnabled);
        $("#callsignLookupServiceRow").css("display", linkToCallsignLookupServiceEnabled ? "inline-block" : "none");
        updateMapObjects();
    });
    $("#callsignLookupService").change(function () {
        callsignLookupService = $(this).val();
        localStorage.setItem('callsignLookupService', JSON.stringify(callsignLookupService));
        updateMapObjects();
    });

    // Link to WebSDR
    $("#linkToWebSDREnabled").change(function () {
        linkToWebSDREnabled = $(this).is(':checked');
        localStorage.setItem('linkToWebSDREnabled', linkToWebSDREnabled);
        updateMapObjects();
        $("#linkToWebSDRURL").css("display", linkToWebSDREnabled ? "block" : "none");
        $("#webSDRRequiresCWOffsetLabel").css("display", linkToWebSDREnabled ? "block" : "none");
        $("#webSDRKiwiModeLabel").css("display", linkToWebSDREnabled ? "block" : "none");
    });
    $("#linkToWebSDRURL").change(function () {
        linkToWebSDRURL = $(this).val();
        localStorage.setItem('linkToWebSDRURL', JSON.stringify(linkToWebSDRURL));
        updateMapObjects();
    });
    $("#webSDRRequiresCWOffset").change(function () {
        webSDRRequiresCWOffset = $(this).is(':checked');
        localStorage.setItem('webSDRRequiresCWOffset', webSDRRequiresCWOffset);
        updateMapObjects();
    });
    $("#webSDRKiwiMode").change(function () {
        webSDRKiwiMode = $(this).is(':checked');
        localStorage.setItem('webSDRKiwiMode', webSDRKiwiMode);
        updateMapObjects();
    });

    // Position override - checkbox
    $("#ownPosOverrideCheckbox").change(function () {
        // If unchecked, remove the own position override and process automatic geolocation again.
        // If checked, *don't* actually do anything yet besides making the config visible. The
        // "Set" button must be clicked to actually set the value, otherwise we'll be moving markers
        // and regenerating objects on every digit entered.
        const ownPosOverrideSet = $(this).is(':checked');
        if (!ownPosOverrideSet) {
            ownPosOverride = null;
            localStorage.setItem('ownPosOverride', null);
            requestGeolocation();
        }
        $("#ownPosOverrideConfig").css("display", ownPosOverrideSet ? "inline-block" : "none");
    });

    // Position override - set button
    $("#ownPosOverrideSetButton").click(function () {
        ownPosOverride = new L.LatLng(parseFloat($("#ownPosOverrideLat").val()), parseFloat($("#ownPosOverrideLon").val()));
        setOwnLocation(ownPosOverride);
        localStorage.setItem('ownPosOverride', JSON.stringify(ownPosOverride));
    });

    // Re-spotting
    $("#respottingEnabled").change(function () {
        respottingEnabled = $(this).is(':checked');
        localStorage.setItem('respottingEnabled', respottingEnabled);
        updateMapObjects();
        $("#myCallsignLabel").css("display", respottingEnabled ? "inline-block" : "none");
    });

    // My callsign (for re-spotting)
    $("#myCallsign").change(function () {
        myCallsign = $(this).val();
        localStorage.setItem('myCallsign', JSON.stringify(myCallsign));
        updateMapObjects();
    });

    // Show Terminator overlay
    $("#showTerminator").change(function () {
        enableTerminator($(this).is(':checked'));
    });

    // Show Maidenhead grid overlay
    $("#showMaidenheadGrid").change(function () {
        enableMaidenheadGrid($(this).is(':checked'));
    });

    // Show WAB grid overlay
    $("#showWABGrid").change(function () {
        enableWABGrid($(this).is(':checked'));
    });

    // Dark mode
    $("#darkMode").change(function () {
        setDarkMode($(this).is(':checked'));
    });

    // Passive mode
    $("#passiveDisplay").change(function () {
        passiveDisplay = $(this).is(':checked');
        // When toggling passive display on or off, delete and regenerate all markers
        markers.forEach(function (marker, uid) {
            marker.closePopup();
            markersLayer.removeLayer(marker);
            markers.delete(uid);
        });
        localStorage.setItem('passiveDisplay', passiveDisplay);
        updateMapObjects();
    });

    // Enable animation
    $("#enableAnimation").change(function () {
        enableAnimation = $(this).is(':checked');
        localStorage.setItem('enableAnimation', enableAnimation);
    });
}

// Respot form handling
export function respot(uid) {
    // Fetch the user's comment from the form
    const comment = $("input#respotCommentFor" + uid).val();

    // Post to POTA API
    potaRespot(uid, comment, $("span#respotStatusFor" + uid));
}