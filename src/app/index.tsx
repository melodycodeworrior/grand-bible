import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Sentence = { sentence_no: number; sentense_detail: string };
type Chapter = { chapter_no: number; chapter_title: string; sentences: Sentence[] };
type Book = { title_guess: string | null; source_guess?: { chapters?: Chapter[] } };

const library = require('../../assets/json/grand_with_chapters.json') as Book[];
const books = library.filter((book) => book.title_guess && book.source_guess?.chapters?.length);
const c = { ink: '#292827', paper: '#FBF9F4', cream: '#F1E6CF', gold: '#C79832', goldDark: '#9A701D', muted: '#77716A', line: '#E1D7C5', night: '#242221' };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [titlesOpen, setTitlesOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [bookIndex, setBookIndex] = useState(0);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const book = books[bookIndex];
  const chapters = useMemo(() => book.source_guess?.chapters ?? [], [book]);
  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return books
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !query || item.title_guess?.toLowerCase().includes(query));
  }, [search]);
  const title = book.title_guess ?? 'Untitled book';
  const read = (item: Chapter) => { setChapter(item); setChaptersOpen(false); };

  return <View style={s.screen}>
    <StatusBar style="light" />
    <SafeAreaView style={s.safe}>
      <View style={s.top}><Text style={s.brand}>Grandbook</Text><View style={s.avatar}><Text style={s.avatarDot}>●</Text></View></View>
      <Text style={s.eyebrow}>YOUR QUIET READING SPACE</Text>
      <Text style={s.greeting}>Make time for{`\n`}a great read.</Text>
      <View style={s.feature}>
        <View style={s.bookArt}><View style={[s.page, s.left]} /><View style={[s.page, s.right]} /><View style={s.spine} /></View>
        <Text style={s.kicker}>EXPLORE THE LIBRARY</Text><Text style={s.featureTitle}>Stories and wisdom,{`\n`}chapter by chapter.</Text>
        <Text style={s.featureCopy}>Choose a title, pick a chapter, and settle in with a beautifully simple reader.</Text>
      </View>
      <View style={s.section}><Text style={s.sectionTitle}>Continue reading</Text><Text style={s.library}>Library</Text></View>
      <View style={s.continue}><View style={s.badge}><Text style={s.badgeText}>01</Text></View><View style={s.continueCopy}><Text numberOfLines={1} style={s.continueTitle}>{title}</Text><Text style={s.continueSub}>{chapters.length} chapters waiting for you</Text></View><Text style={s.arrow}>→</Text></View>
    </SafeAreaView>
    <Pressable accessibilityRole="button" accessibilityLabel="Discover reads" onPress={() => setChaptersOpen(true)} style={[s.discover, { bottom: Math.max(insets.bottom, 14) + 12 }]}><Text style={s.discoverText}>Discover Reads</Text><View style={s.discoverRound}><Text style={s.up}>↑</Text></View></Pressable>

    <Modal transparent animationType="slide" visible={chaptersOpen} onRequestClose={() => setChaptersOpen(false)}>
      <View style={s.modal}><Pressable style={s.shade} onPress={() => setChaptersOpen(false)} /><View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={s.handle} /><Text style={s.sheetKicker}>THE GRAND LIBRARY</Text><Text style={s.sheetTitle}>Choose a chapter</Text>
        <Pressable accessibilityRole="button" onPress={() => setTitlesOpen(true)} style={s.select}><View style={{ flex: 1 }}><Text style={s.selectLabel}>SELECTED TITLE</Text><Text numberOfLines={2} style={s.selectValue}>{title}</Text></View><Text style={s.chevron}>⌄</Text></Pressable>
        <Text style={s.count}>{chapters.length} chapters</Text>
        <FlatList data={chapters} keyExtractor={(item, index) => `${item.chapter_no}-${index}`} showsVerticalScrollIndicator={false} contentContainerStyle={s.chapterList} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => read(item)} style={s.chapterRow}><View style={s.chapterNo}><Text style={s.chapterNoText}>{item.chapter_no}</Text></View><View style={s.chapterInfo}><Text style={s.chapterOverline}>CHAPTER {item.chapter_no}</Text><Text numberOfLines={1} style={s.chapterTitle}>{item.chapter_title || 'Untitled chapter'}</Text></View><Text style={s.chapterArrow}>→</Text></Pressable>} />
      </View></View>
    </Modal>

    <Modal transparent animationType="fade" visible={titlesOpen} onRequestClose={() => setTitlesOpen(false)}>
      <View style={s.modal}><Pressable style={s.shade} onPress={() => setTitlesOpen(false)} /><View style={[s.titlePicker, { paddingBottom: Math.max(insets.bottom, 16) }]}><View style={s.handle} /><Text style={s.pickerTitle}>Select a title</Text>
        <View style={s.searchBox}><Text style={s.searchIcon}>⌕</Text><TextInput value={search} onChangeText={setSearch} placeholder="Search book..." placeholderTextColor="#938C82" style={s.searchInput} autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing" /></View>
        <FlatList data={filteredBooks} keyExtractor={({ index }) => String(index)} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} ListEmptyComponent={<Text style={s.emptySearch}>No books found.</Text>} renderItem={({ item: entry }) => <Pressable onPress={() => { setBookIndex(entry.index); setSearch(''); setTitlesOpen(false); }} style={[s.titleRow, entry.index === bookIndex && s.titleActive]}><Text numberOfLines={2} style={[s.titleOption, entry.index === bookIndex && s.titleOptionActive]}>{entry.item.title_guess}</Text>{entry.index === bookIndex && <Text style={s.tick}>✓</Text>}</Pressable>} />
      </View></View>
    </Modal>

    <Modal animationType="slide" visible={chapter !== null} onRequestClose={() => setChapter(null)}>{chapter && <Reader chapter={chapter} bookTitle={title} onBack={() => setChapter(null)} />}</Modal>
  </View>;
}

