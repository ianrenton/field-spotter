/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Ordnance Survey of Ireland Grid Reference funcs   (c) Chris Veness 2005-2021 & Ian Renton 2025 */
/*                                                                                   MIT Licence  */
/* www.movable-type.co.uk/scripts/latlong-gridref.html                                            */
/* www.movable-type.co.uk/scripts/geodesy-library.html#IeGridRef                                  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

import LatLonEllipsoidal, { Dms } from 'https://cdn.jsdelivr.net/npm/geodesy@2/latlon-ellipsoidal-datum.js';


/**
 * Ordnance Survey of Ireland & Northern Ireland grid reference calculations, based on the
 * IeGridRef class in the geodesy library at https://github.com/chrisveness/geodesy
 */

/* IeGridRef  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */


const nationalGrid = {
    trueOrigin:  { lat: 53.5, lon: -8 },                 // true origin of Irish grid 53°30′N, 8°W
    falseOrigin: { easting: -200e3, northing: -250e3 }, // easting & northing of false origin, metres from true origin
    scaleFactor: 1.000035,                         // scale factor on central meridian
    ellipsoid:   LatLonEllipsoidal.ellipsoids.Airy1830,
};

/**
 * Irish Grid References with methods to parse and convert them to latitude/longitude points.
 */
class IeGridRef {

    /**
     * Creates an IeGridRef object.
     *
     * @param {number} easting - Easting in metres from OS Grid false origin.
     * @param {number} northing - Northing in metres from OS Grid false origin.
     *
     * @example
     *   import IeGridRef from '/js/geodesy/IeGridRef.js';
     *   const gridref = new IeGridRef(651409, 313177);
     */
    constructor(easting, northing) {
        this.easting = Number(easting);
        this.northing = Number(northing);

        if (isNaN(easting)  || this.easting<0  || this.easting>7000e3) throw new RangeError(`invalid easting ‘${easting}’`);
        if (isNaN(northing) || this.northing<0 || this.northing>13000e3) throw new RangeError(`invalid northing ‘${northing}’`);
    }


