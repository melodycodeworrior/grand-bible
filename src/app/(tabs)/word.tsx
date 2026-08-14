import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GrandbookTheme } from '@/constants/grandbook-theme';
import { useAuth } from '@/context/auth';
import { saveSpiritualEntities } from '@/services/app-data';
import { ensureGrandSearchSeeded, saveGrandSearchEntry } from '@/services/grand-search';

type GradientColors = readonly [string, string, ...string[]];
type Entity = { name: string; type: string; tradition: string; description: string };
type Category = { category: string; description: string; entities: Entity[] };
type Sentence = { sentence_no: number; sentense_detail: string };
type Chapter = { chapter_no: number; chapter_title: string; sentences: Sentence[] };
type Book = { title_guess: string | null; source_guess?: { chapters?: Chapter[] } };
type Metadata = { title?: string; compiler_reference?: string; description?: string };
type SearchResult = {
  book: string;
  chapter_no: number;
  chapter_title: string;
  sentence_no: number;
  sentense_detail: string;
};
type EditorState = { mode: 'edit' | 'add'; category: Category; entity?: Entity };
type CategoryEditorState = { category?: Category };
type SearchStore = { generated_from: string; generated_at?: string; results: Record<string, SearchResult[]> };

const data = require('../../../assets/json/spiritual_entities.json') as { metadata: Metadata; categories: Category[] };
const library = require('../../../assets/json/grand_with_chapters.json') as Book[];
const initialSearch = require('../../../assets/json/grand_search.json') as SearchStore;
const palettes: GradientColors[] = [
  ['#B78A3D', '#E5C77F'],
  ['#3D7E8D', '#76B5BE'],
  ['#855C78', '#D99BB4'],
  ['#526A99', '#8EA6E1'],
  ['#648343', '#A5CF79'],
  ['#976442', '#D3A775'],
];

function blankEntity(): Entity {
  return { name: '', type: '', tradition: '', description: '' };
}

