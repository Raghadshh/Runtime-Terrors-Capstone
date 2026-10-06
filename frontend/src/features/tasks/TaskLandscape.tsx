import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Pip } from "@/components/pip";

/** Fixed scenery below the scroll area, so it never hides task rows. */
export function TaskLandscape() {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 126, overflow: "hidden" }}>
    <Svg width="100%" height={126} viewBox="0 0 357 126" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0 }}>
      <Path d="M0 78 C55 28 95 67 143 84 C205 108 256 28 357 68 V126 H0Z" fill="#DDECF4" />
      <Path d="M0 88 C45 52 78 68 116 92 C160 119 206 66 251 75 C293 83 324 89 357 75 V126 H0Z" fill="#A8D5A2" />
      <Path d="M39 121 C29 109 18 104 13 84 C29 87 36 94 36 105 C40 94 49 91 56 91 C57 104 47 111 39 114Z" fill="#65A878" />
      <Path d="M58 91 L58 76" stroke="#65A878" strokeWidth={2} />
      <Circle cx={58} cy={70} r={5} fill="#F8D8CF" /><Circle cx={52} cy={75} r={5} fill="#F8D8CF" /><Circle cx={64} cy={75} r={5} fill="#F8D8CF" /><Circle cx={55} cy={81} r={5} fill="#F8D8CF" /><Circle cx={61} cy={81} r={5} fill="#F8D8CF" /><Circle cx={58} cy={76} r={4} fill="#FFD66B" />
      <Path d="M83 62 L87 71 L97 72 L89 79 L91 89 L83 84 L74 89 L76 79 L68 72 L79 71Z" fill="#FFD66B" />
    </Svg>
    <View style={{ position: "absolute", bottom: 5, right: 28 }}><Pip variant="home" /></View>
  </View>;
}
