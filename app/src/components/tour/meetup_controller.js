app.controller('MeetupController', ['$scope', '$window', '$location', 'styleManager', '$rootScope', function ($scope, $window, $location, styleManager, $rootScope) {


	var style = styleManager;

	//style.navBG_color = "#FFFAB4";

	angular.element('#view').bind("scroll", function () {
		console.log(this.scrollTop);
	});
	
	angular.element('#wrap').scroll(
	_.debounce(function() {
		console.log(this.scrollTop);
		$scope.scroll = this.scrollTop;
		$scope.$apply();
		}, 20));


	// $scope.loadmeetup = function() {
	// 	$location.path('/auth/meetup');
	// }

}]);
