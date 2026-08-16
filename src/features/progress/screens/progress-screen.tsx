import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReadingProgress } from '@/features/library/providers/reading-progress-provider';

const green = '#C79832';
export default function ProgressScreen() {
  const { totals } = useReadingProgress();
  const percentage = totals.chapters ? Math.round(totals.completed * 100 / totals.chapters) : 0;
  return <View style={s.screen}><StatusBar style="light" /><SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.content}>
    <Text style={s.kicker}>GRANDBOOK</Text><Text style={s.title}>Overview</Text><Text style={s.subtitle}>Your reading progress, live from the library.</Text>
    <Card title="Chapters completed"><Text style={s.metric}>{totals.completed}<Text style={s.dim}> / {totals.chapters}</Text></Text><Text style={s.green}>+{totals.chapters ? (100 / totals.chapters).toFixed(2) : 0}% per chapter</Text><Bars value={percentage} /></Card>
    <Card title="Reading progress"><Text style={s.metric}>{percentage}%</Text><Text style={s.dim}>of your complete library</Text><View style={s.track}><View style={[s.fill,{width:`${percentage}%`}]} /></View></Card>
    <Card title="Total sentences"><Text style={s.metric}>{totals.sentences}</Text><Text style={s.dim}>verses ready to read</Text><Bars value={54} /></Card>
    <Card title="Marked sentences"><Text style={s.metric}>{totals.highlighted}</Text><Text style={s.dim}>your saved colour highlights</Text><View style={s.pink} /></Card>
    <View style={s.insight}><Text style={s.insightKicker}>INSIGHT</Text><Text style={s.insightMetric}>{percentage}%</Text><Text style={s.insightCopy}>Every chapter you mark as read updates this overview immediately.</Text></View>
  </ScrollView></SafeAreaView></View>;
}
function Card({title,children}:{title:string;children:React.ReactNode}) { return <View style={s.card}><Text style={s.cardTitle}>{title}</Text>{children}</View>; }
function Bars({value}:{value:number}) { return <View style={s.bars}>{[30,56,43,77,62,91,65,50,79,38,60,45].map((height,index)=><View key={index} style={[s.bar,{height:`${height}%`,backgroundColor:index*9<value?green:'#303840'}]} />)}</View>; }
const s=StyleSheet.create({screen:{flex:1,backgroundColor:'#242221'},safe:{flex:1},content:{padding:20,paddingBottom:42,gap:12},kicker:{color:'#D7A94B',fontSize:10,fontWeight:'800',letterSpacing:2},title:{color:'#FBF9F4',fontSize:39,fontFamily:'Georgia',marginTop:-5},subtitle:{color:'#AAA39A',fontSize:14,marginBottom:10},card:{minHeight:158,borderColor:'#514D48',borderWidth:1,borderRadius:18,padding:17,backgroundColor:'#302E2B',overflow:'hidden'},cardTitle:{color:'#FBF9F4',fontSize:15,fontWeight:'700'},metric:{color:'#FBF9F4',fontFamily:'Georgia',fontSize:36,fontWeight:'700',marginTop:20},dim:{color:'#AAA39A',fontSize:12},green:{color:'#E8C77F',fontSize:12,fontWeight:'700',marginTop:5},track:{height:9,marginTop:18,borderRadius:8,backgroundColor:'#514D48',overflow:'hidden'},fill:{height:'100%',borderRadius:8,backgroundColor:green},bars:{height:43,marginTop:15,flexDirection:'row',gap:4,alignItems:'flex-end'},bar:{flex:1,borderRadius:3},pink:{width:58,height:9,borderRadius:7,backgroundColor:'#E8C77F',marginTop:21},insight:{borderRadius:18,padding:22,minHeight:185,backgroundColor:'#F1E6CF'},insightKicker:{fontWeight:'800',fontSize:10,letterSpacing:1.5,color:'#9A701D'},insightMetric:{fontFamily:'Georgia',fontSize:55,fontWeight:'800',color:'#292827',marginTop:15},insightCopy:{color:'#55504A',fontSize:14,lineHeight:20,maxWidth:'80%'}});
