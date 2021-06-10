import {createStackNavigator, createAppContainer} from 'react-navigation';
import MainScreen from "./src/components/MainScreen";

const MainNavigator = createStackNavigator({
  Home: {screen: MainScreen}, 
});

const App = createAppContainer(MainNavigator);

export default App;
