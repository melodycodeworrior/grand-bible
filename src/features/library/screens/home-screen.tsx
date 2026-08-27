import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    AppState,
    FlatList,
    Modal,
    StyleSheet as NativeStyleSheet,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import type { Chapter, RecentBook, Sentence } from "@/core/models";
import { books } from "@/data/library/books";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useReadingProgress } from "@/features/library/providers/reading-progress-provider";
const colors = ["#F9D75C", "#9BE7B2", "#9EC8FF", "#F5A6CB"] as const;
const StyleSheet = Object.assign(NativeStyleSheet, {
  absoluteFillObject: NativeStyleSheet.absoluteFill,
}) as typeof NativeStyleSheet & { absoluteFillObject: object };

function chapterFromRecent(recent: RecentBook) {
  const nextBook = books[recent.bookIndex];
  return (
    nextBook?.source_guess?.chapters?.find(
      (item) => item.chapter_no === recent.chapterNo,
    ) ?? null
  );
}

export default function HomeScreen() {
  const { user, loading, logout } = useAuth();
  const { recentBook, recentBookLoading, totals } = useReadingProgress();
  const insets = useSafeAreaInsets();
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [titlesOpen, setTitlesOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [bookIndex, setBookIndex] = useState(0);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [focusSentenceNo, setFocusSentenceNo] = useState<number | undefined>();
  const book = books[bookIndex];
  const chapters = useMemo(() => book?.source_guess?.chapters ?? [], [book]);
  const title = book?.title_guess ?? "Untitled book";
  const recentChapter = recentBook ? chapterFromRecent(recentBook) : null;
  const filteredBooks = useMemo(
    () =>
      books
        .map((item, index) => ({ ...item, index }))
        .filter((item) =>
          item.title_guess?.toLowerCase().includes(search.toLowerCase()),
        ),
    [search],
  );
  const percentage = totals.chapters
    ? Math.round((totals.completed * 100) / totals.chapters)
    : 0;

  return (
    <View style={s.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={s.safe}>
        <View style={s.top}>
          <Text style={s.brand}>Grandbook</Text>
          <Pressable
            onPress={() =>
              user ? setAccountOpen(true) : router.navigate("/login")
            }
            style={s.avatar}
          >
            <Text style={s.avatarText}>
              {user?.displayName?.[0]?.toUpperCase() ??
                user?.email?.[0]?.toUpperCase() ??
                "GB"}
            </Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open progress overview"
          onPress={() => router.navigate("/explore")}
          style={s.feature}
        >
          <View style={s.featureTop}>
            <View>
              <Text style={s.kicker}>YOUR READING</Text>
              <Text style={s.featureTitle}>Progress overview</Text>
            </View>
            <Text style={s.percent}>{percentage}%</Text>
          </View>
          <View style={s.track}>
            <View style={[s.fill, { width: `${percentage}%` }]} />
          </View>
          <View style={s.metrics}>
            <Metric value={totals.completed} label="chapters read" />
            <Metric value={totals.highlighted} label="marked sentences" />
            <Metric value={totals.sentences} label="total sentences" />
          </View>
        </Pressable>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Continue reading</Text>
          <Pressable onPress={() => setChaptersOpen(true)}>
            <Text style={s.library}>Library</Text>
          </Pressable>
        </View>
        {recentBook && recentChapter ? (
          <Pressable
            onPress={() => {
              setBookIndex(recentBook.bookIndex);
              setFocusSentenceNo(recentBook.sentenceNo);
              setChapter(recentChapter);
            }}
            style={s.continue}
          >
            <View style={s.badge}>
              <Text style={s.badgeText}>
                {String(recentBook.chapterNo).padStart(2, "0")}
              </Text>
            </View>
            <View style={s.continueCopy}>
              <Text numberOfLines={1} style={s.continueTitle}>
                {recentBook.bookTitle}
              </Text>
              <Text numberOfLines={1} style={s.continueSub}>
                Ch. {recentBook.chapterNo} · {recentBook.chapterTitle}
              </Text>
              <Text numberOfLines={2} style={s.continueSentence}>
                {recentBook.sentenceText}
              </Text>
            </View>
            <Text style={s.open}>Open</Text>
          </Pressable>
        ) : recentBookLoading ? (
          <View style={s.continue}>
            <Text style={s.continueSub}>Loading your last chapter…</Text>
          </View>
        ) : (
          <Pressable onPress={() => setChaptersOpen(true)} style={s.continue}>
            <View style={s.badge}>
              <Text style={s.badgeText}>01</Text>
            </View>
            <View style={s.continueCopy}>
              <Text numberOfLines={1} style={s.continueTitle}>
                {title}
              </Text>
              <Text style={s.continueSub}>
                {chapters.length} chapters waiting for you
              </Text>
            </View>
            <Text style={s.open}>Open</Text>
          </Pressable>
        )}
      </SafeAreaView>
      <Pressable
        onPress={() =>
          !loading && (user ? setChaptersOpen(true) : router.navigate("/login"))
        }
        style={[s.discover, { bottom: Math.max(insets.bottom, 14) + 8 }]}
      >
        <Text style={s.discoverText}>Discover Reads</Text>
      </Pressable>
      <Modal
        transparent
        animationType="fade"
        visible={accountOpen}
        onRequestClose={() => setAccountOpen(false)}
      >
        <View style={s.modal}>
          <Pressable style={s.shade} onPress={() => setAccountOpen(false)} />
          <View style={s.accountSheet}>
            <Text style={s.accountName}>
              {user?.displayName || user?.email || "Grandbook reader"}
            </Text>
            <Text style={s.accountEmail}>{user?.email}</Text>
            <Pressable
              onPress={async () => {
                setAccountOpen(false);
                await logout();
                router.replace("/");
              }}
              style={s.logout}
            >
              <Text style={s.logoutText}>Log out</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        animationType="slide"
        visible={chaptersOpen}
        onRequestClose={() => setChaptersOpen(false)}
      >
        <View style={s.modal}>
          <Pressable style={s.shade} onPress={() => setChaptersOpen(false)} />
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Choose a chapter</Text>
            <Pressable onPress={() => setTitlesOpen(true)} style={s.select}>
              <Text style={s.selectText}>{title}</Text>
              <Text>⌄</Text>
            </Pressable>
            <FlatList
              data={chapters}
              keyExtractor={(item) => String(item.chapter_no)}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setFocusSentenceNo(undefined);
                    setChapter(item);
                    setChaptersOpen(false);
                  }}
                  style={s.chapterRow}
                >
                  <View style={s.chapterNumber}>
                    <Text>{item.chapter_no}</Text>
                  </View>
                  <View style={s.chapterCopy}>
                    <Text style={s.chapterKicker}>
                      CHAPTER {item.chapter_no}
                    </Text>
                    <Text style={s.chapterTitle}>
                      {item.chapter_title || "Untitled chapter"}
                    </Text>
                  </View>
                  <Text style={s.open}>Open</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        animationType="fade"
        visible={titlesOpen}
        onRequestClose={() => setTitlesOpen(false)}
      >
        <View style={s.modal}>
          <Pressable style={s.shade} onPress={() => setTitlesOpen(false)} />
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Select a title</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search book…"
              style={s.search}
            />
            <FlatList
              data={filteredBooks}
              keyExtractor={({ index }) => String(index)}
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => {
                    setBookIndex(index);
                    setTitlesOpen(false);
                  }}
                  style={s.titleRow}
                >
                  <Text>{item.title_guess}</Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
      <Modal
        animationType="slide"
        visible={chapter !== null}
        onRequestClose={() => setChapter(null)}
      >
        {chapter ? (
          <ChapterReader
            chapter={chapter}
            bookIndex={bookIndex}
            bookTitle={title}
            focusSentenceNo={focusSentenceNo}
            onBack={() => setChapter(null)}
          />
        ) : null}
      </Modal>
    </View>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function ChapterReader({
  chapter,
  bookIndex,
  bookTitle,
  focusSentenceNo,
  onBack,
}: {
  chapter: Chapter;
  bookIndex: number;
  bookTitle: string;
  focusSentenceNo?: number;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { getHighlight, highlight, isRead, saveRecentBook, toggleRead } =
    useReadingProgress();
  const [selected, setSelected] = useState<Sentence | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const sentenceOffsets = useRef<Record<number, number>>({});
  const visibleSentenceNo = useRef(
    focusSentenceNo ?? chapter.sentences[0]?.sentence_no ?? 1,
  );
  const didScrollToFocus = useRef(false);
  const saveRecentRef = useRef(async () => {});

  const updateVisibleSentence = (offsetY: number) => {
    const entries = Object.entries(sentenceOffsets.current)
      .map(([key, y]) => [Number(key), y] as const)
      .sort((a, b) => a[1] - b[1]);
    let current = entries[0]?.[0] ?? chapter.sentences[0]?.sentence_no ?? 1;
    for (const [sentenceNo, y] of entries) {
      if (y <= offsetY + 24) current = sentenceNo;
      else break;
    }
    visibleSentenceNo.current = current;
  };

  saveRecentRef.current = async () => {
    if (!user) return;
    try {
      await saveRecentBook(
        bookIndex,
        chapter.chapter_no,
        visibleSentenceNo.current,
      );
    } catch (error) {
      console.log("Could not save recent book:", error);
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") {
        void saveRecentRef.current();
      }
    });
    return () => {
      subscription.remove();
      void saveRecentRef.current();
    };
  }, []);

  const closeReader = () => {
    void saveRecentRef.current();
    onBack();
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    updateVisibleSentence(event.nativeEvent.contentOffset.y);
  };

  const save = async (color: string) => {
    if (!selected) return;
    if (!user) {
      Alert.alert(
        "Sign in required",
        "Sign in to save a highlight to Your marks.",
      );
      return;
    }
    setSaving(true);
    try {
      await highlight(
        bookIndex,
        chapter.chapter_no,
        selected.sentence_no,
        color,
      );
      setSelected(null);
    } catch (error) {
      Alert.alert(
        "Could not save highlight",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.reader}>
      <StatusBar style="dark" />
      <SafeAreaView style={s.readerSafe}>
        <View style={s.readerTop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close chapter"
            hitSlop={12}
            onPress={closeReader}
            style={({ hovered, pressed }) => [
              s.backButton,
              (hovered || pressed) && s.backButtonPressed,
            ]}
          >
            <Text style={s.back}>Back</Text>
          </Pressable>
          <Text numberOfLines={1} style={s.readerBook}>
            {bookTitle}
          </Text>
        </View>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.readerContent}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <Text style={s.kicker}>CHAPTER {chapter.chapter_no}</Text>
          <Text style={s.readerTitle}>{chapter.chapter_title}</Text>
          {chapter.sentences.map((sentence) => {
            const color = getHighlight(
              bookIndex,
              chapter.chapter_no,
              sentence.sentence_no,
            );
            const isResume = sentence.sentence_no === focusSentenceNo;
            return (
              <Pressable
                key={sentence.sentence_no}
                onLongPress={() => setSelected(sentence)}
                delayLongPress={350}
                onLayout={(event) => {
                  const y = event.nativeEvent.layout.y;
                  sentenceOffsets.current[sentence.sentence_no] = y;
                  if (
                    focusSentenceNo != null &&
                    sentence.sentence_no === focusSentenceNo &&
                    !didScrollToFocus.current
                  ) {
                    didScrollToFocus.current = true;
                    visibleSentenceNo.current = focusSentenceNo;
                    scrollRef.current?.scrollTo({
                      y: Math.max(0, y - 12),
                      animated: true,
                    });
                  }
                }}
              >
                {color ? (
                  <LinearGradient
                    colors={[color, "#FFFFFF"]}
                    style={s.highlight}
                  >
                    <Text style={s.sentence}>{sentence.sentense_detail}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={[s.sentence, isResume && s.resumeSentence]}>
                    {sentence.sentense_detail}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={s.readerFooter}>
          <Text style={s.footerText}>Long-press a sentence to mark it</Text>
          <Pressable
            onPress={() => toggleRead(bookIndex, chapter.chapter_no)}
            style={s.readButton}
          >
            <Text style={s.readButtonText}>
              {isRead(bookIndex, chapter.chapter_no)
                ? "Marked as read"
                : "Mark as read"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
      <Modal
        transparent
        animationType="fade"
        visible={selected !== null}
        onRequestClose={() => !saving && setSelected(null)}
      >
        <View style={s.pickerModal}>
          <Pressable
            style={s.shade}
            onPress={() => !saving && setSelected(null)}
          />
          <View style={s.picker}>
            <Text style={s.pickerTitle}>Highlight sentence</Text>
            <Text numberOfLines={3} style={s.pickerSentence}>
              {selected?.sentense_detail}
            </Text>
            <Text style={s.pickerHint}>
              Choose a color. This saves it to Your marks.
            </Text>
            <View style={s.swatches}>
              {colors.map((color) => (
                <Pressable
                  key={color}
                  disabled={saving}
                  onPress={() => void save(color)}
                  style={[s.swatch, { backgroundColor: color }]}
                />
              ))}
            </View>
            <Pressable disabled={saving} onPress={() => setSelected(null)}>
              <Text style={s.cancel}>{saving ? "Saving…" : "Cancel"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#242221" },
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { color: "#FBF9F4", fontSize: 20, fontWeight: "700" },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C79832",
  },
  avatarText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  feature: {
    marginTop: 28,
    padding: 22,
    borderRadius: 25,

    backgroundColor: "#F1E6CF",
  },
  featureTop: { flexDirection: "row", justifyContent: "space-between" },
  kicker: {
    color: "#9A701D",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  featureTitle: {
    marginTop: 6,
    color: "#292827",
    fontFamily: "Georgia",
    fontSize: 26,
  },
  percent: { color: "#9A701D", fontSize: 31, fontWeight: "800" },
  track: {
    height: 9,
    borderRadius: 9,
    marginTop: 18,
    backgroundColor: "#DDD0B8",
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: "#C79832" },
  metrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
  },
  metric: { width: "31%" },
  metricValue: { color: "#292827", fontSize: 20, fontWeight: "800" },
  metricLabel: { color: "#77716A", fontSize: 10, marginTop: 3 },
  section: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: { color: "#FBF9F4", fontFamily: "Georgia", fontSize: 18 },
  library: { color: "#D7A94B", fontSize: 12, fontWeight: "700" },
  continue: {
    marginTop: 12,
    padding: 13,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#514D48",
    backgroundColor: "#302E2B",
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#514A3E",
  },
  badgeText: { color: "#E8C77F", fontSize: 11, fontWeight: "700" },
  continueCopy: { flex: 1, marginLeft: 11 },
  continueTitle: { color: "#FBF9F4", fontSize: 13, fontWeight: "600" },
  continueSub: { marginTop: 3, color: "#AAA39A", fontSize: 11 },
  continueSentence: {
    marginTop: 5,
    color: "#C9C2B8",
    fontFamily: "Georgia",
    fontSize: 12,
    lineHeight: 17,
  },
  open: { color: "#E8C77F", fontSize: 11, fontWeight: "700" },
  discover: {
    position: "absolute",
    alignSelf: "center",
    height: 46,
    paddingHorizontal: 24,
    borderRadius: 23,
    backgroundColor: "#C79832",
    justifyContent: "center",
  },
  discoverText: { color: "#fff", fontWeight: "800" },
  modal: { flex: 1, justifyContent: "flex-end" },
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,.52)",
  },
  accountSheet: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FBF9F4",
  },
  accountName: { color: "#292827", fontSize: 18, fontWeight: "700" },
  accountEmail: { color: "#77716A", fontSize: 13, marginTop: 5 },
  logout: {
    marginTop: 22,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#242221",
  },
  logoutText: { color: "#FBF9F4", fontWeight: "800" },
  sheet: {
    height: "76%",
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "#FBF9F4",
  },
  sheetTitle: { color: "#292827", fontFamily: "Georgia", fontSize: 29 },
  select: {
    marginTop: 20,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E1D7C5",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  selectText: { flex: 1, color: "#292827", fontSize: 13, fontWeight: "600" },
  chapterRow: {
    minHeight: 67,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE7DB",
    flexDirection: "row",
    alignItems: "center",
  },
  chapterNumber: {
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4E8CC",
  },
  chapterCopy: { flex: 1, marginLeft: 12 },
  chapterKicker: { color: "#77716A", fontSize: 9, fontWeight: "700" },
  chapterTitle: {
    marginTop: 3,
    color: "#292827",
    fontFamily: "Georgia",
    fontSize: 16,
  },
  search: {
    marginVertical: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E1D7C5",
    borderRadius: 13,
  },
  titleRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE7DB",
  },
  reader: { flex: 1, backgroundColor: "#FBF9F4" },
  readerSafe: { flex: 1 },
  readerTop: {
    height: 58,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: "#EAE2D6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: "#C79832",
  },
  backButtonPressed: { opacity: 0.8 },
  back: { color: "#fff", fontSize: 11, fontWeight: "800" },
  readerBook: {
    maxWidth: "70%",
    color: "#292827",
    fontSize: 12,
    fontWeight: "700",
  },
  readerContent: { padding: 29, paddingBottom: 115 },
  readerTitle: {
    marginTop: 10,
    marginBottom: 24,
    color: "#292827",
    fontFamily: "Georgia",
    fontSize: 33,
  },
  sentence: {
    marginBottom: 17,
    color: "#37332F",
    fontFamily: "Georgia",
    fontSize: 17,
    lineHeight: 28,
  },
  resumeSentence: {
    marginHorizontal: -8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#F4E8CC",
  },
  highlight: { borderRadius: 10, paddingHorizontal: 8, marginBottom: 12 },
  readerFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 14,
    borderTopWidth: 1,
    borderColor: "#EAE2D6",
    backgroundColor: "#FBF9F4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: { color: "#77716A", fontSize: 10, flex: 1 },
  readButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: "#C79832",
  },
  readButtonText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  pickerModal: { flex: 1, justifyContent: "flex-end" },
  picker: {
    padding: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FBF9F4",
  },
  pickerTitle: { color: "#292827", fontFamily: "Georgia", fontSize: 25 },
  pickerSentence: {
    marginTop: 12,
    color: "#55504A",
    fontFamily: "Georgia",
    fontSize: 15,
    lineHeight: 22,
  },
  pickerHint: { marginTop: 18, color: "#77716A", fontSize: 12 },
  swatches: { flexDirection: "row", gap: 14, marginTop: 14 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 2,
  },
  cancel: {
    marginTop: 22,
    color: "#9A701D",
    textAlign: "center",
    fontWeight: "800",
  },
});