function Reader({ chapter, bookTitle, onBack }: { chapter: Chapter; bookTitle: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [large, setLarge] = useState(false);
  return <View style={s.reader}><StatusBar style="dark" /><SafeAreaView style={{ flex: 1 }}><View style={s.readerTop}><Pressable accessibilityRole="button" accessibilityLabel="Back to chapters" hitSlop={12} onPress={onBack}><Text style={s.back}>←</Text></Pressable><Text numberOfLines={1} style={s.readerBook}>{bookTitle}</Text><Pressable accessibilityRole="button" accessibilityLabel="Change text size" hitSlop={12} onPress={() => setLarge(!large)}><Text style={s.aa}>Aᴀ</Text></Pressable></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.readerContent, { paddingBottom: Math.max(insets.bottom, 16) + 77 }]}><Text style={s.readerKicker}>CHAPTER {chapter.chapter_no}</Text><Text style={s.readerTitle}>{chapter.chapter_title || `Chapter ${chapter.chapter_no}`}</Text><View style={s.divider} />
      {chapter.sentences.map((sentence, index) => <Text key={`${sentence.sentence_no}-${index}`} style={[s.sentence, large && s.sentenceLarge]}>{index === 0 && <Text style={[s.dropcap, large && s.dropcapLarge]}>{sentence.sentense_detail.charAt(0)}</Text>}{index === 0 ? sentence.sentense_detail.slice(1) : sentence.sentense_detail}</Text>)}</ScrollView>
  </SafeAreaView><View style={[s.readerFooter, { paddingBottom: Math.max(insets.bottom, 14) }]}><Text style={s.footerText}>Chapter {chapter.chapter_no}</Text><View style={s.footerLine}><View style={s.progress} /></View><Text style={s.footerText}>{chapter.sentences.length} verses</Text></View></View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.night }, safe: { flex: 1, paddingHorizontal: 20, paddingTop: 8 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brand: { color: c.paper, fontSize: 20, fontWeight: '700', letterSpacing: -0.6 }, avatar: { width: 35, height: 35, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: c.gold }, avatarDot: { color: c.paper, fontSize: 13 }, eyebrow: { marginTop: 34, color: '#BEB6A8', fontSize: 11, letterSpacing: 1.5, fontWeight: '700' }, greeting: { marginTop: 8, color: c.paper, fontFamily: 'Georgia', fontSize: 35, lineHeight: 40, letterSpacing: -1.2 },
  feature: { height: 285, marginTop: 27, padding: 22, borderRadius: 25, overflow: 'hidden', backgroundColor: c.cream }, bookArt: { position: 'absolute', top: 25, right: -10, width: 157, height: 125, transform: [{ rotate: '-9deg' }] }, page: { position: 'absolute', top: 12, width: 70, height: 96, borderRadius: 5, backgroundColor: '#FFFDF7', shadowColor: '#6B4B20', shadowOpacity: 0.22, shadowRadius: 5, shadowOffset: { width: 1, height: 4 } }, left: { left: 7, transform: [{ skewY: '-8deg' }] }, right: { left: 75, transform: [{ skewY: '8deg' }] }, spine: { position: 'absolute', left: 74, top: 10, width: 6, height: 99, borderRadius: 4, backgroundColor: '#A16E28' }, kicker: { marginTop: 142, color: c.goldDark, fontSize: 10, letterSpacing: 1.4, fontWeight: '800' }, featureTitle: { marginTop: 6, color: c.ink, fontFamily: 'Georgia', fontSize: 25, lineHeight: 29, letterSpacing: -0.55 }, featureCopy: { maxWidth: '90%', marginTop: 8, color: '#6C655B', fontSize: 12, lineHeight: 17 },
  section: { marginTop: 23, flexDirection: 'row', justifyContent: 'space-between' }, sectionTitle: { color: c.paper, fontFamily: 'Georgia', fontSize: 18 }, library: { color: '#D7A94B', fontSize: 12, fontWeight: '700' }, continue: { marginTop: 12, padding: 13, borderRadius: 17, borderWidth: 1, borderColor: '#514D48', backgroundColor: '#302E2B', flexDirection: 'row', alignItems: 'center' }, badge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#514A3E' }, badgeText: { color: '#E8C77F', fontSize: 11, fontWeight: '700' }, continueCopy: { flex: 1, marginLeft: 11 }, continueTitle: { color: c.paper, fontSize: 13, fontWeight: '600' }, continueSub: { marginTop: 3, color: '#AAA39A', fontSize: 11 }, arrow: { color: '#E8C77F', fontSize: 21 },
  discover: { position: 'absolute', alignSelf: 'center', height: 54, paddingLeft: 23, paddingRight: 5, borderRadius: 28, backgroundColor: c.gold, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 11, shadowOffset: { width: 0, height: 5 } }, discoverText: { color: '#fff', fontSize: 15, fontWeight: '800' }, discoverRound: { width: 44, height: 44, marginLeft: 16, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#A97820' }, up: { color: '#fff', fontSize: 21, fontWeight: '700' },
  modal: { flex: 1, justifyContent: 'flex-end' }, shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.52)' }, sheet: { minHeight: '65%', maxHeight: '82%', paddingTop: 11, paddingHorizontal: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: c.paper }, handle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 3, backgroundColor: '#D7CCBA' }, sheetKicker: { marginTop: 19, color: c.goldDark, fontSize: 10, letterSpacing: 1.35, fontWeight: '800' }, sheetTitle: { marginTop: 5, color: c.ink, fontFamily: 'Georgia', fontSize: 29, letterSpacing: -0.6 }, select: { marginTop: 20, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center' }, selectLabel: { color: c.muted, fontSize: 9, letterSpacing: 1.05, fontWeight: '700' }, selectValue: { marginTop: 3, color: c.ink, fontSize: 13, lineHeight: 18, fontWeight: '600' }, chevron: { color: c.goldDark, fontSize: 23 }, count: { marginTop: 17, color: c.muted, fontSize: 12, fontWeight: '600' }, chapterList: { paddingTop: 8, paddingBottom: 20 }, chapterRow: { minHeight: 67, borderBottomWidth: 1, borderBottomColor: '#EEE7DB', flexDirection: 'row', alignItems: 'center' }, chapterNo: { width: 35, height: 35, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4E8CC' }, chapterNoText: { color: c.goldDark, fontSize: 12, fontWeight: '800' }, chapterInfo: { flex: 1, marginLeft: 12, marginRight: 8 }, chapterOverline: { color: c.muted, fontSize: 9, letterSpacing: 1, fontWeight: '700' }, chapterTitle: { marginTop: 3, color: c.ink, fontFamily: 'Georgia', fontSize: 16 }, chapterArrow: { color: c.goldDark, fontSize: 19 },
  titlePicker: { minHeight: '48%', maxHeight: '72%', paddingTop: 11, paddingHorizontal: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: c.paper }, pickerTitle: { marginTop: 17, marginBottom: 12, color: c.ink, fontFamily: 'Georgia', fontSize: 26 }, searchBox: { height: 47, marginBottom: 8, paddingHorizontal: 13, borderWidth: 1, borderColor: c.line, borderRadius: 13, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center' }, searchIcon: { marginRight: 8, color: c.goldDark, fontSize: 23 }, searchInput: { flex: 1, height: '100%', color: c.ink, fontSize: 14 }, emptySearch: { marginTop: 30, color: c.muted, textAlign: 'center', fontSize: 14 }, titleRow: { minHeight: 64, paddingHorizontal: 4, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#EEE7DB', flexDirection: 'row', alignItems: 'center' }, titleActive: { backgroundColor: '#F7EEDC' }, titleOption: { flex: 1, color: '#514C45', fontSize: 13, lineHeight: 18 }, titleOptionActive: { color: c.ink, fontWeight: '700' }, tick: { marginLeft: 10, color: c.goldDark, fontSize: 18, fontWeight: '700' },
  reader: { flex: 1, backgroundColor: c.paper }, readerTop: { height: 58, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#EAE2D6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { color: c.ink, fontSize: 26 }, readerBook: { width: '68%', color: '#46413B', fontSize: 12, textAlign: 'center', fontWeight: '700' }, aa: { color: c.ink, fontSize: 17, fontWeight: '700' }, readerContent: { paddingTop: 50, paddingHorizontal: 29 }, readerKicker: { color: c.goldDark, fontSize: 10, letterSpacing: 1.7, fontWeight: '800' }, readerTitle: { marginTop: 11, color: c.ink, fontFamily: 'Georgia', fontSize: 34, lineHeight: 39, letterSpacing: -0.8 }, divider: { width: 42, height: 3, marginTop: 25, marginBottom: 25, borderRadius: 2, backgroundColor: c.gold }, sentence: { marginBottom: 17, color: '#37332F', fontFamily: 'Georgia', fontSize: 17, lineHeight: 28 }, sentenceLarge: { fontSize: 20, lineHeight: 32 }, dropcap: { color: c.ink, fontFamily: 'Georgia', fontSize: 49, lineHeight: 41, fontWeight: '700' }, dropcapLarge: { fontSize: 57, lineHeight: 48 }, readerFooter: { position: 'absolute', right: 0, bottom: 0, left: 0, paddingTop: 13, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#EAE2D6', backgroundColor: 'rgba(251,249,244,0.96)', flexDirection: 'row', alignItems: 'center' }, footerText: { color: c.muted, fontSize: 10, fontWeight: '600' }, footerLine: { flex: 1, height: 3, marginHorizontal: 12, borderRadius: 2, backgroundColor: '#E7DED0' }, progress: { width: '24%', height: 3, borderRadius: 2, backgroundColor: c.gold },
});
