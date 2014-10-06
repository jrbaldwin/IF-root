function ProfileCtrl($scope, $rootScope, $http, $location, apertureService, Landmark, db, $routeParams) {

	angular.extend($rootScope, {loading: false});
	$scope.aperture = apertureService;  
	$scope.aperture.set('off');

	// This object will be filled by the form
	$scope.user = {};
	
	$scope.worlds = [];

	$scope.deleteWorld = function(i) {
	var deleteConfirm = confirm("Are you sure you want to delete this?");
	if (deleteConfirm) {
		Landmark.del({_id: $scope.worlds[i]._id}, function(data) {
		//$location.path('/');
		console.log('##Delete##');
		console.log(data);
		$scope.worlds.splice(i, 1); //Removes from local array
	  });
	  }
  	}

	$scope.newWorld = function() {
		console.log('newWorld()');
		$scope.world = {};
		$scope.world.newStatus = true; //new
		db.worlds.create($scope.world, function(response){
			console.log('##Create##');
			console.log('response', response);
			$location.path('/edit/walkthrough/'+response[0].worldID);
		});
	}

	//if user login came from Meetup, then process new meetup worlds
	if ($routeParams.incoming == 'meetup'){
		angular.extend($rootScope, {loading: true});
		$scope.fromMeetup = true;
		$http.post('/api/process_meetups').success(function(response){
			angular.extend($rootScope, {loading: false});
			$http.get('/api/user/profile').success(function(user){
				$scope.worlds = user;		
			});
		});

	}
	else {
		$http.get('/api/user/profile').success(function(user){
			console.log(user);
			$scope.worlds = user;		
		});
	}
}
