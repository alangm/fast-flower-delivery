var app = angular.module('gossipChat');

app.controller('login-ctl', function($scope, $route) {
		delete local_store.username;
		delete local_store.userkey;
		var ref = new Firebase("https://462gossip.firebaseio.com/");
		var knownRef = ref.child('known');

		$scope.login = function() {
			var found = false;
			knownRef.once('value', function(dataSnapshot) {
				var known = dataSnapshot.val();
				for (var key in known) {
					if (!known.hasOwnProperty(key)) continue;
					if (known[key] == $scope.username) {
						local_store.username = known[key];
						local_store.userkey = key;
						found = true;
						break;
					}
				}

				if (!found) {
					var user = knownRef.push($scope.username);
					local_store.username = $scope.username;
					local_store.userkey = user.key();
				}

				local_store.messagenumber = 0;
				window.location="/";
			});
		}
	}
);
