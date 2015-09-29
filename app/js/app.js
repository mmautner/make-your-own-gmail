var app = angular.module('scriptermail', [
  'ui.router',
  'angular-google-gapi',
  'angularMoment',
  'angular-growl',
  'ngAnimate'
]);

app.controller('MainCtrl', ['$scope', 'GAuth', '$state', 'growl',
  function($scope, GAuth, $state, growl) {
  
  $scope.doSignup = function() {
    GAuth.login().then(function(){
      $state.go('label', {id: "INBOX"});
    }, function() {
      growl.error('login fail');
    });
  };

}]);

app.directive('gmailLabel', ['GApi', '$rootScope',
  function(GApi, $rootScope) {
  return {
    restrict: 'A',
    templateUrl: 'views/labels.html',
    link: function(scope, element, attrs) {
      GApi.executeAuth('gmail', 'users.labels.get', {
        'userId': $rootScope.gapi.user.email,
        'id': attrs.name,
        'fields': 'id,name,threadsTotal,threadsUnread,type'
      }).then(function(data) {
        scope.label = data;
      });
    }
  };
}]);

app.controller('InboxCtrl', ['GApi', '$scope', '$rootScope', 'growl', '$stateParams',
  function(GApi, $scope, $rootScope, growl, $stateParams) {

  GApi.executeAuth('gmail', 'users.labels.list', {
    'userId': $rootScope.gapi.user.email
  }).then(function(data) {

    var interestingLabels = [
      'INBOX',
      'IMPORTANT',
      'STARRED',
      'UNREAD',
      'DRAFT',
      'SENT',
      'TRASH',
      'CHAT',
      'SPAM'
    ];
    $scope.labels = [];//data.labels;
    var newLabels;
    for (var i = 0; i < interestingLabels.length; i++) {
      GApi.executeAuth('gmail', 'users.labels.get', {
        'userId': $rootScope.gapi.user.email,
        'id': interestingLabels[i],
        'fields': 'id,name,threadsTotal,threadsUnread,type'
      }).then(function(data) {
        $scope.labels.push(data);
      });
    }

  });

  var query = 'in:' + $stateParams.id;
  GApi.executeAuth('gmail', 'users.threads.list', {
    'userId': $rootScope.gapi.user.email,
    'q': query
  }).then(function(data) {
    $scope.threads = data.threads;
  }, function(error) {
    growl.error(error);
  });
}]);

app.controller('ThreadCtrl', ['GApi', '$scope', '$rootScope', '$stateParams', 'growl',
  function(GApi, $scope, $rootScope, $stateParams, growl) {

  GApi.executeAuth('gmail', 'users.threads.get', {
    'userId': $rootScope.gapi.user.email,
    'id': $stateParams.id
  }).then(function(data) {
    console.log(data.messages[0]);
    $scope.messages = data.messages;
    //decode payload: http://stackoverflow.com/a/28622096/468653
    //atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  }, function(error) {
    growl.error(error);
  });
}]);


app.filter('num', function() {
  return function(input) {
    return parseInt(input, 10);
  };
});

app.constant('GoogleClientId', __env.GOOGLE_CLIENT_ID);
app.constant('GoogleScopes', [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/userinfo.email'
]);

app.config(['growlProvider', function(growlProvider) {
  growlProvider.globalTimeToLive(2000);
}]);

app.config(['$stateProvider', '$urlRouterProvider', '$locationProvider',
  function($stateProvider, $urlRouterProvider, $locationProvider) {

  $locationProvider.html5Mode(true);

  $urlRouterProvider.otherwise("/");

  $stateProvider.state('home', {
    url: '/',
    controller: 'MainCtrl',
    templateUrl: 'views/base.html'
  });
  $stateProvider.state('label', {
    url: '/label/:id',
    controller: 'InboxCtrl',
    templateUrl: 'views/inbox.html'
  });
  $stateProvider.state('label.thread', {
    url: '/thread/:id',
    controller: 'ThreadCtrl',
    templateUrl: 'views/thread.html'
  });
}]);

app.run(['GApi', 'GAuth', 'GoogleClientId', 'GoogleScopes', '$state',
  function(GApi, GAuth, GoogleClientId, GoogleScopes, $state) {

  GApi.load('gmail', 'v1');

  GAuth.setClient(GoogleClientId);
  GAuth.setScope(GoogleScopes.join(' '));

  GAuth.checkAuth().then(
  function () {
    $state.go('label', {id: "INBOX"});
  },
  function() {
    $state.go('home');
  });
}]);

