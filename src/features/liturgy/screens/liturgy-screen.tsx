import { GrandbookTheme as theme } from "@/constants/grandbook-theme";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
type Section = "reading1" | "psalm" | "reading2" | "acclamation" | "Gospel";
type Entry = {
  id: string;
  date: string;
  day: string;
  event: string;
  liturgicalColor: string;
  feast: string;
  content: string;
};
const order: Section[] = [
  "reading1",
  "psalm",
  "reading2",
  "acclamation",
  "Gospel",
];
const labels: Record<Section, string> = {
  reading1: "READING 1",
  psalm: "PSALM",
  reading2: "READING 2",
  acclamation: "ACCLAMATION",
  Gospel: "GOSPEL",
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const diary = require("../../../../assets/csv/diary.csv");
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const liturgicalGradient = (value: string): [string, string] => {
  if (value.includes("ಪಾಚ್ವೊ")) return ["#197A35", "#59BC6A"];
  if (value.includes("ಧವೊ")) return ["#C8C8C2", "#FFFFFF"];
  if (value.includes("ತಾಂಬ್ಡೊ")) return ["#A1080C", "#E54A4E"];
  return ["#550A87", "#A36AC4"];
};
const clean = (v: string) =>
  v
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>|<\/div>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/(ಯಾಜಕ್:)/g, "\n\n$1")
    .trim();
