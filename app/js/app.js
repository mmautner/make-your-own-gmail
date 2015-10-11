var app = angular.module('scriptermail', [
  'ui.router',
  'angular-google-gapi',
  'angularMoment',
  'angular-growl',
  'ngAnimate',
  'ngCkeditor'
]);

app.filter('num', function() {
  return function(input) {
    return parseInt(input, 10);
  };
});
app.filter('html', ['$sce', function ($sce) {
  return function (text) {
    return $sce.trustAsHtml(text);
  };
}]);
app.filter('titlecase', function() {
  return function(str) {
    return (str == undefined || str === null) ? '' : str.replace(/_|-/, ' ').replace(/\w\S*/g, function(txt){
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
});
app.filter('joinParticipants', function() {
  return function(participants) {
    //return participants.join(', ');
    return participants[participants.length-1];
  }
});

app.service('favico', [function() {
  var favico = new Favico({
    animation : 'fade'
  });

  var badge = function(num) {
    favico.badge(num);
  };
  var reset = function() {
    favico.reset();
  };

  return {
    badge : badge,
    reset : reset
  };
}]);
app.service('email', ['$rootScope', function($rootScope) {

  // http://stackoverflow.com/a/28622096/468653
  var b64encode = function (msg) {
    return btoa(msg).replace(/\//g, '_').replace(/\+/g, '-')
  };
  var b64decode = function(msg) {
    return atob(msg.replace(/-/g, '+').replace(/_/g, '/'))
  };

  var convertHeadersToObject = function(headers) {
    var d = {};
    for (var i = 0; i < headers.length; i++) {
      d[headers[i].name] = headers[i].value;
    };
    return d;
  };

  var getSubject = function(headers) {
    var headers = convertHeadersToObject(headers);
    if ('Subject' in headers) {
      return headers['Subject'];
    }
  };

  var getParticipants = function(msgs) {
    var participants = [];
    for (var i = 0; i < msgs.length; i++) {
      var headers = convertHeadersToObject(msgs[i].payload.headers);
      var interestingHeaders = ['From', 'To', 'Cc', 'Bcc'];
      var myEmail = $rootScope.gapi.user.email;
      for (var j = 0; j < interestingHeaders.length; j++) {
        if (headers[interestingHeaders[j]]) {
          var parsedAddr = emailAddresses.parseOneAddress(headers[interestingHeaders[j]]);
          if (parsedAddr) {
            if (parsedAddr.name) {
              participants.push(parsedAddr.name);
            }
            else if (parsedAddr.address) {
              participants.push(parsedAddr.address);
            }
          }
        };
      };
    }
    return participants;
  };

  var getUnread = function(thread) {
    var unreadMsgs = [];
    for (var i = 0; i < thread.messages.length; i++) {
      if (thread.messages[i].labelIds.indexOf('UNREAD') > -1) {
        unreadMsgs.push(thread.messages[i]);
      }
    };
    return unreadMsgs;
  };

  var getDatetimes = function(thread) {
    var datetimes = [];
    for (var i = 0; i < thread.messages.length; i++) {
      var headers = convertHeadersToObject(thread.messages[i].payload.headers);
      if ('Date' in headers) {
        datetimes.push(new Date(headers['Date']));
      }
    }
    return datetimes
  };

  var rfc2822 = function(fromaddr, toaddrs, ccaddrs, bccaddrs, subject, body) {
    /*
    * fromaddr: {'name': 'xxx', 'email': 'xxx'}
    * toaddrs/ccaddrs/bccaddrs: [{'name': 'xxx', 'email': 'xxx'}, ...]
    * subject: 'normal string'  (limited to 76 chars)
    * body: 'html string'
    */
    var payload = "From: " + fromaddr.email +
        '\r\n' + "To: " + toaddrs[0].email +
        '\r\n' + "Subject: " + subject +
        '\r\n\r\n' + body;
    return b64encode(payload);
  };

  return {
    b64encode: b64encode,
    b64decode: b64decode,
    getSubject: getSubject,
    getParticipants: getParticipants,
    getUnread: getUnread,
    getDatetimes: getDatetimes,
    rfc2822: rfc2822
  }
}]);

app.controller('MainCtrl', ['$scope', 'GAuth', '$state', 'growl',
  function($scope, GAuth, $state, growl) {
  
  $scope.doSignup = function() {
    GAuth.login().then(function(){
      $state.go('label', {id: "inbox"});
    }, function() {
      growl.error('Login failed');
    });
  };

}]);

app.service('FetchLabels', ['$window', 'GApi', 'InterestingLabels',
  function($window, GApi, InterestingLabels) {
    return function() {

      var batch = $window.gapi.client.newBatch()
      for (var i = 0; i < InterestingLabels.length; i++) {
        var req = GApi.createRequest(
          'gmail',
          'users.labels.get',
          {
            'userId': 'me',
            'id': InterestingLabels[i].name,
            'fields': 'id,name,threadsTotal,threadsUnread,type'
          }
        );
        batch.add(req, {id: InterestingLabels[i].name});
      }
      return batch.then(function(data) {
        return data.result;
      });
    };
  }
]);

app.service('FetchMessages', ['$window', 'GApi', 'email', 'InterestingLabels', 'favico',
  function($window, GApi, email, InterestingLabels, favico) {
    // *NEEDS* caching
    return function(label) {
      var query = 'in:' + label;
      return GApi.executeAuth('gmail', 'users.threads.list', {
        'userId': 'me',
        'q': query
      })
      .then(function(threadResult) {

        var batch = $window.gapi.client.newBatch()
        for (var i = 0; i < threadResult.threads.length; i++) {
          var req = GApi.createRequest(
            'gmail',
            'users.threads.get', {
              'userId': 'me',
              'id': threadResult.threads[i].id
            }
          );
          batch.add(req, {id: threadResult.threads[i].id});
        }

        return batch
        .then(function(msgResult) {
          // post-processing of threads
          var unreadThreads = 0;
          for (var i = 0; i < threadResult.threads.length; i++) {
            var threadId = threadResult.threads[i].id;
            var thread = msgResult.result[threadId].result;
            var participants = email.getParticipants(thread.messages);
            var subject = email.getSubject(thread.messages[thread.messages.length-1].payload.headers);
            var unreadMsgs = email.getUnread(thread);
            var datetimes = email.getDatetimes(thread);

            threadResult.threads[i].messages = thread.messages;
            threadResult.threads[i].participants = participants;
            threadResult.threads[i].subject = subject;
            threadResult.threads[i].unreadMsgs = unreadMsgs;
            threadResult.threads[i].datetimes = datetimes;

            if (unreadMsgs.length > 0) { unreadThreads++; }
          }
          // update favicon count
          favico.badge(unreadThreads);

          return threadResult.threads;
        });
      });

    };
  }
]);


app.controller('BaseCtrl', [
  '$scope',
  'InterestingLabels',
  'labels',
  function($scope, InterestingLabels, labels) {

  $scope.labels = labels;
  $scope.interestingLabels = InterestingLabels;
    
  }
]);

app.controller('LabelCtrl', [
  '$scope',
  '$stateParams',
  'threads',
  function($scope, $stateParams, threads) {

  $scope.title = $stateParams.id.toUpperCase();
  $scope.threads = threads;

}]);

app.controller('ThreadCtrl', ['GApi', '$scope', '$rootScope', '$stateParams', 'growl', 'email',
  function(GApi, $scope, $rootScope, $stateParams, growl, email) {

  GApi.executeAuth('gmail', 'users.threads.get', {
    'userId': 'me',
    'id': $stateParams.threadId.toUpperCase(),
    'format': 'full' // more expensive?
  }).then(function(data) {
    // requires parsing of messages
    $scope.messages = data.messages;
  }, function(error) {
    growl.error(error);
  });

  $scope.save = function() {
    console.log('saving');
  };

  $scope.send = function() {
    base64encodedEmail = email.rfc2822(
      {'email': $rootScope.gapi.user.email},
      [{'email': 'max.mautner@gmail.com'}],
      [],
      [],
      'Hi',
      $scope.emailBody);

    GApi.executeAuth('gmail', 'users.messages.send', {
      'userId': 'me',
      'resource': {
        'raw': base64encodedEmail
      }
    }).then(function(data) {
      console.log(data);
      growl.success('Email sent!');
    }, function(error) {
      growl.error(error);
    });
  };

  $scope.editorOptions = {
    height: 200
  };

}]);


app.constant('GoogleClientId', __env.GOOGLE_CLIENT_ID);
app.constant('GoogleScopes', [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/userinfo.email'
]);
app.constant('InterestingLabels', [
  {name: 'INBOX', icon: 'envelope'},
  //{name: 'IMPORTANT', icon: ''},
  {name: 'STARRED', icon: 'star'},
  //{name: 'UNREAD', icon: ''},
  {name: 'DRAFT', icon: 'pencil'},
  {name: 'SENT', icon: 'send'},
  {name: 'TRASH', icon: 'trash'},
  {name: 'CHAT', icon: 'comment'},
  {name: 'SPAM', icon: 'ban'}
]);

app.config(['growlProvider', function(growlProvider) {
  growlProvider.globalTimeToLive(2000);
}]);

app.config(['$stateProvider', '$urlRouterProvider', '$locationProvider',
  function($stateProvider, $urlRouterProvider, $locationProvider) {

  $locationProvider.html5Mode(true);
  $urlRouterProvider.otherwise("/");

  $stateProvider
  .state('home', {
    url: '/',
    controller: 'MainCtrl',
    templateUrl: 'views/home.html',
    resolve: {
      isLoggedIn: ['$state', 'GAuth', function($state, GAuth) {
        return GAuth.checkAuth().then(function () {
          $state.go('label', {id: "inbox"});
        }, function() {
          return;
        });
      }]
    }
  })
  .state('secureRoot', {
    templateUrl: 'views/base.html',
    controller: 'BaseCtrl',
    resolve: {
      isLoggedIn: ['$state', 'GAuth', function($state, GAuth) {
        return GAuth.checkAuth()
        .then(function () {
          return;
        }, function() {
          $state.go('home');
        });
      }],
      labels: ['isLoggedIn', 'FetchLabels', function(isLoggedIn, FetchLabels) {
        return FetchLabels();
      }]
    }
  })
  .state('label', {
    parent: 'secureRoot',
    url: '/label/:id',
    controller: 'LabelCtrl',
    templateUrl: 'views/label.html',
    resolve: {
      threads: ['FetchMessages', '$stateParams', 'isLoggedIn',
        function(FetchMessages, $stateParams) {
          return FetchMessages($stateParams.id.toUpperCase());
        }
      ]
    }
  })
  .state('thread', {
    parent: 'secureRoot',
    url: '/thread/:threadId',
    controller: 'ThreadCtrl',
    templateUrl: 'views/thread.html'
  });
}]);

app.run([
  'GApi',
  'GAuth',
  'GoogleClientId',
  'GoogleScopes',
  function(GApi, GAuth, GoogleClientId, GoogleScopes) {
    GApi.load('gmail', 'v1');
    GAuth.setClient(GoogleClientId);
    GAuth.setScope(GoogleScopes.join(' '));
  }
]);

app.run([
  '$rootScope',
  function($rootScope) {

  $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
    //console.log(event, toState, toParams, fromState, fromParams);
    $rootScope.stateLoaded = false;
  });
  $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
    //console.log(event, toState, toParams, fromState, fromParams);
    $rootScope.stateLoaded = true;
  });
  $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
    console.log(event, toState, toParams, fromState, fromParams, error);
    $rootScope.stateLoaded = true;
  });
}]);

