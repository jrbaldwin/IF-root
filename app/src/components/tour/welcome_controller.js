function WelcomeController($scope, $window, $location, styleManager, $rootScope) {
	var style = styleManager;

	style.navBG_color = "rgba(173, 212, 224, 0.8)";

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

}