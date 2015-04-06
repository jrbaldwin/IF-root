app.controller('HomeController', ['$scope', '$rootScope', '$location', 'worldTree', 'styleManager', 'mapManager', 'geoService', 'ifGlobals', function ($scope, $rootScope, $location, worldTree, styleManager, mapManager, geoService, ifGlobals) {
var map = mapManager, style = styleManager;

style.resetNavBG();
map.resetMap();

$scope.loadState = 'loading';
$scope.kinds = ifGlobals.kinds;

$scope.select = function(bubble) {
	$location.path('w/'+bubble.id);
}

function initMarkers() {
	var bubbles = $scope.bubbles;
	bubbles.forEach(function(bubble, index, bubbles) {
		if (bubble) {
		map.addMarker(bubble._id, {
			lat:bubble.loc.coordinates[1],
			lng:bubble.loc.coordinates[0],
			draggable: false,
			message: '<a if-href="#w/'+bubble.id+'">'+bubble.name+'</a>',
			enable: 'leafletDirectiveMarker.click',
			icon: {
				iconUrl: 'img/marker/bubble-marker-50.png',
				shadowUrl: '',
				iconSize: [35, 67],
				iconAnchor: [17, 67],
				popupAnchor: [0, -30]
			},
			_id: bubble._id	
		});
		}
	});
	map.setCenterWithFixedAperture([geoService.location.lng, geoService.location.lat], 18, 0, 240);
}

//LISTENERS// 

$rootScope.$on('leafletDirectiveMarker.click', function(event, args) { //marker clicks beget list selection
	var bubble = $scope.bubbles.find(function(element, index, array) {
		if (element._id==args.markerName) {
			return true;
		} else { 
			return false;
		}
	});
	$scope.select(bubble);
});

//INIT

worldTree.getNearby().then(function(data) { 
	$scope.$evalAsync(function($scope) {
		$scope.homeBubbles = data['150m'] || [];
		$scope.nearbyBubbles = data['2.5km'] || [];
		
		if ($scope.nearbyBubbles.length>0 && $scope.homeBubbles.length>0) {
			$scope.bubbles = $scope.homeBubbles.concat($scope.nearbyBubbles);
		} else if ($scope.nearbyBubbles.length>0) {
			$scope.bubbles = $scope.nearbyBubbles;
		} else if ($scope.homeBubbles.length>0) {
			$scope.bubbles = $scope.homeBubbles;
		} else {
			$scope.bubbles = [];
		}
		
		$scope.loadState = 'success';
		initMarkers();
	});
}, function(reason) {
	//failure
	console.log(reason);
	$scope.loadState = 'failure';
});

}]);