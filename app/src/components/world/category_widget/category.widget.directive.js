'use strict';

app.directive('categoryWidgetSr', categoryWidgetSr);

categoryWidgetSr.$inject = ['bubbleSearchService', '$location', 'mapManager', 'apertureService', '$route'];

function categoryWidgetSr(bubbleSearchService, $location, mapManager, apertureService, $route) {
	return {
		restrict: 'E',
		scope: {
			aperture: '=aperture',
			categories: '=categories',
			style: '=style',
			populateSearchView: '=',
			world: '=world'
		},
		templateUrl: function(elem, attrs) {
			if (attrs.aperture === 'full') {
				return 'components/world/category_widget/category.widget.fullaperture.html';
			} else {
				return 'components/world/category_widget/category.widget.noaperture.html';
			}
		},
		link: function(scope, elem, attrs) {
			scope.bubbleId = scope.world._id;
			scope.bubbleName = scope.world.id;
			scope.groupedCategories = _.groupBy(scope.categories, 'name');
			scope.selectedIndex;

			scope.search = function(category, index) {
				if (index !== undefined) {
					scope.selectedIndex = index;
				}
				if ($location.path().indexOf('search') > 0) {
					bubbleSearchService.search('category', scope.bubbleId, category)
					.then(function() {
						scope.populateSearchView(category, 'category');
					});
					$location.path('/w/' + scope.bubbleName + '/search/category/' + category, false);
				} else {
					$location.path('/w/' + scope.bubbleName + '/search/category/' + category, true);
				}
			}

			scope.searchAll = function() {
				if ($location.path().indexOf('search') > 0) {
					bubbleSearchService.search('all', scope.bubbleId, 'all')
					.then(function() {
						scope.populateSearchView('All', 'all');
					});
					$location.path('/w/' + scope.bubbleName + '/search/all', false);
				} else {
					$location.path('/w/' + scope.bubbleName + '/search/all', true);
				}
			}
		}
	};
}