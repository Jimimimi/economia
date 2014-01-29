var App = angular.module('economia', ['ui.bootstrap']);

App.controller('getData', function($scope, $http) {
  $http.get('./data/data.json')
       .then(function(res){
          App.data = res.data;
        });
});

var market = new Economia(App.data);