    /**
     * Converts ‘this’ Irish Grid Reference easting/northing coordinate to latitude/longitude
     * (SW corner of grid square).
     *
     * While OS Grid References are based on OSGB-36, the Ordnance Survey have deprecated the use of
     * OSGB-36 for latitude/longitude coordinates (in favour of WGS-84), hence this function returns
     * WGS-84 by default, with OSGB-36 as an option. See www.ordnancesurvey.co.uk/blog/2014/12/2.
     *
     * Note formulation implemented here due to Thomas, Redfearn, etc is as published by OS, but is
     * inferior to Krüger as used by e.g. Karney 2011.
     *
     * @param   {LatLon.datum} [datum=WGS84] - Datum to convert grid reference into.
     * @returns {LatLon}       Latitude/longitude of supplied grid reference.
     *
     * @example
     *   const gridref = new IeGridRef(651409.903, 313177.270);
     *   const pWgs84 = gridref.toLatLon();                    // 52°39′28.723″N, 001°42′57.787″E
     *   // to obtain (historical) OSGB36 lat/lon point:
     *   const pOsgb = gridref.toLatLon(LatLon.datums.OSGB36); // 52°39′27.253″N, 001°43′04.518″E
     */
    toLatLon(datum=LatLonEllipsoidal.datums.WGS84) {
        const { easting: E, northing: N } = this;

        const { a, b } = nationalGrid.ellipsoid;            // a = 6377563.396, b = 6356256.909
        const φ0 = nationalGrid.trueOrigin.lat.toRadians(); // latitude of true origin
        const λ0 = nationalGrid.trueOrigin.lon.toRadians(); // longitude of true origin
        const E0 = -nationalGrid.falseOrigin.easting;       // easting of true origin
        const N0 = -nationalGrid.falseOrigin.northing;      // northing of true origin
        const F0 = nationalGrid.scaleFactor;                // scale factor

        const e2 = 1 - (b*b)/(a*a);                         // eccentricity squared
        const n = (a-b)/(a+b), n2 = n*n, n3 = n*n*n;        // n, n², n³

        let φ=φ0, M=0;
        do {
            φ = (N-N0-M)/(a*F0) + φ;

            const Ma = (1 + n + (5/4)*n2 + (5/4)*n3) * (φ-φ0);
            const Mb = (3*n + 3*n2 + (21/8)*n3) * Math.sin(φ-φ0) * Math.cos(φ+φ0);
            const Mc = ((15/8)*n2 + (15/8)*n3) * Math.sin(2*(φ-φ0)) * Math.cos(2*(φ+φ0));
            const Md = (35/24)*n3 * Math.sin(3*(φ-φ0)) * Math.cos(3*(φ+φ0));
            M = b * F0 * (Ma - Mb + Mc - Md);                // meridional arc

        } while (Math.abs(N-N0-M) >= 0.00001);  // ie until < 0.01mm

        const cosφ = Math.cos(φ), sinφ = Math.sin(φ);
        const ν = a*F0/Math.sqrt(1-e2*sinφ*sinφ);            // nu = transverse radius of curvature
        const ρ = a*F0*(1-e2)/Math.pow(1-e2*sinφ*sinφ, 1.5); // rho = meridional radius of curvature
        const η2 = ν/ρ-1;                                    // eta = ?

        const tanφ = Math.tan(φ);
        const tan2φ = tanφ*tanφ, tan4φ = tan2φ*tan2φ, tan6φ = tan4φ*tan2φ;
        const secφ = 1/cosφ;
        const ν3 = ν*ν*ν, ν5 = ν3*ν*ν, ν7 = ν5*ν*ν;
        const VII = tanφ/(2*ρ*ν);
        const VIII = tanφ/(24*ρ*ν3)*(5+3*tan2φ+η2-9*tan2φ*η2);
        const IX = tanφ/(720*ρ*ν5)*(61+90*tan2φ+45*tan4φ);
        const X = secφ/ν;
        const XI = secφ/(6*ν3)*(ν/ρ+2*tan2φ);
        const XII = secφ/(120*ν5)*(5+28*tan2φ+24*tan4φ);
        const XIIA = secφ/(5040*ν7)*(61+662*tan2φ+1320*tan4φ+720*tan6φ);

        const dE = (E-E0), dE2 = dE*dE, dE3 = dE2*dE, dE4 = dE2*dE2, dE5 = dE3*dE2, dE6 = dE4*dE2, dE7 = dE5*dE2;
        φ = φ - VII*dE2 + VIII*dE4 - IX*dE6;
        const λ = λ0 + X*dE - XI*dE3 + XII*dE5 - XIIA*dE7;

        let point = new LatLon_IeGridRef(φ.toDegrees(), λ.toDegrees(), 0, LatLonEllipsoidal.datums.OSGB36);

        if (datum != LatLonEllipsoidal.datums.OSGB36) {
            // if point is required in datum other than OSGB36, convert it
            point = point.convertDatum(datum);
            // convertDatum() gives us a LatLon: convert to LatLon_IeGridRef which includes toOsGrid()
            point = new LatLon_IeGridRef(point.lat, point.lon, point.height, point.datum);
        }

        return point;
    }


    /**
     * Parses grid reference to IeGridRef object.
     *
     * Accepts standard grid references (eg 'G 387 148'), with or without whitespace separators, from
     * two-digit references up to 10-digit references (1m × 1m square), or fully numeric comma-separated
     * references in metres (eg '438700,114800').
     *
     * @param   {string}    gridref - Standard format OS Grid Reference.
     * @returns {IeGridRef} Numeric version of grid reference in metres from false origin (SW corner of
     *   supplied grid square).
     * @throws  {Error}     Invalid grid reference.
     *
     * @example
     *   const grid = IeGridRef.parse('G 51409 13177'); // grid: { easting: 651409, northing: 313177 }
     */
    static parse(gridref) {
        gridref = String(gridref).trim();

        // check for fully numeric comma-separated gridref format
        let match = gridref.match(/^(\d+),\s*(\d+)$/);
        if (match) return new IeGridRef(match[1], match[2]);

        // validate format
        match = gridref.match(/^[ABCDEFGHJKLMNOPQRSTUVWXYZ]\s*[0-9]+\s*[0-9]+$/i);
        if (!match) throw new Error(`invalid grid reference ‘${gridref}’`);

        // get numeric values of letter references, mapping A->0, B->1, C->2, etc:
        let l1 = gridref.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0); // 100km square
        // shuffle down letters after 'I' since 'I' is not used in grid:
        if (l1 > 7) l1--;

