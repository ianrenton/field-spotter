/////////////////////////////
//     PWA FUNCTIONS       //
/////////////////////////////

// Prevent the Chrome/Safari default install prompt, instead use the event to show our own in the info panel
let installPrompt = null;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  $("#installOnAnotherDevice").hide();
  $("#installPrompt").show();
});

// Handle the user clicking our install button
$("#installPrompt").click(async function() {
  if (!installPrompt) {
    return;
  }
  await installPrompt.prompt();
  disableInAppInstallPrompt();
});

// Disable our install prompt after the user installs the app
window.addEventListener("appinstalled", () => {
  disableInAppInstallPrompt();
});
function disableInAppInstallPrompt() {
  installPrompt = null;
  $("#installPrompt").hide();
}

// Disable both the install and install-on-another-device prompts if already installed
if (navigator.standalone || window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches) {
  $("#installOnAnotherDevice").hide();
  $("#installPrompt").hide();
}

// On window restore (e.g. if the PWA was backgrounded but has now come to the foreground)
// request new geolocation and update all data.
window.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible") {
    requestGeolocation();
    terminator.setTime();
    // Wait a second before fetching data to give the rest of the software time
    // to catch up and e.g. delete timed-out entries before new ones are added
    setTimeout(fetchData, 1000);
  }
});