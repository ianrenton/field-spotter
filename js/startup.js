/////////////////////////////
//         STARTUP         //
/////////////////////////////

// Set up map
setUpMap();
// Load settings
loadLocalStorage();
// Request geolocation
requestGeolocation();
// Load data for the first time
fetchData();
// Every second, check if we need to update data based on the user's configured update interval,
// and update other UI elements regarding data age.
setInterval(checkForUpdate, 1000);
// Update terminator/greyline every 5 minutes
setInterval(function() { terminator.setTime() }, 300);
