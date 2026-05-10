/**
 * @format
 */

import {AppRegistry, LogBox} from 'react-native';
import {enableScreens} from 'react-native-screens';
import ForegroundService from '@supersami/rn-foreground-service';
import App from './App';
import {name as appName} from './app.json';

// Ignore specific warnings
LogBox.ignoreLogs(['new NativeEventEmitter()']);

enableScreens();

// Register the foreground service
ForegroundService.register({
  config: {
    alert: false,
    onServiceErrorCallBack: () => console.log('Foreground Service Error'),
  },
});

AppRegistry.registerComponent(appName, () => App);
