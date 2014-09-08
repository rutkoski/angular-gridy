'use strict';

angular

.module('app', [
  'ngRoute',
  'rutkoski.angular-gridy'
])

.config(['$routeProvider', function ($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'views/main.html',
      controller: 'MainCtrl'
    })
    .otherwise({
      redirectTo: '/'
    });
}])

;
