# Field Spotter

![Field Spotter banner image](./img/banner.png)

Field Spotter is a mobile-first progressive web app to display live spots from outdoor Amateur Radio programmes such as POTA, SOTA & WWFF, on a geographic map, and on a frequency band. Designed for use in the field to locate park-to-park and summit-to-summit opportunities in a more intuitive way than the respective websites' spot lists. It can of course also be used from home by hunters of the supported programmes.

Use it at [https://fieldspotter.radio](https://fieldspotter.radio).

Read more about the project at [https://ianrenton.com/projects/field-spotter](https://ianrenton.com/projects/field-spotter).

### Third Party Libraries

The project contains self-hosted modified copies of classes from Chris Veness' [Geodesy library](https://github.com/chrisveness/geodesy/): `/js/modules/osgridref.js`, `/js/modules/iegridref.js` and `/js/modules/utm_ci.js`. These have been modified allow the "OV" square for OSGB, to support the Irish grid system, and add parsing of Channel Islands grid references, for use with the Worked All Britain squares layer. This is subject to the MIT licence.

The project contains a self-hosted copy of Font Awesome's free library, in the `/fa/` directory. This is subject to Font Awesome's licence and is not covered by the overall licence declared in the `LICENSE` file. This approach was taken in preference to using their hosted kits due to the popularity of this project exceeding the page view limit for their free hosted offering.

Other third party libraries, such as Leaflet and jQuery, plus many plugins for them, are included from a CDN in the head of `index.html`.

This project would not have been possible without these libraries, so many thanks to their developers.
