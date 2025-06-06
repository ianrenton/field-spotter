/////////////////////////////
//         STARTUP         //
/////////////////////////////

import "./globals.js"
import {runPWASetup} from "./pwa-funcs.js";
import {setUpMap} from "./map-setup-funcs.js";
import {loadLocalStorage} from "./local-storage-funcs.js";
import {setUpJQueryBindings} from "./ui-funcs.js";
import {requestGeolocation} from "./geolocation-funcs.js";
import {fetchData, checkForUpdate} from "./api-funcs.js";

export function startup() {
    // Run PWA setup
    runPWASetup();
    // Set up map
    setUpMap();
    // Load settings
    loadLocalStorage();
    // Set up UI bindings
    setUpJQueryBindings();
    // Request geolocation
    requestGeolocation();
    // Load data for the first time
    fetchData();
    // Every second, check if we need to update data based on the user's configured update interval,
    // and update other UI elements regarding data age.
    setInterval(checkForUpdate, 1000);
    // Update terminator/greyline every 5 minutes
    setInterval(function () {
        terminator.setTime()
    }, 300);
}