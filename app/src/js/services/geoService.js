angular.module('tidepoolsServices')

	.factory('geoService', ['$location', '$q', '$rootScope', '$routeParams', '$timeout', 'alertManager', 'mapManager', 'bubbleTypeService', 'apertureService', 'locationAnalyticsService', 'deviceManager',
		function($location, $q, $rootScope, $routeParams, $timeout, alertManager, mapManager, bubbleTypeService, apertureService, locationAnalyticsService, deviceManager) {

			var cacheTime = 3.25 * 60 * 1000; // 3.25m
			var geoTimeout = 7 * 1000; // 7s time before resorting to old location, or IP
			// @IFDEF PHONEGAP
			var cacheTime = 30 * 1000; // 30s
			var geoTimeout = 30 * 1000; // 30s
			// @ENDIF

			var geoService = {
				location: {
					/**
					 * lat:
					 * lng:
					 * cityName:
					 * src:
					 * timestamp:
					 */ 
				},
				inProgress: false,
				cacheTime: cacheTime,
				geoTimeout: geoTimeout,
				tracking: false // bool indicating whether or not geolocation is being tracked
			};

			var marker = [];
			var pos = {
				/**
				 * lat:
				 * lng:
				 */
			}
			var watchID;
			$rootScope.aperture = apertureService;

			// start tracking when in full aperture (and retail bubble or world search) and stop otherwise
			$rootScope.$watch('aperture.state', function(newVal, oldVal) {
				if (bubbleTypeService.get() === 'Retail' || $routeParams.cityName) {
					if (newVal === 'aperture-full' && !geoService.tracking) {
						geoService.trackStart();
					} else if (newVal !== 'aperture-full' && geoService.tracking) {
						geoService.trackStop();
					}
				}
			});	

			// don't track across pages unless we need to. saves battery and prevents user location marker from showing up on non-full aperture
			$rootScope.$on('$locationChangeSuccess', function() {
				$timeout(function() {
					if (apertureService.state !== 'aperture-full' ||
						$location.path() === '/') {
						geoService.trackStop();
					}
				}, 5 * 1000);
			});

			geoService.updateLocation = function(locationData) {
				geoService.location.lat = locationData.lat;
				geoService.location.lng = locationData.lng;
				geoService.location.cityName = locationData.cityName;
				geoService.location.src = locationData.src;
				geoService.location.timestamp = locationData.timestamp;
			};
			 
			geoService.getLocation = function(maxAge, timeout) {

				var deferred = $q.defer();

				if (!geoService.inProgress) {
					if (navigator.geolocation) {
						geoService.inProgress = true;
						console.log('geo: using navigator');

						function geolocationSuccess(position) {
							geoService.location.lat = position.coords.latitude;
							geoService.location.lng = position.coords.longitude;
							geoService.location.timestamp = Date.now();

							deferred.resolve({
								lat: position.coords.latitude,
								lng: position.coords.longitude
							});

							geoService.inProgress = false;

							locationAnalyticsService.log({
								type: 'GPS',
								loc: {
									type: 'Point',
									coordinates: [position.coords.latitude, position.coords.longitude]
								}
							});
						}

						function geolocationError(error) {
							deferred.reject(error.code);
							geoService.inProgress = false;
						}

						var options = {
							maximumAge: maxAge || 0,
							timeout: timeout || Infinity
						};
						
						navigator.geolocation.getCurrentPosition(geolocationSuccess, 
							geolocationError, options);


					} else {
						//browser update message
						alerts.addAlert('warning', 'Your browser does not support location services.');
						deferred.reject('Your browser does not support location services.');
					}
				} else {
					deferred.reject('Already trying to get location');
				} 

				return deferred.promise;
			}

			geoService.trackStart = function() {			
				// used to start showing user's location on map

				// if we are already tracking, stop current session before starting new one
				if (geoService.tracking) {
					geoService.trackStop();
				}
				if (navigator.geolocation && window.DeviceOrientationEvent) {
					
					// marker
					var iconUrl = 'img/marker/userLocMarker_noArrow.png';
					var iconSize = [18, 18];
					var iconAnchor = [9, 9];
					if (deviceManager.deviceType !== 'desktop') {
						// add arrow to user location marker if mobile device
						iconUrl = 'img/marker/userLocMarker_arrow.png';
						iconSize = [24, 28];
						iconAnchor = [12, 12];
					}

					mapManager.addMarker('track', {
						lat: pos.lat || geoService.location.lat || 0,
						lng: pos.lng || geoService.location.lng || 0,
						icon: {
							iconUrl: iconUrl,
							iconSize: iconSize, 
							iconAnchor: iconAnchor

						},
						alt: 'track' // used for tracking marker DOM element
					});
					mapManager.bringMarkerToFront('track');

					// movement XY
					watchID = navigator.geolocation.watchPosition(function(position) {
						pos = {
							lat: position.coords.latitude,
							lng: position.coords.longitude
						};
						mapManager.moveMarker('track', pos);
						locationAnalyticsService.log({
							type: 'GPS',
							loc: {
								type: 'Point',
								coordinates: [position.coords.latitude, position.coords.longitude]
							}
						});
					}, function() {
						// console.log('location error');
					}, {
						// enableHighAccuracy: true
					});

					// movement rotation
					window.addEventListener('deviceorientation', rotateMarker);
				}
				geoService.tracking = true;

			};

			geoService.trackStop = function() {
				// used to stop showing user's location on map

				if (geoService.tracking) { // only stop tracking if already tracking
					// movement: clear watch
					if (watchID) {
						navigator.geolocation.clearWatch(watchID);
						watchID = undefined;
					}

					// rotation: remove event listener
					window.removeEventListener('deviceorientation', rotateMarker);

					// remove marker
					mapManager.removeMarker('track');
					marker = [];
				}
				geoService.tracking = false;

			};

			function rotateMarker(data) {
				// make sure new marker is loaded in DOM
				if (marker.length > 0) {
					var alpha = data.webkitCompassHeading || data.alpha;
					var matrix = marker.css('transform');

					// account for the fact that marker is initially facing south
					var adjust = 180 + Math.round(alpha);

					marker.css('transform', getNewTransformMatrix(matrix, adjust));
				} else {
					marker = $('img[alt="track"]');
				}
			}

			function getNewTransformMatrix(matrix, angle) {
				// convert from form 'matrix(a, c, b, d, tx, ty)'' to ['a', 'c', 'b', 'd', 'tx', 'ty']
				var newMatrix = matrix.slice(7, matrix.length - 1).split(', ');

				if (newMatrix.length !== 6) { // not 2D matrix
					return matrix;
				}

				// get translation and don't change
				var tx = newMatrix[4];
				var ty = newMatrix[5];

				// set new values for rotation matrix
				var a = Math.cos(angle * Math.PI / 180);
				var b = -Math.sin(angle * Math.PI / 180);
				var c = -b;
				var d = a;

				return 'matrix(' + a + ', ' + c + ', ' + b + ', ' + d + ', ' + tx + ', ' + ty + ')';
			}

			return geoService;
		}]);
