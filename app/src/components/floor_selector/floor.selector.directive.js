app.directive('floorSelector', floorSelector);

floorSelector.$inject = ['mapManager'];

function floorSelector(mapManager) {
	return {
		restrict: 'E',
		scope: {
			world: '=world',
			style: '=style',
			landmarks: '=landmarks',
			loadLandmarks: '&'
		},
		templateUrl: 'components/floor_selector/floor.selector.html',
		link: link
	};

	function link(scope, elem, attr) {

		scope.showFloors = false;
		scope.floors = _.chain(scope.world.style.maps.localMapArray)
			.filter(function(f) {
				return f.floor_num;
			})
			.groupBy(function(f) {
				return f.floor_num;
			})
			.sortBy(function(f) {
				return -f.floor_num;
			})
			.value()
			.reverse();

		scope.currentFloor = scope.floors.slice(-1)[0][0] > 0 ? 
											   scope.floors.slice(-1)[0][0] : findCurrentFloor(scope.floors);

		function findCurrentFloor(floors) {
			var tempFiltered = floors.filter(function(f) {
				return f[0].floor_num > 0;
			});
			return tempFiltered.length ? tempFiltered.slice(-1)[0][0] : floors[0][0];
		}

		scope.selectFloor = function(index) {
			scope.currentFloor = scope.floors[index][0];
			turnOffFloorLayers();
			turnOnFloorMaps();
			turnOnFloorLandmarks();
		}

		scope.openFloorMenu = function() {
			scope.showFloors = !scope.showFloors;
		}

		function turnOffFloorLayers() {
			var layers = scope.floors.map(function(f) {
				return f[0].floor_num || 1;
			});

			mapManager.findVisibleLayers().forEach(function(l) {
				mapManager.toggleOverlay(l.name);			
			});
		}

		function turnOnFloorMaps() {
			var currentMapLayer = scope.currentFloor.floor_num + '-maps';
			mapManager.toggleOverlay(currentMapLayer);
		}

		function turnOnFloorLandmarks() {
			var currentLandmarkLayer = scope.currentFloor.floor_num + '-landmarks';
			mapManager.toggleOverlay(currentLandmarkLayer);
		}
	}
}
