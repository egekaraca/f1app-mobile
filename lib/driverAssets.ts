// lib/driverAssets.ts
// Central map of driver portrait photos, keyed by Ergast driverId.
// Photos are from assets/f1_2026_drivers/ — no background (nobg).
// Note: 2026 Ergast API uses short last-name IDs (e.g. "norris", "hamilton").

const DRIVER_PHOTOS: Record<string, any> = {
  // Short-form IDs (2026 Ergast)
  albon:      require('../assets/f1_2026_drivers/26_albon_nobg.png'),
  alonso:     require('../assets/f1_2026_drivers/26_alonso_nobg.png'),
  antonelli:  require('../assets/f1_2026_drivers/26_antonelli_nobg.png'),
  bearman:    require('../assets/f1_2026_drivers/26_bearman_nobg.png'),
  bortoleto:  require('../assets/f1_2026_drivers/26_bortoleto_nobg.png'),
  bottas:     require('../assets/f1_2026_drivers/26_bottas_nobg.png'),
  colapinto:  require('../assets/f1_2026_drivers/26_colapinto_nobg.png'),
  gasly:      require('../assets/f1_2026_drivers/26_gasly_nobg.png'),
  hadjar:     require('../assets/f1_2026_drivers/26_hadjar_nobg.png'),
  hamilton:   require('../assets/f1_2026_drivers/26_hamilton_nobg.png'),
  hulkenberg: require('../assets/f1_2026_drivers/26_hulkenberg_nobg.png'),
  lawson:     require('../assets/f1_2026_drivers/26_lawson_nobg.png'),
  leclerc:    require('../assets/f1_2026_drivers/26_leclerc_nobg.png'),
  lindblad:   require('../assets/f1_2026_drivers/26_lindblad_nobg.png'),
  norris:     require('../assets/f1_2026_drivers/26_norris_nobg.png'),
  ocon:       require('../assets/f1_2026_drivers/26_ocon_nobg.png'),
  perez:      require('../assets/f1_2026_drivers/26_perez_nobg.png'),
  piastri:    require('../assets/f1_2026_drivers/26_piastri_nobg.png'),
  russell:    require('../assets/f1_2026_drivers/26_russel_nobg.png'),
  sainz:      require('../assets/f1_2026_drivers/26_sainz_nobg.png'),
  stroll:     require('../assets/f1_2026_drivers/26_stroll_nobg.png'),
  verstappen: require('../assets/f1_2026_drivers/26_verstappen_nobg.png'),

  // Long-form aliases (older Ergast seasons)
  alexander_albon:       require('../assets/f1_2026_drivers/26_albon_nobg.png'),
  fernando_alonso:       require('../assets/f1_2026_drivers/26_alonso_nobg.png'),
  andrea_kimi_antonelli: require('../assets/f1_2026_drivers/26_antonelli_nobg.png'),
  oliver_bearman:        require('../assets/f1_2026_drivers/26_bearman_nobg.png'),
  gabriel_bortoleto:     require('../assets/f1_2026_drivers/26_bortoleto_nobg.png'),
  valtteri_bottas:       require('../assets/f1_2026_drivers/26_bottas_nobg.png'),
  franco_colapinto:      require('../assets/f1_2026_drivers/26_colapinto_nobg.png'),
  pierre_gasly:          require('../assets/f1_2026_drivers/26_gasly_nobg.png'),
  isack_hadjar:          require('../assets/f1_2026_drivers/26_hadjar_nobg.png'),
  lewis_hamilton:        require('../assets/f1_2026_drivers/26_hamilton_nobg.png'),
  nico_hulkenberg:       require('../assets/f1_2026_drivers/26_hulkenberg_nobg.png'),
  liam_lawson:           require('../assets/f1_2026_drivers/26_lawson_nobg.png'),
  charles_leclerc:       require('../assets/f1_2026_drivers/26_leclerc_nobg.png'),
  arvid_lindblad:        require('../assets/f1_2026_drivers/26_lindblad_nobg.png'),
  lando_norris:          require('../assets/f1_2026_drivers/26_norris_nobg.png'),
  esteban_ocon:          require('../assets/f1_2026_drivers/26_ocon_nobg.png'),
  sergio_perez:          require('../assets/f1_2026_drivers/26_perez_nobg.png'),
  oscar_piastri:         require('../assets/f1_2026_drivers/26_piastri_nobg.png'),
  george_russell:        require('../assets/f1_2026_drivers/26_russel_nobg.png'),
  carlos_sainz:          require('../assets/f1_2026_drivers/26_sainz_nobg.png'),
  lance_stroll:          require('../assets/f1_2026_drivers/26_stroll_nobg.png'),
  max_verstappen:        require('../assets/f1_2026_drivers/26_verstappen_nobg.png'),
};

/** Returns the photo for a given Ergast driverId, or undefined if not found. */
export function getDriverPhoto(driverId?: string): any {
  return driverId ? DRIVER_PHOTOS[driverId] : undefined;
}