const scriptureLabelPattern = /<b>\s*([^<]*\d+\s*:\s*[\d\s.,;\-–]+)\s*<\/b>/gi;
const responsePattern =
  /(?:<span\s+class=["']text-danger["']>\s*<b>\s*(ಯಾಜಕ್:)\s*<\/b>\s*<\/span>\s*)?<b>\s*(ದೆವಾಚೆಂ ಉತರ್ ಹೆಂ\.|ಲೋಕ್:\s*ವಾಖಣ್ಣಿ ತುಕಾ,\s*ಕ್ರಿಸ್ತಾ\.|ಲೋಕ್:\s*ದೆವಾಚೊ ವ್ಹಡ್ ಉಪ್ಕಾರ್)\s*<\/b>/gi;
const gospelConclusion =
  /(?:<span\s+class=["']text-(?:primary|pink)["']>\s*)?<b>\s*ಲೋಕ್:\s*(?:ವಾಖಣ್ಣಿ ತುಕಾ,\s*ಕ್ರಿಸ್ತಾ\.|ದೆವಾಚೊ ವ್ಹಡ್ ಉಪ್ಕಾರ್)\s*<\/b>(?:\s*<\/span>)?/i;
function labelledContent(value: string) {
  const labels = [...value.matchAll(scriptureLabelPattern)].map((match) =>
    clean(match[1]),
  );
  const responses = [...value.matchAll(responsePattern)].map((match) =>
    clean(`${match[1] ? `${match[1]} ` : ""}${match[2]}`),
  );
  return {
    labels,
    responses,
    text: clean(
      value.replace(scriptureLabelPattern, "").replace(responsePattern, ""),
    ),
  };
}
function parse(raw: string): Entry[] {
  const starts = [
    ...raw.matchAll(/(?:(?<=^)|(?<=[#%]))(\d+)##(\d{4}-\d{2}-\d{2})##/g),
  ];
  return starts.flatMap((m, i) => {
    const v = raw
      .slice(m.index, starts[i + 1]?.index ?? raw.length)
      .trim()
      .split("##");
    return v.length < 8
      ? []
      : [
          {
            id: v[0].trim(),
            date: v[1].trim(),
            day: v[2].trim(),
            event: v[4].trim(),
            liturgicalColor: v[6].trim(),
            feast: v[7].trim(),
            content: v.slice(8).join("##").trim(),
          },
        ];
  });
}
function split(raw: string): Partial<Record<Section, string>> {
  const result: Partial<Record<Section, string[]>> = {};
  let current: Section = "reading1";
  const add = (text: string) => {
    (result[current] ??= []).push(text);
  };
  for (const part of raw
    .split(/##+/)
    .map((x) => x.trim())
    .filter(Boolean)) {
    const lower = part.toLowerCase();
    const psalm = /psalm|text-warning|text-success|ಕೀರ್ತ|ಶ್ಲೋಕ/.test(lower);
    const acclamation = /acclamation|alleluia|ಅಲ್ಲೆಲೂಯಾ|ಉದ್ಗಾರ/.test(lower);
    const Gospel =
      /gospel|<b>\s*(mark|matthew|luke|john)|ಸುವಾರ್ತೆ|ಮಾರ್ಕ್|ಮಾತೆವ್|ಲೂಕ್|ಜುವಾಂ/.test(
        lower,
      );
    const markers = [...part.matchAll(/<b>[^<]{0,80}\d+\s*:\s*\d+/gi)];
    if (acclamation && markers.length > 1) {
      current = "acclamation";
      add(part.slice(0, markers[1].index).trim());
      current = "Gospel";
      add(part.slice(markers[1].index).trim());
      continue;
    }
    if (psalm) current = "psalm";
    else if (acclamation) current = "acclamation";
    else if (Gospel) current = "Gospel";
    else if (current === "psalm") current = "reading2";
    add(part);
  }
  return Object.fromEntries(
    Object.entries(result).map(([key, value]) => {
      const content = value!.join("\n\n");
      const psalm = content.replace(/\bYear\s+[ABC]\b[\s\S]*/i, "").trim();
      const reading2 =
        psalm.match(/[\s\S]*?class="text-pink"[\s\S]*?<\/span>/i)?.[0] ?? psalm;
      const Gospel =
        psalm.match(/[\s\S]*?class="text-primary"[\s\S]*?<\/span>/i)?.[0] ??
        psalm;
      return [
        key,
        key === "psalm"
          ? psalm
          : key === "reading2"
            ? reading2
            : key === "Gospel"
              ? Gospel
              : content,
      ];
    }),
  ) as Partial<Record<Section, string>>;
}
export default function LiturgyScreen() {
  const [entries, setEntries] = useState<Entry[]>([]),
    [date, setDate] = useState(""),
    [active, setActive] = useState<Record<string, Section>>({}),
    [calendar, setCalendar] = useState(false),
    [month, setMonth] = useState(new Date());
  useEffect(() => {
    void (async () => {
      const [a] = await Asset.loadAsync(diary);
      const data = parse(await new File(a.localUri!).text());
      setEntries(data);
      const today = keyOf(new Date());
      setDate(
        data.some((x) => x.date === today) ? today : (data[0]?.date ?? ""),
      );
    })();
  }, []);
  const dates = useMemo(() => new Set(entries.map((x) => x.date)), [entries]);
  const readings = entries.filter((x) => x.date === date);
  const season = readings[0]?.liturgicalColor ?? "";
  const seasonText = season.includes("ಧವೊ") ? theme.colors.night : "#FFFFFF";
  if (!date)
    return (
      <View style={s.center}>
        <ActivityIndicator color={theme.colors.gold} size="large" />
      </View>
    );
  const first = new Date(month.getFullYear(), month.getMonth(), 1),
    offset = first.getDay(),
    total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: offset + total }, (_, i) =>
    i < offset
      ? null
      : new Date(month.getFullYear(), month.getMonth(), i - offset + 1),
  );
  return (
    <View style={s.screen}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.title}>Liturgy</Text>
          <Text style={s.feast}>
            {[...new Set(readings.map((x) => x.feast).filter(Boolean))].join(
              " · ",
            )}
          </Text>
          <View style={s.header}>
            <LinearGradient
              colors={[theme.colors.night, theme.colors.nav]}
              style={s.dateCard}
            >
              <Text style={s.date}>
                {new Intl.DateTimeFormat(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(`${date}T00:00:00`))}
              </Text>
              <Text style={s.event}>{readings[0]?.event}</Text>
            </LinearGradient>
            <Pressable
              onPress={() => {
                setMonth(new Date(`${date}T00:00:00`));
                setCalendar(true);
              }}
              style={s.calendar}
            >
              <LinearGradient
                colors={liturgicalGradient(season)}
                style={s.calendarFill}
              >
                <SymbolView
                  name={{
                    ios: "calendar",
                    android: "calendar_month",
                    web: "calendar_month",
                  }}
                  size={25}
                  tintColor={seasonText}
                />
                <Text style={[s.day, { color: seasonText }]}>
                  {readings[0]?.day}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
          {readings.map((entry) => {
            const sections = split(entry.content),
              available = order.filter((x) => sections[x]?.trim()),
              selected =
                active[entry.id] && available.includes(active[entry.id])
                  ? active[entry.id]
                  : available.includes("Gospel")
                    ? "Gospel"
                    : available[0];
            const rawSection = sections[selected] ?? "";
            const conclusion = rawSection.match(gospelConclusion);
            const shouldTrimAtResponse = [
              "reading1",
              "reading2",
              "Gospel",
            ].includes(selected);
            const content =
              shouldTrimAtResponse && conclusion?.index !== undefined
                ? rawSection.slice(0, conclusion.index + conclusion[0].length)
                : rawSection;
            const display = labelledContent(content);
            return selected ? (
              <View key={entry.id} style={s.card}>
                <View style={s.tabs}>
                  {available.map((x) => (
                    <Pressable
                      key={x}
                      onPress={() =>
                        setActive((v) => ({ ...v, [entry.id]: x }))
                      }
                      style={[s.tab, x === selected && s.tabOn]}
                    >
                      <Text style={[s.tabText, x === selected && s.tabTextOn]}>
                        {labels[x]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {display.labels.map((label, index) => (
                  <View key={`${label}-${index}`} style={s.scriptureLabel}>
                    <Text style={s.scriptureLabelText}>{label}</Text>
                  </View>
                ))}
                <Text selectable style={s.body}>
                  {display.text}
                </Text>
                {display.responses.map((response, index) => (
                  <View key={`${response}-${index}`} style={s.responseBox}>
                    <Text style={s.responseText}>{response}</Text>
                  </View>
                ))}
              </View>
            ) : null;
          })}
        </ScrollView>
        <Pressable
          onPress={() => {
            setMonth(new Date());
            setCalendar(true);
          }}
          style={s.today}
        >
          <Text style={s.todayText}>Today</Text>
        </Pressable>
        <Modal
          transparent
          animationType="slide"
          visible={calendar}
          onRequestClose={() => setCalendar(false)}
        >
          <View style={s.modal}>
            <Pressable style={s.shade} onPress={() => setCalendar(false)} />
            <View style={s.sheet}>
              <View style={s.monthHead}>
                <Pressable
                  onPress={() =>
                    setMonth(
                      (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                    )
                  }
                  style={s.monthNav}
                >
                  <Text style={s.arrow}>‹</Text>
                </Pressable>
                <Text style={s.month}>
                  {new Intl.DateTimeFormat(undefined, {
                    month: "long",
                    year: "numeric",
                  }).format(month)}
                </Text>
                <Pressable
                  onPress={() =>
                    setMonth(
                      (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
                    )
                  }
                  style={s.monthNav}
                >
                  <Text style={s.arrow}>›</Text>
                </Pressable>
              </View>
              <View style={s.week}>
                {["S", "M", "T", "W", "T", "F", "S"].map((x, i) => (
                  <Text key={i} style={s.weekday}>
                    {x}
                  </Text>
                ))}
              </View>
              <View style={s.grid}>
                {days.map((d, i) => {
                  const k = d ? keyOf(d) : `blank${i}`,
                    hasReading = Boolean(d && dates.has(k));
                  return (
                    <Pressable
                      key={k}
                      disabled={!d}
                      onPress={() => {
                        setDate(k);
                        setCalendar(false);
                      }}
                      style={[
                        s.cell,
                        k === date && s.selected,
                        !hasReading && d && s.disabled,
                      ]}
                    >
                      <Text style={[s.cellText, k === date && s.selectedText]}>
                        {d?.getDate() ?? ""}
                      </Text>
                      {hasReading && k !== date ? (
                        <View style={s.readingDot} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#90796f" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.night,
  },
  content: { paddingBottom: 90 },
  title: {
    marginTop: 14,
    color: theme.colors.paper,
    fontFamily: theme.fonts.serif,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  feast: {
    marginTop: 7,
    paddingHorizontal: 20,
    color: "#1b1212",
    fontSize: 15,
    textAlign: "center",
  },
  header: {
    marginTop: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  dateCard: { flex: 1, marginRight: 14, padding: 14, borderRadius: 16 },
  date: {
    color: theme.colors.paper,
    fontFamily: theme.fonts.serif,
    fontSize: 17,
    fontWeight: "700",
  },
  event: { marginTop: 7, color: theme.colors.cream, fontSize: 11 },
  calendar: {
    width: 76,
    minHeight: 76,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarFill: {
    width: 76,
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
  },
  day: {
    marginTop: 3,
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 15,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.cream,
  },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.cream,
  },
  tabOn: { backgroundColor: theme.colors.night },
  tabText: { color: theme.colors.ink, fontSize: 12, fontWeight: "800" },
  tabTextOn: { color: theme.colors.paper },
  scriptureLabel: {
    alignSelf: "flex-start",
    marginTop: 13,
    marginHorizontal: 13,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "#B42318",
  },
  scriptureLabelText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  responseBox: {
    marginTop: 10,
    padding: 11,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#B42318",
    backgroundColor: "#FFF1F0",
  },
  responseText: { color: "#8A1C16", fontSize: 14, fontWeight: "800" },
  body: {
    marginTop: 13,
    padding: 13,
    borderRadius: 10,
    backgroundColor: theme.colors.paper,
    color: theme.colors.ink,
    fontSize: 14,
    lineHeight: 24,
  },
  today: {
    position: "absolute",
    right: 20,
    bottom: 18,
    paddingHorizontal: 17,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.night,
  },
  todayText: { color: theme.colors.paper, fontWeight: "800" },
  modal: { flex: 1, justifyContent: "flex-end" },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,.45)" },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 20,
    paddingBottom: 26,
    borderRadius: 28,
    backgroundColor: theme.colors.paper,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  monthHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  month: {
    fontFamily: theme.fonts.serif,
    fontSize: 21,
    color: theme.colors.ink,
  },
  monthNav: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.cream,
  },
  arrow: { marginTop: -5, fontSize: 31, color: theme.colors.ink },
  week: { marginTop: 22, flexDirection: "row" },
  weekday: {
    width: "14.2857%",
    textAlign: "center",
    color: theme.colors.muted,
    fontWeight: "700",
  },
  grid: { marginTop: 12, flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  selected: { backgroundColor: theme.colors.night },
  disabled: { opacity: 0.35 },
  cellText: { color: theme.colors.ink, fontWeight: "700" },
  selectedText: { color: theme.colors.paper },
  readingDot: {
    position: "absolute",
    bottom: 7,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.gold,
  },
});
