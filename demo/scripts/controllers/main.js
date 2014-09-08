'use strict';

angular

.module('app')

.controller('MainCtrl', ['$scope', function($scope){

  $scope.items = [{
    row : 0,
    col : 0,
    rows : 2,
    cols : 1
  }, {
    row : 0,
    col : 1,
    rows : 1,
    cols : 1
  }, {
    row : 1,
    col : 1,
    rows : 1,
    cols : 1
  }];

}])

;