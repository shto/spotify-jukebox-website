// This is the location marker that we will be using
// on the map. Let's store a reference to it here so
// that it can be updated in several places.
var locationMarker = null;
var lastError = null;

// Gets the geo location
function getGeoLocation()
{
	if (navigator.geolocation) {
		// Get the location of the user's browser using the
		// native geolocation service. When we invoke this method
		// only the first callback is requied. The second
		// callback - the error handler - and the third
		// argument - our configuration options - are optional.
		navigator.geolocation.getCurrentPosition(savePosition(), errorOccured(),
			{
				enableHighAccuracy: true,
				timeout: 3000,
				maximumAge: 36000
			}
		);
	}		
}

// Saves the position in the location marker
function savePosition(position)
{
	// Check to see if there is already a location.
	// There is a bug in FireFox where this gets
	// invoked more than once with a cahced result.
	if (locationMarker){
		return;
	}

	// Log that this is the initial position.
	console.log( "Initial Position Found" );

	// Add a marker to the map using the position.
	locationMarker = addMarker(position.coords.latitude, position.coords.longitude, "Current Position");
}

// Logs an error and saves it to the lastError variable
function errorOccured(error)
{
	lastError = error;
	console.log("An error has occured: " + error);
}