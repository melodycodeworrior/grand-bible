import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Highlight, useReadingProgress } from '@/features/library/providers/reading-progress-provider';

export default function ReadScreen() {
  const { highlights, highlightsLoading, removeHighlight, totals } = useReadingProgress();

  const remove = (highlight: Highlight) => {
    Alert.alert('Remove highlight?', 'This removes the saved mark from your library.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removeHighlight(highlight.id).catch(showError) },
    ]);
  };

  return <View style={s.screen}><StatusBar style="light" /><SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <Text style={s.kicker}>YOUR LIBRARY</Text><Text style={s.title}>Read</Text>
    <View style={s.card}><Text style={s.cardKicker}>THIS SESSION</Text><Text style={s.cardTitle}>Continue your reading</Text><Text style={s.copy}>Choose a book and chapter from Home. Your reading progress is saved for this session.</Text><View style={s.line}><View style={[s.fill, { width: `${totals.chapters ? totals.completed * 100 / totals.chapters : 0}%` }]} /></View><Text style={s.progress}>{totals.completed} of {totals.chapters} chapters completed</Text></View>
    <Text style={s.heading}>Your marks</Text>
    <View style={s.summary}><Text style={s.summaryValue}>{totals.highlighted}</Text><Text style={s.summaryLabel}>sentences highlighted</Text></View>
    {highlightsLoading ? <Text style={s.empty}>Loading your saved marks…</Text> : null}
    {!highlightsLoading && highlights.length === 0 ? <Text style={s.empty}>Long-press a sentence in a chapter to save its first mark.</Text> : null}
    {highlights.map((highlight) => <View key={highlight.id} style={[s.mark, { borderLeftColor: highlight.color }]}>
      <View style={s.markCopy}><Text style={s.reference}>{highlight.bookTitle} · {highlight.chapterTitle} {highlight.chapterNo}:{highlight.sentenceNo}</Text><Text numberOfLines={3} style={s.markText}>{highlight.sentenceText}</Text></View>
      <Pressable accessibilityLabel="Remove highlight" hitSlop={10} onPress={() => remove(highlight)} style={s.remove}><Text style={s.removeText}>×</Text></Pressable>
    </View>)}
  </ScrollView></SafeAreaView></View>;
}

function showError(error: unknown) {
  Alert.alert('Could not remove highlight', error instanceof Error ? error.message : 'Please try again.');
}

const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#242221' }, safe: { flex: 1 }, content: { padding: 20, paddingBottom: 40 }, kicker: { marginTop: 10, color: '#D7A94B', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }, title: { marginTop: 8, color: '#FBF9F4', fontFamily: 'Georgia', fontSize: 40 }, card: { marginTop: 25, padding: 22, borderRadius: 24, backgroundColor: '#F1E6CF' }, cardKicker: { color: '#9A701D', fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, cardTitle: { marginTop: 9, color: '#292827', fontFamily: 'Georgia', fontSize: 26 }, copy: { marginTop: 10, color: '#6C655B', fontSize: 13, lineHeight: 19 }, line: { height: 8, marginTop: 22, borderRadius: 7, backgroundColor: '#DDD0B8', overflow: 'hidden' }, fill: { height: '100%', backgroundColor: '#C79832' }, progress: { marginTop: 8, color: '#77716A', fontSize: 11 }, heading: { marginTop: 27, color: '#FBF9F4', fontFamily: 'Georgia', fontSize: 21 }, summary: { marginTop: 12, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: '#514D48', backgroundColor: '#302E2B' }, summaryValue: { color: '#E8C77F', fontSize: 29, fontWeight: '800' }, summaryLabel: { marginTop: 2, color: '#AAA39A', fontSize: 12 }, empty: { marginTop: 14, color: '#AAA39A', fontSize: 13, lineHeight: 19 }, mark: { marginTop: 12, padding: 14, borderRadius: 14, borderLeftWidth: 5, backgroundColor: '#302E2B', flexDirection: 'row', gap: 10 }, markCopy: { flex: 1 }, reference: { color: '#E8C77F', fontSize: 10, fontWeight: '800' }, markText: { marginTop: 6, color: '#FBF9F4', fontFamily: 'Georgia', fontSize: 14, lineHeight: 21 }, remove: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#514D48' }, removeText: { color: '#FBF9F4', fontSize: 23, fontWeight: '300', lineHeight: 25 } });