        // convert grid letters into 100km-square indexes from false origin (grid square SV):
        const e100km = l1 % 5;
        const n100km = 4 - Math.floor(l1 / 5);

        // skip grid letters to get numeric (easting/northing) part of ref
        let en = gridref.slice(1).trim().split(/\s+/);
        // if e/n not whitespace separated, split half way
        if (en.length == 1) en = [ en[0].slice(0, en[0].length / 2), en[0].slice(en[0].length / 2) ];

        // validation
        if (en[0].length != en[1].length) throw new Error(`invalid grid reference ‘${gridref}’`);

        // standardise to 10-digit refs (metres)
        en[0] = en[0].padEnd(5, '0');
        en[1] = en[1].padEnd(5, '0');

        const e = e100km + en[0];
        const n = n100km + en[1];

        return new IeGridRef(e, n);
    }


    /**
     * Converts ‘this’ numeric grid reference to standard OS of Ireland Grid Reference.
     *
     * @param   {number} [digits=10] - Precision of returned grid reference (10 digits = metres);
     *   digits=0 will return grid reference in numeric format.
     * @returns {string} This grid reference in standard format.
     *
     * @example
     *   const gridref = new IeGridRef(651409, 313177).toString(8); // 'TG 5140 1317'
     *   const gridref = new IeGridRef(651409, 313177).toString(0); // '651409,313177'
     */
    toString(digits=10) {
        if (![ 0,2,4,6,8,10,12,14,16 ].includes(Number(digits))) throw new RangeError(`invalid precision ‘${digits}’`); // eslint-disable-line comma-spacing

        let { easting: e, northing: n } = this;

        // use digits = 0 to return numeric format (in metres) - note northing may be >= 1e7
        if (digits == 0) {
            const format = { useGrouping: false,  minimumIntegerDigits: 6, maximumFractionDigits: 3 };
            const ePad = e.toLocaleString('en', format);
            const nPad = n.toLocaleString('en', format);
            return `${ePad},${nPad}`;
        }

        // get the 100km-grid indices
        const e100km = Math.floor(e / 100000), n100km = Math.floor(n / 100000);

        // translate those into the numeric equivalent of the grid letters
        let l1 = (n100km) * 5 % 25 + e100km % 5;
        return null; // haven't done this maths yet

        // compensate for skipped 'I' and calculate grid letter
        if (l1 > 7) l1++;
        const letter = String.fromCharCode(l1 + 'A'.charCodeAt(0));

        // strip 100km-grid indices from easting & northing, and reduce precision
        e = Math.floor((e % 100000) / Math.pow(10, 5 - digits / 2));
        n = Math.floor((n % 100000) / Math.pow(10, 5 - digits / 2));

        // pad eastings & northings with leading zeros
        e = e.toString().padStart(digits/2, '0');
        n = n.toString().padStart(digits/2, '0');

        return `${letter} ${e} ${n}`;
    }

}


/* LatLon_IeGridRef - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */


/**
 * Extends LatLon class with method to convert LatLon point to Irish Grid Reference.
 *
 * @extends LatLonEllipsoidal
 */
class LatLon_IeGridRef extends LatLonEllipsoidal {