function aliasesFor(name: string) {
  return Array.from(new Set([...name.split('/'), name].map((part) => part.replace(/\([^)]*\)/g, '').trim()).filter(Boolean)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function searchGrandbook(name: string, onProgress: (progress: number) => void) {
  const matchers = aliasesFor(name).map((alias) => new RegExp(`(^|[^A-Za-z])${escapeRegExp(alias)}([^A-Za-z]|$)`, 'i'));
  const found: SearchResult[] = [];
  const searchableBooks = library.filter((book) => book.source_guess?.chapters?.length);

  for (let bookIndex = 0; bookIndex < searchableBooks.length; bookIndex += 1) {
    const book = searchableBooks[bookIndex];
    for (const chapter of book.source_guess?.chapters ?? []) {
      for (const sentence of chapter.sentences ?? []) {
        const text = sentence.sentense_detail ?? '';
        if (matchers.some((matcher) => matcher.test(text))) {
          found.push({
            book: book.title_guess || 'Untitled book',
            chapter_no: chapter.chapter_no,
            chapter_title: chapter.chapter_title || 'Untitled chapter',
            sentence_no: sentence.sentence_no,
            sentense_detail: text,
          });
        }
      }
    }

    if (bookIndex % 4 === 0) {
      onProgress(Math.min(96, Math.round(((bookIndex + 1) / searchableBooks.length) * 100)));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress(100);
  return found;
}

async function persistSpiritualEntities(categories: Category[]) {
  await saveSpiritualEntities(categories, data.metadata);
}

export default function WordScreen() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>(data.categories);
  const [searchStore, setSearchStore] = useState<SearchStore>(initialSearch);
  const [category, setCategory] = useState<Category | null>(null);
  const [entity, setEntity] = useState<Entity | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<CategoryEditorState | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const categoryIndex = category ? categories.findIndex((item) => item.category === category.category) : 0;
  const sheetColors = palettes[Math.max(categoryIndex, 0) % palettes.length];

  async function syncGrandSearchToFirebase() {
    if (!user) {
      setCloudError(true);
      setCloudMessage('Sign in first to save Discover data to Firebase.');
      return;
    }
    setSyncingCloud(true);
    setCloudError(false);
    setCloudMessage('Saving Discover data to Firebase…');
    try {
      const seed = await ensureGrandSearchSeeded();
      setCloudMessage(seed.seeded ? `Firestore saved all ${seed.termCount} Discover terms.` : 'Firestore Discover data is already saved.');
    } catch (error) {
      // Do not use console.warn here: Expo Go displays warnings as a blocking overlay.
      console.log('Discover Firestore save failed:', error);
      setCloudError(true);
      const code = (error as { code?: string }).code ?? 'unknown-error';
      const detail = error instanceof Error ? error.message : String(error);
      setCloudMessage(`Firestore save failed (${code}): ${detail}`);
    } finally {
      setSyncingCloud(false);
    }
  }

  function syncCategory(nextCategory: Category) {
    setCategory(nextCategory);
    setCategories((current) => current.map((item) => (item.category === nextCategory.category ? nextCategory : item)));
  }

  async function saveCategory(nextCategory: Category) {
    if (!user) {
      setCloudError(true);
      setCloudMessage('Sign in first to save Discover data to Firestore.');
      return;
    }
    const categoriesToSave = categoryEditor?.category
      ? categories.map((item) => (item.category === categoryEditor.category?.category ? nextCategory : item))
      : [...categories, nextCategory];

    await persistSpiritualEntities(categoriesToSave);
    setCategories(categoriesToSave);
    setCategory(nextCategory);
    setCategoryEditor(null);
  }

  function openAdd() {
    if (category) setEditor({ mode: 'add', category });
  }

  function openEdit(item: Entity) {
    if (category) setEditor({ mode: 'edit', category, entity: item });
  }

  async function saveEditor(originalName: string | null, nextEntity: Entity) {
    if (!category) return;
    if (!user) {
      setCloudError(true);
      setCloudMessage('Sign in first to save Discover data to Firestore.');
      return;
    }
    setProcessing(true);
    setProgress(0);

    try {
      const results = await searchGrandbook(nextEntity.name, setProgress);
      const nextCategory: Category = {
        ...category,
        entities: originalName
          ? category.entities.map((item) => (item.name === originalName ? nextEntity : item))
          : [...category.entities, nextEntity],
      };
      const nextResults = { ...searchStore.results, [nextEntity.name]: results };
      if (originalName && originalName !== nextEntity.name) delete nextResults[originalName];

      // Expo native builds do not have the local /api file-writing endpoint.
      // Persist generated Discover results directly to Firestore instead.
      await saveGrandSearchEntry(nextEntity.name, results);
      await persistSpiritualEntities(categories.map((item) => (item.category === category.category ? nextCategory : item)));
      setSearchStore({ generated_from: 'grand_with_chapters.json', generated_at: new Date().toISOString(), results: nextResults });
      syncCategory(nextCategory);
      setEntity(nextEntity);
      setProgress(100);
      setTimeout(() => {
        setProcessing(false);
        setEditor(null);
      }, 260);
    } catch {
      setProcessing(false);
    }
  }

  return (
    <View style={s.screen}>
      <StatusBar style="light" />
      <SafeAreaView style={s.safe}>
        <FlatList
          data={categories}
          numColumns={2}
          keyExtractor={(item) => item.category}
          contentContainerStyle={s.list}
          ListHeaderComponent={
            <View>
              <Text style={s.kicker}>GRANDBOOK</Text>
              <View style={s.mainTop}>
                <Text style={s.title}>Category</Text>
                <View style={s.headerActions}><Pressable onPress={() => void syncGrandSearchToFirebase()} disabled={syncingCloud} style={s.syncButton}><Text style={s.syncText}>{syncingCloud ? '…' : 'Sync'}</Text></Pressable><Pressable onPress={() => setCategoryEditor({})} style={({ hovered, pressed }) => [s.mainAddButton, (hovered || pressed) && s.mainAddButtonActive]}><Text style={s.mainAddText}>+</Text></Pressable></View>
              </View>
            </View>
          }
          renderItem={({ item, index }) => (
            <Pressable onPress={() => setCategory(item)} style={s.tile}>
              <LinearGradient colors={palettes[index % palettes.length]} style={s.tileFill}>
                <Text style={s.tileTitle}>{item.category}</Text>
              </LinearGradient>
            </Pressable>
          )}
        />
      </SafeAreaView>
      {cloudMessage && <View pointerEvents="none" style={[s.firebaseToast, cloudError && s.firebaseToastError]}><Text style={s.firebaseToastText}>{cloudMessage}</Text></View>}

      <Modal transparent animationType="slide" visible={!!category && !entity && !editor && !categoryEditor} onRequestClose={() => setCategory(null)}>
        <View style={s.modal}>
          <Pressable style={s.shade} onPress={() => setCategory(null)} />
          {category && <EntitySheet category={category} colors={sheetColors} onAdd={openAdd} onEdit={openEdit} onSelect={setEntity} />}
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={!!categoryEditor} onRequestClose={() => setCategoryEditor(null)}>
        <View style={s.modal}>
          <Pressable style={s.shade} onPress={() => setCategoryEditor(null)} />
          {categoryEditor && (
            <CategoryEditor
              editor={categoryEditor}
              colors={palettes[categories.length % palettes.length]}
              onCancel={() => setCategoryEditor(null)}
              onSave={saveCategory}
            />
          )}
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={!!editor} onRequestClose={() => !processing && setEditor(null)}>
        <View style={s.modal}>
          <Pressable style={s.shade} onPress={() => !processing && setEditor(null)} />
          {editor && (
            <EntityEditor
              editor={editor}
              colors={sheetColors}
              processing={processing}
              progress={progress}
              onCancel={() => setEditor(null)}
              onSave={saveEditor}
            />
          )}
        </View>
      </Modal>

      <Modal animationType="slide" visible={!!entity} onRequestClose={() => setEntity(null)}>
        {entity && <EntityDetail entity={entity} results={searchStore.results[entity.name] ?? []} onBack={() => setEntity(null)} />}
      </Modal>
    </View>
  );
}

function EntitySheet({
  category,
  colors,
  onAdd,
  onEdit,
  onSelect,
}: {
  category: Category;
  colors: GradientColors;
  onAdd: () => void;
  onEdit: (entity: Entity) => void;
  onSelect: (entity: Entity) => void;
}) {
  return (
    <LinearGradient colors={colors} style={s.sheet}>
      <View style={s.handle} />
      <View style={s.sheetTop}>
        <View style={s.sheetCopy}>
          <Text style={s.sheetKicker}>CATEGORY</Text>
          <Text style={s.sheetTitle}>{category.category}</Text>
        </View>
        <Pressable onPress={onAdd} style={({ hovered, pressed }) => [s.addButton, (hovered || pressed) && s.iconButtonActive]}>
          <Text style={s.addText}>+</Text>
        </Pressable>
      </View>
      <FlatList
        data={category.entities}
        keyExtractor={(item) => item.name}
        contentContainerStyle={s.entityList}
        renderItem={({ item }) => (
          <Pressable onPress={() => onSelect(item)} style={s.entityRow}>
            <View style={s.entityText}>
              <Text style={s.entityName}>{item.name}</Text>
              <Text style={s.entityType}>{item.type}</Text>
            </View>
            <Pressable onPress={() => onEdit(item)} style={({ hovered, pressed }) => [s.editButton, (hovered || pressed) && s.iconButtonActive]}>
              <View style={s.pencilIcon}>
                <View style={s.pencilLead} />
              </View>
            </Pressable>
          </Pressable>
        )}
      />
    </LinearGradient>
  );
}

function EntityEditor({
  editor,
  colors,
  processing,
  progress,
  onCancel,
  onSave,
}: {
  editor: EditorState;
  colors: GradientColors;
  processing: boolean;
  progress: number;
  onCancel: () => void;
  onSave: (originalName: string | null, entity: Entity) => void;
}) {
  const originalName = editor.entity?.name ?? null;
  const [name, setName] = useState(editor.entity?.name ?? '');
  const [type, setType] = useState(editor.entity?.type ?? '');
  const canSave = name.trim().length > 0 && type.trim().length > 0 && !processing;

  return (
    <LinearGradient colors={colors} style={s.editorSheet}>
      <View style={s.handle} />
      <Text style={s.sheetKicker}>{editor.mode === 'edit' ? 'EDIT ENTITY' : 'NEW ENTITY'}</Text>
      <Text style={s.sheetTitle}>{editor.category.category}</Text>
      <TextInput editable={!processing} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor="rgba(255,255,255,.62)" style={s.input} />
      <TextInput editable={!processing} value={type} onChangeText={setType} placeholder="Sub title" placeholderTextColor="rgba(255,255,255,.62)" style={s.input} />
      {processing ? <SearchSkeleton progress={progress} /> : null}
      <View style={s.editorActions}>
        <Pressable disabled={processing} onPress={onCancel} style={s.cancelButton}>
          <Text style={s.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          disabled={!canSave}
          onPress={() => onSave(originalName, { ...(editor.entity ?? blankEntity()), name: name.trim(), type: type.trim() })}
          style={[s.updateButton, !canSave && s.disabledButton]}
        >
          <Text style={s.updateText}>{editor.mode === 'edit' ? 'Update' : 'Save'}</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function CategoryEditor({
  editor,
  colors,
  onCancel,
  onSave,
}: {
  editor: CategoryEditorState;
  colors: GradientColors;
  onCancel: () => void;
  onSave: (category: Category) => void;
}) {
  const [name, setName] = useState(editor.category?.category ?? '');
  const [description, setDescription] = useState(editor.category?.description ?? '');
  const canSave = name.trim().length > 0;

  return (
    <LinearGradient colors={colors} style={s.editorSheet}>
      <View style={s.handle} />
      <Text style={s.sheetKicker}>NEW CATEGORY</Text>
      <Text style={s.sheetTitle}>Category</Text>
      <TextInput editable value={name} onChangeText={setName} placeholder="Category name" placeholderTextColor="rgba(255,255,255,.62)" style={s.input} />
      <TextInput
        editable
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
        placeholderTextColor="rgba(255,255,255,.62)"
        style={[s.input, s.descriptionInput]}
        multiline
      />
      <View style={s.editorActions}>
        <Pressable onPress={onCancel} style={s.cancelButton}>
          <Text style={s.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          disabled={!canSave}
          onPress={() => onSave({ category: name.trim(), description: description.trim(), entities: editor.category?.entities ?? [] })}
          style={[s.updateButton, !canSave && s.disabledButton]}
        >
          <Text style={s.updateText}>Save</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function SearchSkeleton({ progress }: { progress: number }) {
  const [bright, setBright] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setBright((value) => !value), 520);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={s.skeletonWrap}>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={s.progressText}>Loaded {Math.round(progress)}%</Text>
      {[1, 2, 3].map((item) => (
        <View key={item} style={[s.skeletonLine, { opacity: bright ? 0.9 : 0.35, width: `${88 - item * 10}%` }]} />
      ))}
    </View>
  );
}

function EntityDetail({ entity, results, onBack }: { entity: Entity; results: SearchResult[]; onBack: () => void }) {
  const visibleResults = useMemo(() => results, [results]);

  return (
    <View style={s.detailScreen}>
      <StatusBar style="light" />
      <SafeAreaView style={s.safe}>
        <View style={s.detailTop}>
          <Pressable onPress={onBack} style={s.backButton}>
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <Text numberOfLines={1} style={s.selectedName}>{entity.name}</Text>
        </View>
        <FlatList
          data={visibleResults}
          keyExtractor={(item, index) => `${item.book}-${item.chapter_no}-${item.sentence_no}-${index}`}
          contentContainerStyle={s.results}
          ListHeaderComponent={
            <>
              <Text style={s.detailKicker}>SELECTED NAME</Text>
              <Text style={s.detailTitle}>{entity.name}</Text>
              <Text style={s.detailType}>{entity.type}</Text>
              <Text style={s.resultCount}>{visibleResults.length} relevant sentences</Text>
            </>
          }
          ListEmptyComponent={<Text style={s.empty}>No matching sentences were found in Grandbook for this entity.</Text>}
          renderItem={({ item }) => (
            <View style={s.resultCard}>
              <Text style={s.reference}>
                {item.book} · {item.chapter_title} {item.chapter_no}:{item.sentence_no}
              </Text>
              <Text style={s.resultText}>{item.sentense_detail}</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const c = GrandbookTheme.colors;
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.night },
  safe: { flex: 1 },
  list: { padding: 20, paddingBottom: 35 },
  kicker: { color: c.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginTop: 8 },
  mainTop: { marginTop: 8, marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  syncButton: { minWidth: 54, height: 34, paddingHorizontal: 11, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8C77F' },
  syncText: { color: '#E8C77F', fontSize: 12, fontWeight: '800' },
  title: { color: c.paper, fontFamily: 'Georgia', fontSize: 39 },
  mainAddButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.gold,
    borderWidth: 1,
    borderColor: '#E8C77F',
  },
  mainAddButtonActive: { transform: [{ scale: 1.06 }], backgroundColor: '#D7A94B' },
  mainAddText: { color: '#fff', fontSize: 30, lineHeight: 32, fontWeight: '600' },
  firebaseToast: { position: 'absolute', left: 20, right: 20, bottom: 22, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12, backgroundColor: '#245D35', zIndex: 20, elevation: 9 },
  firebaseToastError: { backgroundColor: '#A32D2D' },
  firebaseToastText: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  tile: { flex: 1, height: 150, margin: 5, borderRadius: 17, overflow: 'hidden' },
  tileFill: { flex: 1, padding: 17, justifyContent: 'flex-end' },
  tileTitle: { color: '#fff', fontFamily: 'Georgia', fontSize: 20, lineHeight: 24 },
  modal: { flex: 1, justifyContent: 'flex-end' },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,.55)' },
  sheet: { height: '78%', paddingTop: 12, paddingHorizontal: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  editorSheet: { minHeight: 430, paddingTop: 12, paddingHorizontal: 20, paddingBottom: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  handle: { width: 42, height: 4, alignSelf: 'center', borderRadius: 3, backgroundColor: 'rgba(255,255,255,.7)' },
  sheetTop: { marginTop: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  sheetCopy: { flex: 1 },
  sheetKicker: { color: 'rgba(255,255,255,.8)', fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginTop: 20 },
  sheetTitle: { marginTop: 6, color: '#fff', fontFamily: 'Georgia', fontSize: 27, lineHeight: 33 },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.36)',
  },
  addText: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '500' },
  entityList: { paddingTop: 12, paddingBottom: 30 },
  entityRow: {
    minHeight: 66,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.25)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  entityText: { flex: 1 },
  entityName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  entityType: { color: 'rgba(255,255,255,.78)', fontSize: 11, marginTop: 4 },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.34)',
  },
  iconButtonActive: { backgroundColor: 'rgba(255,255,255,.34)', transform: [{ scale: 1.05 }] },
  pencilIcon: { width: 16, height: 5, borderRadius: 3, backgroundColor: '#fff', transform: [{ rotate: '-35deg' }] },
  pencilLead: {
    position: 'absolute',
    right: -4,
    top: 0,
    width: 0,
    height: 0,
    borderTopWidth: 2.5,
    borderBottomWidth: 2.5,
    borderLeftWidth: 5,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
  },
  input: {
    height: 50,
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.35)',
    backgroundColor: 'rgba(255,255,255,.15)',
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  descriptionInput: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
  editorActions: { marginTop: 18, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelButton: { height: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.16)' },
  cancelText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  updateButton: { height: 44, paddingHorizontal: 22, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.night },
  disabledButton: { opacity: 0.42 },
  updateText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  skeletonWrap: { marginTop: 18, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.16)' },
  progressTrack: { height: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,.2)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 8, backgroundColor: '#fff' },
  progressText: { marginTop: 8, color: '#fff', fontSize: 11, fontWeight: '800' },
  skeletonLine: { height: 13, marginTop: 12, borderRadius: 7, backgroundColor: 'rgba(255,255,255,.8)' },
  detailScreen: { flex: 1, backgroundColor: c.night },
  detailTop: { paddingHorizontal: 20, paddingTop: 8, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 15, backgroundColor: c.gold },
  backText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  selectedName: { flex: 1, color: c.paper, fontSize: 13, fontWeight: '700' },
  detailKicker: { color: '#D7A94B', fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  results: { padding: 20, paddingBottom: 40 },
  detailTitle: { color: c.paper, fontFamily: 'Georgia', fontSize: 34, marginTop: 8 },
  detailType: { color: '#D7A94B', fontSize: 13, fontWeight: '700', marginTop: 6 },
  resultCount: { color: '#BEB6A8', fontSize: 12, marginTop: 20, marginBottom: 10 },
  resultCard: { padding: 16, marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: '#514D48', backgroundColor: c.nav },
  reference: { color: '#E8C77F', fontSize: 10, fontWeight: '700' },
  resultText: { color: c.paper, fontFamily: 'Georgia', fontSize: 15, lineHeight: 23, marginTop: 9 },
  empty: { color: '#BEB6A8', fontSize: 14, lineHeight: 21, marginTop: 20 },
});
