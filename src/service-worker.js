/**
 * Check out https://googlechrome.github.io/sw-toolbox/docs/master/index.html for
 * more info on how to use sw-toolbox to custom configure your service worker.
 */


'use strict';

const mainAssets = [
  './',
  './build/main.js',
  './build/0.js',
  './build/1.js',
  './build/2.js',
  './build/3.js',
  './build/main.css',
  './build/vendor.js',
  './build/polyfills.js',
  'index.html',
  'cordova.js',
  'manifest.json',
];

const fonts = [
  'ionicons.ttf',
  'ionicons.woff',
  'ionicons.woff2',
  'roboto-regular.ttf',
  'roboto-regular.woff',
  'roboto-regular.woff2',
  'roboto-light.ttf',
  'roboto-light.woff',
  'roboto-light.woff2',
  'roboto-bold.ttf',
  'roboto-bold.woff',
  'roboto-bold.woff2',
  'roboto-medium.ttf',
  'roboto-medium.woff',
  'roboto-medium.woff2',
  'noto-sans-regular.ttf',
  'noto-sans-regular.woff',
  'noto-sans-bold.ttf',
  'noto-sans-bold.woff',

].map(v => './assets/fonts/' + v);

const icons = [
  './assets/icon/favicon.ico'
]

const assets =
  mainAssets
    .concat(fonts)
    .concat(icons)

const cacheName = 'reader-v1';

this.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(assets))
      .catch(error => console.error(error))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cache => cache !== cacheName)
          .map(cache => caches.delete(cache))
      )
    })
  )
});

const fontRequestAdapter = async (request) => {
  if (request.url.includes('assets/fonts/')) {
    if (request.url.includes('?')) {
      let fontUrl = request.url.split('?')[0];
      return new Request(fontUrl, request);
    } else {
      return request;
    }
  }
  return request;
}

const nocorsAdapter = async (request) => {
  return new Request(request.url, { mode: 'no-cors' });
}

this.addEventListener('fetch', (event) => {
  // console.log(event.request)
  nocorsAdapter(event.request).then(console.log)

  event.respondWith(
    nocorsAdapter(event.request)
      .then(request => fontRequestAdapter(event.request))
      .then(request => caches.match(request))
      .then(response =>  response || fetch(event.request) )
      .catch(error => console.error(error))
  );
});



// importScripts('./build/sw-toolbox.js');

// self.toolbox.options.cache = {
//   name: 'ionic-cache'
// };

// // pre-cache our key assets
// self.toolbox.precache(
//   [
//     './build/main.js',
//     './build/main.css',
//     './build/vendor.js',
//     './build/polyfills.js',
//     'index.html',
//     'manifest.json'
//   ]
// );

// dynamically cache any other local assets
// self.toolbox.router.any('/*', self.toolbox.cacheFirst);

// for any other requests go to the network, cache,
// and then only use that cached resource if your user goes offline
// self.toolbox.router.default = self.toolbox.networkFirst;