'use strict';

app.controller('SuperuserController', SuperuserController);

SuperuserController.$inject = ['$scope', '$routeParams', 'Announcements'];

function SuperuserController($scope, $routeParams, Announcements) {

	$scope.announcement = {};
	$scope.newAnnouncement = newAnnouncement;
	$scope.region = capitalizeFirstLetter($routeParams.region);
	$scope.routes = ['Global Announcements', 'Contests'];
	$scope.currentRoute = $scope.routes[0];
	$scope.showAddAnnouncement = false;
	$scope.submit = submit;

	activate();

	function activate() {
		Announcements.get().$promise
	    .then(function(announcements) {
	      $scope.announcements = announcements;
	    })		
	}

	// can make this into a filter
	function capitalizeFirstLetter(input) {
		return input[0].toUpperCase() + input.slice(1);
	}

	function newAnnouncement() {
		$scope.showAddAnnouncement = !$scope.showAddAnnouncement;
	}

	function submit() {
		console.log('Submitted:', vm.announcement);
	}



	function post() {
		Announcments.post({

		})
	}
}


// var announcementsSchema = mongoose.Schema({
//     headline: {
//         type: String,
//         required: true
//     }, 
//     body: {
//         type: String,
//         required: true
//     }, 
//     URL: {
//         type: String,
//         required: true
//     }, 
//     priority: {type: Number},
//     live: {type: Boolean},
//     imgURL: {
//         type: String,
//         required: true
//     },
//     region: {
//         type: String,
//         default: 'global'
//     },
//     timestamp: { type: Date, default: Date.now }
// });