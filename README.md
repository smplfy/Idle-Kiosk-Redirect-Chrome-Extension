Kiosk Idle Redirect - setup instructions:

This extension can be deployed directly in the browser or using the Google Admin console.

For browser-based deployment, the url settings and idle timeout is configurable in the extension options.

If deploying through Google Admin console, use the following JSON format to configure extension options:

  {
    "kioskUrl": {
      "Value": "https://google.com"
    },
    "marketingUrl": {
      "Value": "https://www.youtube.com/watch_popup?v=AFAg1FkGgMM&mute=1&autoplay=1&loop=1"
    },
    "idleTimeout": {
      "Value": 20
    },
    "enableRedirect": {
      "Value": true
    }
  }
