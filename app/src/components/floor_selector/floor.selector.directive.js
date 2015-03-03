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

		showCurrentFloorLandmarks(1);

		function findCurrentFloor(floors) {
			var tempFiltered = floors.filter(function(f) {
				return f[0].floor_num > 0;
			});
			return tempFiltered.length ? tempFiltered.slice(-1)[0][0] : floors[0][0];
		}

		scope.selectFloor = function(index) {
			scope.currentFloor = scope.floors[index][0];
			showCurrentFloorMaps(index);
			showCurrentFloorLandmarks();

		}

		scope.openFloorMenu = function() {
			scope.showFloors = !scope.showFloors;
		}

		function showCurrentFloorMaps(index) {
			mapManager.removeOverlays();
			setTimeout(function() {
				var floorMaps = scope.floors[index];
				floorMaps.forEach(function(m) {
					mapManager.addOverlay(m.localMapID, m.localMapName, m.localMapOptions);
				});

					
			}, 100)
		}

		function showCurrentFloorLandmarks(floor) {
			floor = floor || scope.currentFloor.floor_num;
			scope.loadLandmarks();

			setTimeout(function() {

				var removeLandmarks = _.chain(scope.landmarks)
					.filter(function(l) {
						return l.loc_info;
					})
					.filter(function(l) {
						return l.loc_info.floor_num !== floor;
					})
					.value();

					removeLandmarks.forEach(function(l) {
						mapManager.removeMarker(l._id);
					});
					scope.$apply()
				}, 500)
		}	
	}
}
