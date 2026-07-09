import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

// ── Constants ──────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
const SQUARE_SIZE = 28;
const SQUARE_GAP = 4;
const DAY_LABEL_HEIGHT = 14;
const WEEK_LABEL_HEIGHT = 12;
const STORAGE_KEY = 'prayerStates';

const COLORS = ['#e2e8f0', '#1e6823', '#8cc665'];
const PRAYER_NAMES = ['Fajr', 'Duhr', 'Asr', 'Maghrib', 'Isha'];
const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const TODAY = new Date();
const START_YEAR = 2020;
const END_YEAR = TODAY.getFullYear() + 2;
const PICKER_CELL_WIDTH = Math.floor((SCREEN_WIDTH - 48 - 32 - 16) / 3);

// ── Global state ───────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────

function dateKey(date, prayer) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${prayer}`;
}

function getMonthsArray() {
  const months = [];
  for (let y = START_YEAR; y <= END_YEAR; y++) {
    for (let m = 0; m < 12; m++) {
      months.push(new Date(y, m, 1));
    }
  }
  return months;
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

function isToday(date) {
  return (
    date.getFullYear() === TODAY.getFullYear() &&
    date.getMonth() === TODAY.getMonth() &&
    date.getDate() === TODAY.getDate()
  );
}

// ── Stats computation ──────────────────────────────────────────────

function computeStats(monthDate) {
  const entries = Object.entries(globalStates);

  if (entries.length === 0) {
    return {
      total: { onTime: 0, madeUp: 0, missed: 0 },
      byPrayer: PRAYER_NAMES.map(() => ({ onTime: 0, madeUp: 0, missed: 0 })),
    };
  }

  // Find earliest logged date for all-time range
  let earliest = new Date(TODAY);
  for (const [key] of entries) {
    const [datePart] = key.split('_');
    const [y, m, d] = datePart.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (date < earliest) earliest = date;
  }

  let start, end;
  if (monthDate) {
    start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    if (end > TODAY) end = new Date(TODAY);
  } else {
    start = new Date(earliest);
    end = new Date(TODAY);
  }

  const byPrayer = PRAYER_NAMES.map(() => ({ onTime: 0, madeUp: 0, missed: 0 }));
  const cur = new Date(start);

  while (cur <= end) {
    for (let p = 0; p < 5; p++) {
      const val = globalStates[dateKey(cur, p)] ?? 0;
      if (val === 1) byPrayer[p].onTime++;
      else if (val === 2) byPrayer[p].madeUp++;
      else byPrayer[p].missed++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  const total = {
    onTime: byPrayer.reduce((s, p) => s + p.onTime, 0),
    madeUp: byPrayer.reduce((s, p) => s + p.madeUp, 0),
    missed: byPrayer.reduce((s, p) => s + p.missed, 0),
  };

  return { total, byPrayer };
}

// ── Grid components ────────────────────────────────────────────────

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
  const today = isToday(date);
  const isMonday = date.getDay() === 1;
  return (
    <View style={[styles.column, today && styles.todayColumn]}>
      <Text style={styles.weekLabel}>{isMonday ? 'Mon' : ''}</Text>
      <Text style={[styles.dayLabel, today && styles.todayDayLabel]}>{date.getDate()}</Text>
      {[0, 1, 2, 3, 4].map((prayer) => (
        <PrayerSquare key={prayer} prayerKey={dateKey(date, prayer)} />
      ))}
    </View>
  );
}

function LabelsColumn() {
  return (
    <View style={styles.labelsColumn}>
      <View style={styles.labelSpacer} />
      {PRAYER_NAMES.map((name) => (
        <Text key={name} style={styles.prayerLabel}>{name}</Text>
      ))}
    </View>
  );
}

function MonthPage({ monthDate, onTitlePress }) {
  const days = getDaysInMonth(monthDate);
  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <TouchableOpacity style={styles.monthTitleRow} onPress={onTitlePress}>
        <Text style={styles.monthTitle}>{monthLabel(monthDate)}</Text>
        <Text style={styles.monthTitleChevron}>▾</Text>
      </TouchableOpacity>
      <View style={styles.gridRow}>
        <LabelsColumn />
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
    </View>
  );
}

const MONTHS = getMonthsArray();
const CURRENT_MONTH_INDEX = MONTHS.findIndex(
  (d) => d.getFullYear() === TODAY.getFullYear() && d.getMonth() === TODAY.getMonth()
);

function MonthPickerModal({ visible, year, onYearChange, onSelect, onDismiss }) {
  const canGoBack = year > START_YEAR;
  const canGoForward = year < END_YEAR;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onDismiss}>
        <TouchableOpacity activeOpacity={1} style={styles.pickerCard}>
          <View style={styles.yearRow}>
            <TouchableOpacity
              onPress={() => canGoBack && onYearChange(year - 1)}
              style={styles.yearArrowBtn}
            >
              <Text style={[styles.yearArrow, !canGoBack && styles.yearArrowDisabled]}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.yearText}>{year}</Text>
            <TouchableOpacity
              onPress={() => canGoForward && onYearChange(year + 1)}
              style={styles.yearArrowBtn}
            >
              <Text style={[styles.yearArrow, !canGoForward && styles.yearArrowDisabled]}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.monthGrid}>
            {MONTH_NAMES_SHORT.map((name, m) => {
              const index = MONTHS.findIndex(
                (d) => d.getFullYear() === year && d.getMonth() === m
              );
              const available = index !== -1;
              const isCurrent =
                year === TODAY.getFullYear() && m === TODAY.getMonth();
              return (
                <TouchableOpacity
                  key={name}
                  onPress={() => available && onSelect(index)}
                  disabled={!available}
                  style={[styles.monthCell, isCurrent && styles.monthCellCurrent]}
                >
                  <Text
                    style={[
                      styles.monthCellText,
                      !available && styles.monthCellDisabled,
                      isCurrent && styles.monthCellCurrentText,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function GridScreen() {
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(CURRENT_MONTH_INDEX);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(TODAY.getFullYear());

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems[0]?.index != null) setCurrentIndex(viewableItems[0].index);
  }, []);

  const openPicker = useCallback(() => {
    setPickerYear(MONTHS[currentIndex]?.getFullYear() ?? TODAY.getFullYear());
    setPickerVisible(true);
  }, [currentIndex]);

  const jumpToMonth = useCallback((index) => {
    setPickerVisible(false);
    flatListRef.current?.scrollToIndex({ index, animated: false });
  }, []);

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={MONTHS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        initialScrollIndex={CURRENT_MONTH_INDEX}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item }) => (
          <MonthPage monthDate={item} onTitlePress={openPicker} />
        )}
      />
      <MonthPickerModal
        visible={pickerVisible}
        year={pickerYear}
        onYearChange={setPickerYear}
        onSelect={jumpToMonth}
        onDismiss={() => setPickerVisible(false)}
      />
    </>
  );
}

// ── Stats components ───────────────────────────────────────────────

function OverviewRow({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const width = `${pct}%`;
  return (
    <View style={styles.overviewRow}>
      <View style={styles.overviewLeft}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.overviewLabel}>{label}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width, backgroundColor: color }]} />
      </View>
      <View style={styles.overviewRight}>
        <Text style={styles.overviewCount}>{value}</Text>
        <Text style={styles.overviewPct}>{pct}%</Text>
      </View>
    </View>
  );
}

function PrayerBreakdownTable({ byPrayer }) {
  return (
    <View>
      <View style={styles.tableHeader}>
        <Text style={styles.tablePrayerCell} />
        <Text style={[styles.tableCell, { color: '#1e6823' }]}>On time</Text>
        <Text style={[styles.tableCell, { color: '#5a9e6f' }]}>Made up</Text>
        <Text style={[styles.tableCell, { color: '#94a3b8' }]}>Missed</Text>
      </View>
      {PRAYER_NAMES.map((name, i) => (
        <View key={name} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
          <Text style={styles.tablePrayerCell}>{name}</Text>
          <Text style={[styles.tableCell, { color: '#1e6823', fontWeight: '600' }]}>
            {byPrayer[i].onTime}
          </Text>
          <Text style={[styles.tableCell, { color: '#5a9e6f', fontWeight: '600' }]}>
            {byPrayer[i].madeUp}
          </Text>
          <Text style={[styles.tableCell, { color: '#94a3b8', fontWeight: '600' }]}>
            {byPrayer[i].missed}
          </Text>
        </View>
      ))}
    </View>
  );
}

function StatSection({ title, stats }) {
  const { total, byPrayer } = stats;
  const totalPrayers = total.onTime + total.madeUp + total.missed;

  return (
    <View style={styles.statSection}>
      <Text style={styles.statSectionTitle}>{title}</Text>

      <View style={styles.card}>
        <OverviewRow label="On time" value={total.onTime} total={totalPrayers} color="#1e6823" />
        <OverviewRow label="Made up" value={total.madeUp} total={totalPrayers} color="#8cc665" />
        <OverviewRow label="Missed"  value={total.missed}  total={totalPrayers} color="#cbd5e1" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>By Prayer</Text>
        <PrayerBreakdownTable byPrayer={byPrayer} />
      </View>
    </View>
  );
}

function StatsScreen() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    onStorageReady(() => forceUpdate((n) => n + 1));
  }, []);

  const monthStats = computeStats(TODAY);
  const allTimeStats = computeStats(null);

  return (
    <ScrollView style={styles.statsContainer} contentContainerStyle={styles.statsContent}>
      <Text style={styles.statsTitle}>Stats</Text>
      <StatSection title={monthLabel(TODAY)} stats={monthStats} />
      <StatSection title="All Time" stats={allTimeStats} />
    </ScrollView>
  );
}

// ── Tab bar ────────────────────────────────────────────────────────

function TabBar({ tab, onSelect }) {
  return (
    <View style={styles.tabBar}>
      {[['grid', 'Tracker'], ['stats', 'Stats']].map(([key, label]) => (
        <TouchableOpacity key={key} style={styles.tabItem} onPress={() => onSelect(key)}>
          {tab === key && <View style={styles.tabIndicator} />}
          <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── App ────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState('grid');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {tab === 'grid' ? <GridScreen /> : <StatsScreen />}
      <TabBar tab={tab} onSelect={setTab} />
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Grid
  page: {
    flex: 1,
    paddingTop: 24,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 6,
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  monthTitleChevron: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 3,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  labelsColumn: {
    paddingLeft: 16,
    paddingRight: 10,
    gap: SQUARE_GAP,
  },
  labelSpacer: {
    height: WEEK_LABEL_HEIGHT + SQUARE_GAP + DAY_LABEL_HEIGHT,
  },
  prayerLabel: {
    height: SQUARE_SIZE,
    lineHeight: SQUARE_SIZE,
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'right',
  },
  grid: {
    paddingRight: 16,
    flexDirection: 'row',
    gap: SQUARE_GAP,
    alignItems: 'flex-start',
  },
  column: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: SQUARE_GAP,
  },
  todayColumn: {
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
  },
  weekLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: '#94a3b8',
    width: SQUARE_SIZE,
    textAlign: 'center',
    height: WEEK_LABEL_HEIGHT,
  },
  dayLabel: {
    fontSize: 10,
    color: '#94a3b8',
    width: SQUARE_SIZE,
    textAlign: 'center',
    height: DAY_LABEL_HEIGHT,
  },
  todayDayLabel: {
    color: '#1e6823',
    fontWeight: '700',
  },
  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    borderRadius: 4,
  },

  // Stats
  statsContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statsContent: {
    paddingBottom: 32,
  },
  statsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 16,
    paddingTop: 24,
    marginBottom: 4,
  },
  statSection: {
    marginTop: 20,
  },
  statSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  overviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 72,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  overviewLabel: {
    fontSize: 13,
    color: '#374151',
  },
  barBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  overviewRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
  },
  overviewCount: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    width: 28,
    textAlign: 'right',
  },
  overviewPct: {
    fontSize: 12,
    color: '#94a3b8',
    width: 32,
    textAlign: 'right',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    textAlign: 'center',
    color: '#374151',
  },
  tablePrayerCell: {
    flex: 1.3,
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1a1a',
    paddingLeft: 2,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2,
    backgroundColor: '#1e6823',
    borderRadius: 1,
  },
  tabLabel: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#1e6823',
    fontWeight: '600',
  },

  // Month picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: SCREEN_WIDTH - 48,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  yearArrowBtn: {
    padding: 8,
  },
  yearArrow: {
    fontSize: 26,
    color: '#1a1a1a',
    lineHeight: 28,
  },
  yearArrowDisabled: {
    color: '#cbd5e1',
  },
  yearText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthCell: {
    width: PICKER_CELL_WIDTH,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  monthCellCurrent: {
    backgroundColor: '#1e6823',
  },
  monthCellText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  monthCellCurrentText: {
    color: '#fff',
  },
  monthCellDisabled: {
    color: '#cbd5e1',
  },
});
