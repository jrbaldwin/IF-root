function LandmarkController( World, Landmark, db, $routeParams, $scope, $location, $log, $window, leafletData, $rootScope, apertureService, mapManager, styleManager) {

		var zoomControl = angular.element('.leaflet-bottom.leaflet-left')[0];
		zoomControl.style.top = "100px";
		zoomControl.style.left = "1%";

		console.log('--Landmark Controller--');
		var map = mapManager;
		var style = styleManager;
		$scope.aperture = apertureService;
		$scope.aperture.set('half');
		
		
		$scope.worldURL = $routeParams.worldURL;
		$scope.landmarkURL = $routeParams.landmarkURL;
		
		//eventually landmarks can have non-unique names
		$scope.landmark = Landmark.get({id: $routeParams.landmarkURL}, function(landmark) {
			console.log(landmark);
			console.log('trying to get landmark');
			//goto landmarker
			goToMark();	
		});
		
		World.get({id: $routeParams.worldURL}, function(data) {
			console.log(data)
			if (data.err) {
				$log.error(data.err);
				$location.path('/#/');
			} else {
				$scope.world = data.world;
				$scope.style = data.style;
				style.navBG_color = $scope.style.navBG_color;
			}
		});
		
		function goToMark() {
			
			map.setCenter($scope.landmark.loc.coordinates, 20); 
		  	var markers = map.markers;
		  	angular.forEach(markers, function(marker) {
		  		console.log(marker);
			  	map.removeMarker(marker._id);
		  	});
		  	

		  	map.addMarker($scope.landmark._id, {
		  			lat: $scope.landmark.loc.coordinates[1],
		  			lng: $scope.landmark.loc.coordinates[0],
		  			draggable:false,
		  			message:$scope.landmark.name,
				  	icon: {
						iconUrl: 'img/marker/bubble-marker-50.png',
						shadowUrl: '',
						iconSize: [25, 48],
						iconAnchor: [13, 48]
					},
		  			_id: $scope.landmark._id
		  			});
		  	map.setMarkerFocus($scope.landmark._id);
		 };
		 
		map.refresh();
}