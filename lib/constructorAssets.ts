import { ImageSourcePropType } from "react-native";

type Assets = {
  color?: string;                 // takım ana rengi (accent)
  logo?: ImageSourcePropType;     // üstteki küçük logo
  car?: ImageSourcePropType;      // alttaki büyük görsel (opsiyonel)
};

const fallbackLogo = require("../assets/constructors/default/logo.png");
const fallbackCar  = require("../assets/constructors/default/car.png");

// NOT: require() yolunu DİNAMİK veremeyiz (RN kısıtı). Bu yüzden sabit eşleme tablosu şart.
// Elinizde görsel olan takımları ekleyin; olmayanlarda car bırakılırsa default car kullanılacak.
const table: Record<string, Assets> = {
  mclaren: {
    color: "#FF8700",
    logo: require("../assets/constructors/mclaren/logo.png"),
    // car yoksa yazmayın; fallback devreye girer
    // car: require("../assets/constructors/mclaren/car.png"),
  },
  ferrari: {
    color: "#DC0000",
    logo: require("../assets/constructors/ferrari/logo.png"),
    // car: require("../assets/constructors/ferrari/car.png"),
  },
  mercedes: {
    color: "#00A19C",
    logo: require("../assets/constructors/mercedes/logo.png"),
  },
  red_bull: {
    color: "#1E2A5A",
    logo: require("../assets/constructors/red_bull/logo.png"),
  },
  aston_martin: {
    color: "#005F54",
    logo: require("../assets/constructors/aston_martin/logo.png"),
  },
  alpine: {
    color: "#FF5AAF",
    logo: require("../assets/constructors/alpine/logo.png"),
  },
  williams: {
    color: "#0090FF",
    logo: require("../assets/constructors/williams/logo.png"),
  },
  rb: {
    color: "#2B2D42",
    logo: require("../assets/constructors/rb/logo.png"),
  },
  sauber: {
    color: "#6A0DAD",
    logo: require("../assets/constructors/sauber/logo.png"),
  },
  haas: {
    color: "#B0B0B0",
    logo: require("../assets/constructors/haas/logo.png"),
  },
};

export function getConstructorAssets(id?: string): {
  color: string;
  logo: ImageSourcePropType;
  car: ImageSourcePropType;
} {
  const a = (id && table[id]) || {};
  return {
    color: a.color ?? "#111827",
    logo: a.logo ?? fallbackLogo,
    car: a.car ?? fallbackCar, // ← car yoksa default car
  };
}
