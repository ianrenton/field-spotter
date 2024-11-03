/////////////////////////////
//     CONTROLS SETUP      //
/////////////////////////////

// Manage boxes that slide out from the right
function manageRightBoxes(toggle, hide1, hide2, hide3, hide4, callback) {
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
    if ($(hide3).is(":visible")) {
      $(hide3).hide("slide", { direction: "right" }, 500);
      showDelay = 600;
    }
    if ($(hide4).is(":visible")) {
      $(hide4).hide("slide", { direction: "right" }, 500);
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
    if ($(hide3).is(":visible")) {
      $(hide3).hide();
    }
    if ($(hide4).is(":visible")) {
      $(hide4).hide();
    }
    $(toggle).toggle(0, callback);
  }
}

$("#infoButton").click(function() {
  manageRightBoxes("#infoPanel", "#filtersPanel", "#displayPanel", "#dataPanel", "#bandsPanel", null);
});
$("#filtersButton").click(function() {
  manageRightBoxes("#filtersPanel", "#displayPanel", "#dataPanel", "#infoPanel", "#bandsPanel", null);
});
$("#displayButton").click(function() {
  manageRightBoxes("#displayPanel", "#filtersPanel", "#dataPanel", "#infoPanel", "#bandsPanel", null);
});
$("#dataButton").click(function() {
  manageRightBoxes("#dataPanel", "#filtersPanel", "#displayPanel", "#infoPanel", "#bandsPanel", null);
});
$("#bandsButton").click(function() {
  manageRightBoxes("#bandsPanel", "#filtersPanel", "#displayPanel", "#dataPanel", "#infoPanel", function() {
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
  // If we just enabled a program, we have some extra fetching to do. If we just disabled one, we already have
  // more than the data we need, we just need to update the map markers to hide the new mode.
  if (enable) {
    fetchData();
  } else {
    updateMapObjects();
  }
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

// Show QRT
$("#showQRT").change(function() {
  showQRT = $(this).is(':checked');
  localStorage.setItem('showQRT', showQRT);
  updateMapObjects();
});

// QSY old spot behaviour
$("#showPreQSY").change(function() {
  showPreQSY = $(this).is(':checked');
  localStorage.setItem('showPreQSY', showPreQSY);
  $("#qsyOldSpotBehaviour").css("display", showPreQSY ? "inline-block" : "none");
  updateMapObjects();
});
$("#qsyOldSpotBehaviour").change(function() {
  qsyOldSpotBehaviour = $(this).val();
  localStorage.setItem('qsyOldSpotBehaviour', JSON.stringify(qsyOldSpotBehaviour));
  updateMapObjects();
});

// Link to program reference page
$("#linkToProgramRefEnabled").change(function() {
  linkToProgramRefEnabled = $(this).is(':checked');
  localStorage.setItem('linkToProgramRefEnabled', linkToProgramRefEnabled);
  updateMapObjects();
});

// Callsign lookup service
$("#linkToCallsignLookupServiceEnabled").change(function() {
  linkToCallsignLookupServiceEnabled = $(this).is(':checked');
  localStorage.setItem('linkToCallsignLookupServiceEnabled', linkToCallsignLookupServiceEnabled);
  $("#callsignLookupService").css("display", linkToCallsignLookupServiceEnabled ? "inline-block" : "none");
  updateMapObjects();
});
$("#callsignLookupService").change(function() {
  callsignLookupService = $(this).val();
  localStorage.setItem('callsignLookupService', JSON.stringify(callsignLookupService));
  updateMapObjects();
});

// Link to WebSDR
$("#linkToWebSDREnabled").change(function() {
  linkToWebSDREnabled = $(this).is(':checked');
  localStorage.setItem('linkToWebSDREnabled', linkToWebSDREnabled);
  updateMapObjects();
  $("#linkToWebSDRURL").css("display", linkToWebSDREnabled ? "block" : "none");
});
$("#linkToWebSDRURL").change(function() {
  linkToWebSDRURL = $(this).val();
  localStorage.setItem('linkToWebSDRURL', JSON.stringify(linkToWebSDRURL));
  updateMapObjects();
});

// Dark mode
$("#darkMode").change(function() {
  setDarkMode($(this).is(':checked'));
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