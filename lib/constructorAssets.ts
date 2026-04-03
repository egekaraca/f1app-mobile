import { ImageSourcePropType } from "react-native";

// Import SVG logos as React components
import MclarenLogo from "../assets/constructors/mclaren/logo.svg";
import FerrariLogo from "../assets/constructors/ferrari/logo.svg";
import MercedesLogo from "../assets/constructors/mercedes/logo.svg";
import RedBullLogo from "../assets/constructors/red_bull/logo.svg";
import AstonMartinLogo from "../assets/constructors/aston_martin/logo.svg";
import AlpineLogo from "../assets/constructors/alpine/logo.svg";
import WilliamsLogo from "../assets/constructors/williams/logo.svg";
import RBLogo from "../assets/constructors/rb/logo.svg";
import SauberLogo from "../assets/constructors/sauber/logo.svg";
import HaasLogo from "../assets/constructors/haas/logo.svg";
import DefaultLogo from "../assets/constructors/default/logo.svg";

// Small icon logos (PNG) — used in list views
const ICON_LOGOS: Record<string, any> = {
  alpine:        require("../assets/images/teamlogo/alpine_logo.jpg"),
  aston_martin:  require("../assets/images/teamlogo/astonmartin_logo.jpg"),
  ferrari:       require("../assets/images/teamlogo/ferrari_logo.jpg"),
  haas:          require("../assets/images/teamlogo/haas_logo.jpg"),
  sauber:        require("../assets/images/teamlogo/kicksauber_logo.jpg"),
  mclaren:       require("../assets/images/teamlogo/mclaren_logo.jpg"),
  mercedes:      require("../assets/images/teamlogo/mercedes_logo.jpg"),
  rb:            require("../assets/images/teamlogo/racingbulls_logo.jpg"),
  racing_bulls:  require("../assets/images/teamlogo/racingbulls_logo.jpg"),
  red_bull:      require("../assets/images/teamlogo/redbull_logo.jpg"),
  williams:      require("../assets/images/teamlogo/williams_logo.jpg"),
};

type Assets = {
  color?: string;
  logo?: any; // Can be SVG component or ImageSourcePropType
  logoXML?: string;
  car?: ImageSourcePropType;
};

const fallbackCar = require("../assets/constructors/default/car.png");

const table: Record<string, Assets> = {
  mclaren: {
    color: "#FF8700",
    logo: MclarenLogo,
    car: require("../assets/constructors/mclaren/car.png"),
  },
  ferrari: {
    color: "#DC0000",
    logo: FerrariLogo,
  },
  mercedes: {
    color: "#00A19C",
    logo: MercedesLogo,
  },
  red_bull: {
    color: "#1E2A5A",
    logo: RedBullLogo,
  },
  aston_martin: {
    color: "#005F54",
    logo: AstonMartinLogo,
  },
  alpine: {
    color: "#FF5AAF",
    logo: AlpineLogo,
  },
  williams: {
    color: "#0090FF",
    logo: WilliamsLogo,
  },
  rb: {
    color: "#2B2D42",
    logo: RBLogo,
  },
  sauber: {
    color: "#6A0DAD",
    logo: SauberLogo,
  },
  haas: {
    color: "#B0B0B0",
    logo: HaasLogo,
  },
};

export function getConstructorAssets(id?: string): {
  color: string;
  logo: any;
  icon: any; // small PNG icon mark
  logoXML?: string;
  car: ImageSourcePropType;
} {
  const a = (id && table[id]) || {};
  return {
    color: a.color ?? "#111827",
    logo: a.logo ?? DefaultLogo,
    icon: (id && ICON_LOGOS[id]) ?? null,
    logoXML: a.logoXML,
    car: a.car ?? fallbackCar,
  };
}
