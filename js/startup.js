/////////////////////////////
//         STARTUP         //
/////////////////////////////

// Set up map
setUpMap();
// Load settings
loadLocalStorage();
// Request geolocation
requestGeolocation();
// Load data for the first time. We add a half second delay here to ensure libraries have fully
// loaded before we start fetching data.
setTimeout(fetchData, 500);
// Every second, check if we need to update data based on the user's configured update interval,
// and update other UI elements regarding data age.
setInterval(checkForUpdate, 1000);
// Update terminator/greyline every 5 minutes
setInterval(function () {
    terminator.setTime()
}, 300);
