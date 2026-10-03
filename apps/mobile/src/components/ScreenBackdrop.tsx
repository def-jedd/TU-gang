import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../theme/tokens';
import type { TeachingStyle } from '../types/tutor';
/** Quiet clay playground backdrop, with no blur or compositing cost. */
export function ScreenBackdrop({children,persona:_persona}:{children:ReactNode;persona?:TeachingStyle}){
 return <View style={styles.root}><LinearGradient colors={['#D9EBFF','#EDE7FC','#E4F8EE']} style={StyleSheet.absoluteFill}/><View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{overflow:'hidden'}]}><Svg width="100%" height="100%" viewBox="0 0 400 850" preserveAspectRatio="xMidYMin slice"><G fill="#FFFFFF" opacity=".82"><Circle cx="365" cy="80" r="30"/><Circle cx="330" cy="93" r="23"/><Circle cx="392" cy="95" r="23"/><Circle cx="-5" cy="400" r="29"/><Circle cx="24" cy="417" r="24"/></G><Circle cx="377" cy="560" r="65" fill="#D3E7FB" opacity=".45"/></Svg></View><View style={{ flex: 1, width: '100%', maxWidth: 480 }}>{children}</View></View>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:colors.bg,alignItems:'center'}});
