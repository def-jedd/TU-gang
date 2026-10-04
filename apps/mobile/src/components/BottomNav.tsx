import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTutor } from '../hooks/useTutor';
import { AppText } from './AppText';
import { ClaySurface } from './ClaySurface';
import { SheetArtwork, type SheetAssetName } from './SheetArtwork';
import { colors } from '../theme/tokens';
export function BottomNav(){
 const pathname=usePathname(); const {t}=useTutor();
 if(!['/','/lessons','/ask','/cards','/profiles'].includes(pathname))return null;
 const items:[string,string,SheetAssetName][]=[['/','TU-gang','nav-home'],['/lessons',t.lessonsTitle,'nav-progress'],['/ask',t.typeInstead,'nav-chat'],['/cards',t.cardsTitle,'nav-book'],['/profiles',t.profilesTitle,'nav-profile']];
 return <SafeAreaView edges={['bottom']} style={styles.safe}><ClaySurface tint="blue" radius={28} style={styles.bar}>{items.map(([path,label,asset])=><Pressable key={path} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:pathname===path}} onPress={()=>{if(pathname!==path)router.navigate(path as '/'|'/lessons'|'/ask'|'/cards'|'/profiles');}} style={({pressed})=>[styles.item,pathname===path&&styles.active,pressed&&{opacity:.7}]}><SheetArtwork name={asset} width={28}/><AppText variant="caption" style={styles.label}>{label}</AppText></Pressable>)}</ClaySurface></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{alignItems:'center',backgroundColor:'#E4F8EE'},bar:{width:'100%',maxWidth:480,flexDirection:'row',padding:8,gap:4},item:{flex:1,minHeight:64,alignItems:'center',justifyContent:'center',gap:3,padding:4,borderRadius:20},active:{backgroundColor:'#FFF4D6',borderWidth:1,borderColor:'#FFFFFF'},label:{textAlign:'center',color:colors.ink,fontWeight:'700'}});

