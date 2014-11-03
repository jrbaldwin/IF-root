angular.module('tidepoolsServices')
	.factory('dialogs', ['$rootScope', '$compile', 
function($rootScope, $compile) {
var dialogs = {
	dialogTemplate: null
}

dialogs.showDialog = function(name) {
	dialogs.template = "templates/"+name;
	dialogs.show = true;
}

dialogs.close = function($event) {
	if($event.target.className.indexOf('dialog-bg')>-1){ 
		dialogs.show = false;
	}
}

return dialogs;
}]);