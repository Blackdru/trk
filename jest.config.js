module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@notifee|react-native-vector-icons|react-native-linear-gradient)/)',
  ],
};
