app.controller('SplashController', ['$scope', '$location', '$http', '$timeout', 'userManager', 'alertManager', 'dialogs', function($scope, $location, $http, $timeout, userManager, alertManager, dialogs) {

	$scope.setShowSplash = setShowSplash;
	$scope.splashNext = splashNext;
	$scope.resendEmail = resendEmail;
	$scope.sendPasswordForgot = sendPasswordForgot;
	$scope.sendPasswordReset = sendPasswordReset;
	$scope.show = {
		/**
		 * splash: for general splash
		 * confirm: for confirm dialog
		 * confirmThanks: for confirmThanks dialog
		 * close: for close button
		 * signin: for sign in dialog
		 * register: for register dialog
		 * passwordForgot: for forgot password dialog
		 * passwordReset: for reset password dialog
		 */
	};
	$scope.user = {};
	$scope.confirmThanksText;
	$scope.errorMsg;

	init();

	function init() {
		if ($location.path().indexOf('email/confirm') > -1) { // check if user is confirming email
			
			createShowSplash('confirmThanks');

			// get token from url
			var token = $location.path().slice(15);

			$http.post('/email/request_confirm/' + token).
				success(function(data) {
					$scope.confirmThanksText = data.err ? 'There was a problem confirming your email' : 'Thanks for confirming your email!';
				}).
				error(function(err) {
					$scope.confirmThanksText = 'There was a problem confirming your email';
				});

			// redirect to home page
			$location.path('/');
		} else if ($location.path().indexOf('/reset/') > -1) { // user is resetting password
			
			createShowSplash('passwordReset');

			// get token from url
			var token = $location.path().slice(7);
			
			$http.post('/resetConfirm/' + token).
			  success(function(data){
			      
			  }).
			  error(function(err){
			    if (err){
			      console.log('err: ', err);
			    }
			  });
		} else {
			userManager.getUser().then(function(success) {
				createShowSplash(true);
			}, function(err) {
				createShowSplash(false);
			});
		}
	}

	function createShowSplash(condition) {
		// $scope.show controls the logic for the splash pages
		
		if (condition === 'confirmThanks') {
			$scope.show.splash = true;
			$scope.show.confirm = false;
			$scope.show.confirmThanks = true;
		} else if (condition == 'passwordReset') {
			$scope.show.splash = true;
			$scope.show.passwordReset = true;
		} else if (condition) { // logged in
			$scope.show.splash = !userManager.loginStatus || !userManager._user.local.confirmedEmail;
			$scope.show.confirm = userManager.loginStatus && 
				!userManager._user.local.confirmedEmail &&
				!userManager._user.facebook; // don't show confirm dialog for fb authenticated users
			$scope.show.confirmThanks = false; 
			$scope.user.newEmail = userManager._user.local.email;
		} else { // not logged in
			$scope.show.splash = true;
			$scope.show.confirm = false;
			$scope.show.confirmThanks = false;
		}

		// @IFDEF WEB
		$scope.show.close = true; // only show close button (home, not confirm) on web
		// @ENDIF

		$scope.show.signin = false;
		$scope.show.register = false;
	}

	function setShowSplash(property, bool) {
		if (property instanceof Array) {
			_.each(property, function(prop) {
				$scope.show[prop] = bool;
			});
		} else {
			$scope.show[property] = bool;
		}
	}

	function splashNext() {
		// login or create account, depending on context

		userManager.signup.error = undefined;

		if ($scope.show.signin) {
			userManager.signin(userManager.login.email, userManager.login.password).then(function(success) {
				$scope.show.signin = false;
				$scope.show.splash = false;
			}, function(err) {
				addErrorMsg(err || 'Incorrect username or password', 3000);
			})
		} else if ($scope.show.register) {
			var watchSignupError = $scope.$watch('userManager.signup.error', function(newValue) {
				if (newValue === false) { // signup success
					$scope.show.register = false;
					$scope.show.splash = false;
					watchSignupError(); // clear watch
					alertManager.addAlert('info', 'Welcome to Kip!', true);
				} else if (newValue) { // signup error
					addErrorMsg(newValue, 3000);
					watchSignupError(); // clear watch
				}
			});
			userManager.signup.signup();
		}
	}

	function resendEmail() {
		if ($scope.user.newEmail === userManager._user.local.email) {
			sendEmailConfirmation();
			$scope.show.splash = false;
			$scope.show.confirm = false;
			alertManager.addAlert('info', 'Confirmation email sent', true);
		} else {
			// update email 1st (user just edited email)
			var data = {
				updatedEmail: $scope.user.newEmail
			};
			$http.post('api/user/emailUpdate', data).
				success(function(data) {
					if (data.err) {
						addErrorMsg(data.err, 3000);
					} else {
						sendEmailConfirmation();
						$scope.show.splash = false;
						$scope.show.confirm = false;
						alertManager.addAlert('info', 'Email updated. Confirmation email sent', true);
					}
				});
		}
	}

	function sendEmailConfirmation() {
		$http.post('/email/confirm').then(function(sucess) {
			$http.get('/api/dummyRoute');
		}, function(error) {
			http.get('/api/dummyRoute');
		});
	}

	function sendPasswordForgot() {
		var data = {
		  email: $scope.user.email
		};

		$http.post('/forgot', data).
		  success(function(data){
		      $scope.user.email = '';
		  }).
		  error(function(err){
		    if (err){
		    	addErrorMsg(err, 3000);
		    }
		  });
	}

	function sendPasswordReset() {
		var data = {
		  password: $scope.user.newPassword
		}
		
		$http.post('/reset/' + $location.path().slice(7), data).
			success(function(data) {
				if (data.err) {
					addErrorMsg(data.err, 3000);
				} else {
					$location.path('/');
					$timeout(function() {
						setShowSplash('splash', false);
					}, 500);
					alertManager.addAlert('info', 'Password changed successfully', true);
				}
			}).
			error(function(err){
		    	console.log('err: ', err);
		  	});
	}

	function addErrorMsg(message, time) {
		$scope.errorMsg = message;
		if (time) {
			$timeout(function() {
				$scope.errorMsg = '';
			}, time);
		}
	}

}]);