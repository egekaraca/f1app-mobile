// Circuit map SVGs sourced from f1db (CC-BY-4.0), latest layout per circuit as of 2026.
// Two variants:
//   getCircuitMap()      → white-outline, use on dark backgrounds
//   getCircuitMapLight() → black-outline, use on light/white backgrounds

const CIRCUIT_MAPS_DARK: Record<string, any> = {
  albert_park:   require('../assets/circuits/albert_park.svg'),
  shanghai:      require('../assets/circuits/shanghai.svg'),
  suzuka:        require('../assets/circuits/suzuka.svg'),
  miami:         require('../assets/circuits/miami.svg'),
  villeneuve:    require('../assets/circuits/villeneuve.svg'),
  monaco:        require('../assets/circuits/monaco.svg'),
  catalunya:     require('../assets/circuits/catalunya.svg'),
  red_bull_ring: require('../assets/circuits/red_bull_ring.svg'),
  silverstone:   require('../assets/circuits/silverstone.svg'),
  spa:           require('../assets/circuits/spa.svg'),
  hungaroring:   require('../assets/circuits/hungaroring.svg'),
  zandvoort:     require('../assets/circuits/zandvoort.svg'),
  monza:         require('../assets/circuits/monza.svg'),
  madring:       require('../assets/circuits/madring.svg'),
  baku:          require('../assets/circuits/baku.svg'),
  marina_bay:    require('../assets/circuits/marina_bay.svg'),
  americas:      require('../assets/circuits/americas.svg'),
  rodriguez:     require('../assets/circuits/rodriguez.svg'),
  interlagos:    require('../assets/circuits/interlagos.svg'),
  vegas:         require('../assets/circuits/vegas.svg'),
  losail:        require('../assets/circuits/losail.svg'),
  yas_marina:    require('../assets/circuits/yas_marina.svg'),
  bahrain:       require('../assets/circuits/bahrain.svg'),
  jeddah:        require('../assets/circuits/jeddah.svg'),
  imola:         require('../assets/circuits/imola.svg'),
};

const CIRCUIT_MAPS_LIGHT: Record<string, any> = {
  albert_park:   require('../assets/circuits-light/albert_park.svg'),
  shanghai:      require('../assets/circuits-light/shanghai.svg'),
  suzuka:        require('../assets/circuits-light/suzuka.svg'),
  miami:         require('../assets/circuits-light/miami.svg'),
  villeneuve:    require('../assets/circuits-light/villeneuve.svg'),
  monaco:        require('../assets/circuits-light/monaco.svg'),
  catalunya:     require('../assets/circuits-light/catalunya.svg'),
  red_bull_ring: require('../assets/circuits-light/red_bull_ring.svg'),
  silverstone:   require('../assets/circuits-light/silverstone.svg'),
  spa:           require('../assets/circuits-light/spa.svg'),
  hungaroring:   require('../assets/circuits-light/hungaroring.svg'),
  zandvoort:     require('../assets/circuits-light/zandvoort.svg'),
  monza:         require('../assets/circuits-light/monza.svg'),
  madring:       require('../assets/circuits-light/madring.svg'),
  baku:          require('../assets/circuits-light/baku.svg'),
  marina_bay:    require('../assets/circuits-light/marina_bay.svg'),
  americas:      require('../assets/circuits-light/americas.svg'),
  rodriguez:     require('../assets/circuits-light/rodriguez.svg'),
  interlagos:    require('../assets/circuits-light/interlagos.svg'),
  vegas:         require('../assets/circuits-light/vegas.svg'),
  losail:        require('../assets/circuits-light/losail.svg'),
  yas_marina:    require('../assets/circuits-light/yas_marina.svg'),
  bahrain:       require('../assets/circuits-light/bahrain.svg'),
  jeddah:        require('../assets/circuits-light/jeddah.svg'),
  imola:         require('../assets/circuits-light/imola.svg'),
};

function unwrap(mod: any): any {
  if (!mod) return null;
  return mod.default ?? mod;
}

/** White-outline SVG — use on dark backgrounds (#111, #0D0D0D, etc.) */
export function getCircuitMap(circuitId: string): any {
  return unwrap(CIRCUIT_MAPS_DARK[circuitId]);
}

/** Black-outline SVG — use on light backgrounds (#fff, #f2f2f2, etc.) */
export function getCircuitMapLight(circuitId: string): any {
  return unwrap(CIRCUIT_MAPS_LIGHT[circuitId]);
}
