/**
 * @format
 */

import { AppRegistry } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import App from './App';
import { name as appName } from './app.json';

dayjs.extend(relativeTime);

AppRegistry.registerComponent(appName, () => App);
