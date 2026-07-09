import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SQUARE_SIZE = 28;
const SQUARE_GAP = 4;
const STORAGE_KEY = 'prayerStates';

// 0 = grey, 1 = dark green (on time), 2 = light green (made up)
const COLORS = ['#e2e8f0', '#1e6823', '#8cc665'];

// Shared in-memory store — loaded once, mutated on each tap
const globalStates = {};
let storageLoaded = false;
let onLoadCallbacks = [];

AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
  if (raw) Object.assign(globalStates, JSON.parse(raw));
  storageLoaded = true;
  onLoadCallbacks.forEach((cb) => cb());
  onLoadCallbacks = [];
});

function onStorageReady(cb) {
  if (storageLoaded) cb();
  else onLoadCallbacks.push(cb);
}

function persistStates() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(globalStates));
}

function dateKey(date, prayer) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${prayer}`;
}

function getMonthsArray() {
  const now = new Date();
  return Array.from({ length: 25 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() + i - 12, 1)
  );
}

function getDaysInMonth(monthDate) {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const count = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => new Date(y, m, i + 1));
}

function monthLabel(date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

// Each square owns its own state — only this component re-renders on tap
function PrayerSquare({ prayerKey }) {
  const [val, setVal] = useState(globalStates[prayerKey] ?? 0);

  useEffect(() => {
    onStorageReady(() => setVal(globalStates[prayerKey] ?? 0));
  }, [prayerKey]);

  const handleTap = useCallback(() => {
    const next = (val + 1) % 3;
    setVal(next);
    globalStates[prayerKey] = next;
    persistStates();
  }, [val, prayerKey]);

  return (
    <TouchableOpacity
      onPress={handleTap}
      activeOpacity={0.7}
      style={[styles.square, { backgroundColor: COLORS[val] }]}
    />
  );
}

function DayColumn({ date }) {
  return (
    <View style={styles.column}>
      <Text style={styles.dayLabel}>{date.getDate()}</Text>
      {[0, 1, 2, 3, 4].map((prayer) => (
        <PrayerSquare key={prayer} prayerKey={dateKey(date, prayer)} />
      ))}
    </View>
  );
}

function MonthPage({ monthDate }) {
  const days = getDaysInMonth(monthDate);
  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <Text style={styles.monthTitle}>{monthLabel(monthDate)}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {days.map((day) => (
          <DayColumn key={day.getDate()} date={day} />
        ))}
      </ScrollView>
    </View>
  );
}

const MONTHS = getMonthsArray();

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <FlatList
        data={MONTHS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        initialScrollIndex={12}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => <MonthPage monthDate={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  page: {
    flex: 1,
    paddingTop: 24,
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 16,
    color: '#1a1a1a',
  },
  grid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: SQUARE_GAP,
    alignItems: 'flex-start',
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: SQUARE_GAP,
  },
  dayLabel: {
    fontSize: 10,
    color: '#94a3b8',
    width: SQUARE_SIZE,
    textAlign: 'center',
    marginBottom: 2,
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: 4,
  },
});
