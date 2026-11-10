import Ionicons from "@expo/vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { RootStack } from "./src/nav";
import { AccountScreen } from "./src/screens/AccountScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { PondDetailScreen } from "./src/screens/PondDetailScreen";
import { PondsScreen } from "./src/screens/PondsScreen";
import { WarningsScreen } from "./src/screens/WarningsScreen";
import { StoreProvider, useStore } from "./src/store";
import { C } from "./src/theme";

const Stack = createNativeStackNavigator<RootStack>();
const Tab = createBottomTabNavigator();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: C.brand, background: C.bg, card: C.card, text: C.text, border: C.line },
};

function Tabs() {
  const { warnings } = useStore();
  const high = warnings.filter((w) => w.level === "HIGH").length;
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleStyle: { fontWeight: "800" },
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontWeight: "700" },
      }}
    >
      <Tab.Screen
        name="Ponds"
        component={PondsScreen}
        options={{
          title: "Ao tôm",
          tabBarLabel: "Ao",
          tabBarIcon: ({ color, size }) => <Ionicons name="water-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Warnings"
        component={WarningsScreen}
        options={{
          title: "Cảnh báo",
          tabBarBadge: high ? high : undefined,
          tabBarBadgeStyle: { backgroundColor: C.high },
          tabBarIcon: ({ color, size }) => <Ionicons name="warning-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const { session } = useStore();
  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen />
      </>
    );
  }
  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerTitleStyle: { fontWeight: "800" }, headerTintColor: C.brand, headerBackTitle: "Quay lại" }}>
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Pond" component={PondDetailScreen} options={({ route }) => ({ title: route.params.title })} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