    /**
     * Converts latitude/longitude to Ordnance Survey of Ireland grid reference easting/northing coordinate.
     *
     * @returns {IeGridRef} Irish Grid Reference easting/northing.
     *
     * @example
     *   const grid = new LatLon(52.65798, 1.71605).toOsGrid(); // TG 51409 13177
     *   // for conversion of (historical) OSGB36 latitude/longitude point:
     *   const grid = new LatLon(52.65798, 1.71605).toOsGrid(LatLon.datums.OSGB36);
     */
    toOsGrid() {
        // if necessary convert to OSGB36 first
        const point = this.datum == LatLonEllipsoidal.datums.OSGB36
            ? this
            : this.convertDatum(LatLonEllipsoidal.datums.OSGB36);

        const φ = point.lat.toRadians();
        const λ = point.lon.toRadians();

        const { a, b } = nationalGrid.ellipsoid;            // a = 6377563.396, b = 6356256.909
        const φ0 = nationalGrid.trueOrigin.lat.toRadians(); // latitude of true origin
        const λ0 = nationalGrid.trueOrigin.lon.toRadians(); // longitude of true origin
        const E0 = -nationalGrid.falseOrigin.easting;       // easting of true origin
        const N0 = -nationalGrid.falseOrigin.northing;      // northing of true origin
        const F0 = nationalGrid.scaleFactor;                // scale factor

        const e2 = 1 - (b*b)/(a*a);                          // eccentricity squared
        const n = (a-b)/(a+b), n2 = n*n, n3 = n*n*n;         // n, n², n³

        const cosφ = Math.cos(φ), sinφ = Math.sin(φ);
        const ν = a*F0/Math.sqrt(1-e2*sinφ*sinφ);            // nu = transverse radius of curvature
        const ρ = a*F0*(1-e2)/Math.pow(1-e2*sinφ*sinφ, 1.5); // rho = meridional radius of curvature
        const η2 = ν/ρ-1;                                    // eta = ?

        const Ma = (1 + n + (5/4)*n2 + (5/4)*n3) * (φ-φ0);
        const Mb = (3*n + 3*n2 + (21/8)*n3) * Math.sin(φ-φ0) * Math.cos(φ+φ0);
        const Mc = ((15/8)*n2 + (15/8)*n3) * Math.sin(2*(φ-φ0)) * Math.cos(2*(φ+φ0));
        const Md = (35/24)*n3 * Math.sin(3*(φ-φ0)) * Math.cos(3*(φ+φ0));
        const M = b * F0 * (Ma - Mb + Mc - Md);              // meridional arc

        const cos3φ = cosφ*cosφ*cosφ;
        const cos5φ = cos3φ*cosφ*cosφ;
        const tan2φ = Math.tan(φ)*Math.tan(φ);
        const tan4φ = tan2φ*tan2φ;

        const I = M + N0;
        const II = (ν/2)*sinφ*cosφ;
        const III = (ν/24)*sinφ*cos3φ*(5-tan2φ+9*η2);
        const IIIA = (ν/720)*sinφ*cos5φ*(61-58*tan2φ+tan4φ);
        const IV = ν*cosφ;
        const V = (ν/6)*cos3φ*(ν/ρ-tan2φ);
        const VI = (ν/120) * cos5φ * (5 - 18*tan2φ + tan4φ + 14*η2 - 58*tan2φ*η2);

        const Δλ = λ-λ0;
        const Δλ2 = Δλ*Δλ, Δλ3 = Δλ2*Δλ, Δλ4 = Δλ3*Δλ, Δλ5 = Δλ4*Δλ, Δλ6 = Δλ5*Δλ;

        let N = I + II*Δλ2 + III*Δλ4 + IIIA*Δλ6;
        let E = E0 + IV*Δλ + V*Δλ3 + VI*Δλ5;

        N = Number(N.toFixed(3)); // round to mm precision
        E = Number(E.toFixed(3));

        try {
            return new IeGridRef(E, N); // note: gets truncated to SW corner of 1m grid square
        } catch (e) {
            throw new Error(`${e.message} from (${point.lat.toFixed(6)},${point.lon.toFixed(6)}).toOsGrid()`);
        }
    }


    /**
     * Override LatLonEllipsoidal.convertDatum() with version which returns LatLon_IeGridRef.
     */
    convertDatum(toDatum) {
        const osieED = super.convertDatum(toDatum); // returns LatLonEllipsoidal_Datum
        const osieOSGR = new LatLon_IeGridRef(osieED.lat, osieED.lon, osieED.height, osieED.datum);
        return osieOSGR;
    }

}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

export { IeGridRef as default, LatLon_IeGridRef as LatLon, Dms };
