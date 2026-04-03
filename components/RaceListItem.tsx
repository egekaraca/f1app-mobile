import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Race } from '../types/race';
import { formatRaceDateTimeLocal } from '../lib/api';

const CIRCUIT_IMAGES: Record<string, any> = {
  bahrain:        require('../assets/images/circuit/bahrain_gp_image.jpg'),
  jeddah:         require('../assets/images/circuit/saudi_arabia_gp_image.jpg'),
  albert_park:    require('../assets/images/circuit/australia_gp_image.jpg'),
  suzuka:         require('../assets/images/circuit/japan_gp_image.jpg'),
  shanghai:       require('../assets/images/circuit/china_gp_image.jpg'),
  miami:          require('../assets/images/circuit/miami_gp_image.jpg'),
  imola:          require('../assets/images/circuit/emilia_romagna_gp_image.jpg'),
  monaco:         require('../assets/images/circuit/monaco_gp_image.jpg'),
  villeneuve:     require('../assets/images/circuit/canada_gp_image.jpg'),
  catalunya:      require('../assets/images/circuit/spain_gp_image.jpg'),
  red_bull_ring:  require('../assets/images/circuit/austria_gp_image.jpg'),
  silverstone:    require('../assets/images/circuit/british_gp_image.jpg'),
  hungaroring:    require('../assets/images/circuit/hungary_gp_image.jpg'),
  spa:            require('../assets/images/circuit/belgium_gp_image.jpg'),
  zandvoort:      require('../assets/images/circuit/netherlands_gp_image.jpg'),
  monza:          require('../assets/images/circuit/italy_gp_image.jpg'),
  baku:           require('../assets/images/circuit/azerbaijan_gp_image.jpg'),
  marina_bay:     require('../assets/images/circuit/singapore_gp_image.jpg'),
  americas:       require('../assets/images/circuit/usa_gp_image.jpg'),
  rodriguez:      require('../assets/images/circuit/mexico_gp_image.jpg'),
  interlagos:     require('../assets/images/circuit/brazil_gp_image.jpg'),
  vegas:          require('../assets/images/circuit/las_vegas_gp_image.jpg'),
  losail:         require('../assets/images/circuit/qatar_gp_image.jpg'),
  yas_marina:     require('../assets/images/circuit/abu_dhabi_gp_image.jpg'),
};

type Props = { race: Race; onPress?: () => void };

function isCompleted(dateStr: string) {
  return new Date(dateStr) < new Date();
}

function isThisWeekend(dateStr: string) {
  const race = new Date(dateStr);
  const diff = (race.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= -2 && diff <= 4;
}

export default function RaceListItem({ race, onPress }: Props) {
  const { dateStr } = formatRaceDateTimeLocal(race.date, race.time);
  const circuitImage = CIRCUIT_IMAGES[race.Circuit.circuitId ?? ''];
  const completed    = isCompleted(race.date);
  const thisWeekend  = isThisWeekend(race.date);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.imageBox}>
        {circuitImage
          ? <Image source={circuitImage} style={styles.image} resizeMode="cover" />
          : <View style={[styles.image, { backgroundColor: '#222' }]} />}
        <View style={styles.imageOverlay} />
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>RD {race.round}</Text>
        </View>
        {thisWeekend && !completed && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>THIS WEEKEND</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.infoLeft}>
          <Text style={styles.locality}>{race.Circuit.Location.locality}, {race.Circuit.Location.country}</Text>
          <Text style={styles.name} numberOfLines={1}>{race.raceName}</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={completed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)'} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#111', borderRadius: 20, overflow: 'hidden' },
  imageBox: { height: 110, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  roundBadge: {
    position: 'absolute', top: 10, left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  roundText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  liveBadge: {
    position: 'absolute', top: 10, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#E10600', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  info: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  infoLeft: { flex: 1 },
  locality: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  name: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginBottom: 3 },
  date: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
});
