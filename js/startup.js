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
setInterval(function () {
    terminator.setTime()
}, 300);



// todo remove
let test = JSON.parse("[\n" +
    "  {\n" +
    "    \"call\": \"M1SDH/P\",\n" +
    "    \"comment\": \"B/G-2114,2115 POTA GB-0051 WAB SU03\",\n" +
    "    \"freq\": 7.168,\n" +
    "    \"mode\": \"SSB\",\n" +
    "    \"references\": [\n" +
    "      {\n" +
    "        \"lat\": 51.112643,\n" +
    "        \"locator\": \"IO91AC\",\n" +
    "        \"long\": -1.967547,\n" +
    "        \"name\": \"WW2 Bunker No.1 (Grovely Woods)\",\n" +
    "        \"reference\": \"B/G-2114\",\n" +
    "        \"scheme\": \"UKBOTA\",\n" +
    "        \"type\": \"WW2 Bunker\"\n" +
    "      },\n" +
    "      {\n" +
    "        \"lat\": 51.108519,\n" +
    "        \"locator\": \"IO91AC\",\n" +
    "        \"long\": -1.944051,\n" +
    "        \"name\": \"WW2 Bunker No.2 (Grovely Woods)\",\n" +
    "        \"reference\": \"B/G-2115\",\n" +
    "        \"scheme\": \"UKBOTA\",\n" +
    "        \"type\": \"WW2 Bunker\"\n" +
    "      }\n" +
    "    ],\n" +
    "    \"spotter\": \"M0ICR\",\n" +
    "    \"time\": \"2025-04-18T08:14:10.313Z\",\n" +
    "    \"type\": \"Live\"\n" +
    "  }\n" +
    "]");
handleWWBOTAData(test);
