/**
 * Meadow and Pip illustrations downloaded from the Figma file and drawn with the original SVG markup.
 */
import { SvgXml } from "react-native-svg";

import { illustrationXml } from "@/assets/illustrations";

export function Meadow() {
  return <SvgXml xml={illustrationXml.meadow} />;
}

export function Pip({ variant = "welcome" }: { variant?: "welcome" | "home" }) {
  return <SvgXml xml={variant === "home" ? illustrationXml.pip_home : illustrationXml.pip} />;
}
