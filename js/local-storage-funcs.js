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

  // Show QRT
  showQRT = localStorageGetOrDefault('showQRT', showQRT);
  $("#showQRT").prop('checked', showQRT);

  // QSY old spot behaviour
  showPreQSY = localStorageGetOrDefault('showPreQSY', showPreQSY);
  $("#showPreQSY").prop('checked', showPreQSY);
  $("#qsyOldSpotBehaviour").css("display", showPreQSY ? "inline-block" : "none");
  qsyOldSpotBehaviour = localStorageGetOrDefault('qsyOldSpotBehaviour', qsyOldSpotBehaviour);
  $("#qsyOldSpotBehaviour").val(qsyOldSpotBehaviour);

  // Link to program page
  linkToProgramRefEnabled = localStorageGetOrDefault('linkToProgramRefEnabled', linkToProgramRefEnabled);
  $("#linkToProgramRefEnabled").prop('checked', linkToProgramRefEnabled);

  // Link to callsign lookup service
  linkToCallsignLookupServiceEnabled = localStorageGetOrDefault('linkToCallsignLookupServiceEnabled', linkToCallsignLookupServiceEnabled);
  $("#linkToCallsignLookupServiceEnabled").prop('checked', linkToCallsignLookupServiceEnabled);
  $("#callsignLookupService").css("display", linkToCallsignLookupServiceEnabled ? "inline-block" : "none");
  callsignLookupService = localStorageGetOrDefault('callsignLookupService', callsignLookupService);
  $("#callsignLookupService").val(callsignLookupService);

  // link to WebSDR
  linkToWebSDREnabled = localStorageGetOrDefault('linkToWebSDREnabled', linkToWebSDREnabled);
  $("#linkToWebSDREnabled").prop('checked', linkToWebSDREnabled);
  $("#linkToWebSDRURL").css("display", linkToWebSDREnabled ? "block" : "none");
  linkToWebSDRURL = localStorageGetOrDefault('linkToWebSDRURL', linkToWebSDRURL);
  $("#linkToWebSDRURL").val(linkToWebSDRURL);

  // Dark mode
  darkMode = localStorageGetOrDefault('darkMode', darkMode);
  $("#darkMode").prop('checked', darkMode);
  setDarkMode(darkMode);

  // Passive display mode
  passiveDisplay = localStorageGetOrDefault('passiveDisplay', passiveDisplay);
  $("#passiveDisplay").prop('checked', passiveDisplay);

  // Enable animation
  enableAnimation = localStorageGetOrDefault('enableAnimation', enableAnimation);
  $("#enableAnimation").prop('checked', enableAnimation);
}