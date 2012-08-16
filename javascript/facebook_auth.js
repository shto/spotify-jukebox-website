function initializeFacebookAuth()
{
	/* Instantiate the global sp object; includes models */
	var sp = getSpotifyApi(1);
	var auth = sp.require('sp://import/scripts/api/auth');
	
	/* Set the permissions you want from the user. 
	 * More info here: http://developers.facebook.com/docs/authentication/permissions/ 
	 */
	var permissions = ['user_about_me'];
	var app_id = '';
	var fbButtonHTML = document.getElementById('fb-login');
	
	fbButtonHTML.addEventListener('click', authFB);
	
	function authFB()
	{
		auth.authenticateWithFacebook(app_id, permissions, {
			// TODO: This is the place where you take the access token and put it in Parse/save it in localStorage
			onSuccess:function(accessToken, ttl) {
				fbButtonHTML.style.display = 'none';
				$("#status").html("<p>Your access token: " + accessToken + "</p>");
				console.log("TTL: " + ttl);
			},
			onFailure:function(error) {
				console.log("Authentication failed with error: " + error);
			},
			onComplete:function() {
				
			}
		});
	}
}