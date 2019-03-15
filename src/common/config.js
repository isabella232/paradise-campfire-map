// map data over time playback start/end date
export const startDate = new Date('2018-11-08');
export const endDate = new Date('2018-11-26');

// time slider minor/hours ticks/steps per day
// Note: hours period ticks are not displayed on below the time slider
// to keep those ticks display UI clean.
// Only day ticks are displayed on the time slider,
// but users can scrub them with arrow keys and slider mouse clicks
// for hourly thumb updates and date filter queries
export const ticksPerDay = 12; // every hour

// replay timer delay in msecs
export const timerDelay = 500;

// access token for MapboxGLJS
// https://www.mapbox.com/mapbox-gl-js/api/
// https://docs.mapbox.com/help/how-mapbox-works/access-tokens/
// https://docs.mapbox.com/help/glossary/access-token/
export const mapboxAccessToken = 'pk.eyJ1IjoiZW5qYWxvdCIsImEiOiIzOTJmMjBiZmI2NGQ2ZjAzODhiMzhiOGI2MTI1YTk4YSJ9.sIOXXU3TPp5dLg_L3cUxhQ';

export const mapboxConfig = {
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v9',
  center: [-121.62, 39.70],
  zoom: 2,
  minZoom: 11,
  maxZoom: 15.7,
  maxBounds:  [[-121.79, 39.63], [-121.34, 39.87]]
};

// mapd server connection string
export const serverInfo = {
  host: '13.90.129.165',
  port: 6273,
  database: 'mapd',
  username: 'mapd',
  password: 'HyperInteractive!'
};

// damage color palette and labels config
const colorPalette = {
  "Destroyed (>50%)": "rgba(216, 49, 49, 0.1)",
  "Major (26-50%)": "rgba(255, 110, 0, 1)",
  "Minor (10-25%)": "rgba(255, 204, 0, 1)",
  "Affected (1-9%)": "rgba(255, 249, 211, 1)",
  "Other": "rgba(255, 246, 165,1)"
};

const labels = {
  "Destroyed (>50%)": ">50%",
  "Major (26-50%)": "26-50%",
  "Minor (10-25%)": "10-25%",
  "Affected (1-9%)": "1-9%",
  "Other": "Other"
};

export function getColor(damageCategory) {
  return colorPalette[damageCategory];
}

export function getLabel(damageCategory) {
  return labels[damageCategory];
}
