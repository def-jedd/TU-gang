import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius as radii, shadow } from '../theme/tokens';
type Props=ViewProps & {children?:ReactNode;intensity?:'subtle'|'regular'|'strong';tint?:string;radius?:number;selected?:boolean;pressable?:boolean};
/** Presentation only: opaque sculpted surfaces, one elevation and light direction. */
export function ClaySurface({children,intensity='regular',radius=radii.md,selected=false,pressable=false,tint,style,...props}:Props){
 const [scale]=useState(()=>new Animated.Value(1));
 useEffect(()=>{let cancelled=false;AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{if(cancelled)return;if(reduced)scale.setValue(1);else Animated.spring(scale,{toValue:selected?1.015:1,damping:24,stiffness:200,useNativeDriver:true}).start();});return()=>{cancelled=true;scale.stopAnimation();}},[selected,scale]);
 const tones:Record<string,readonly [string,string]>={mint:['#E5FFF0','#C5EEDC'],peach:['#FFF0DD','#FFD7BD'],lavender:['#F1E9FF','#DCD0F7'],blue:['#DFF3FF','#BDE3FA']};
 const fill=selected?['#C6E7FF','#A7D2F7'] as const:tint&&tones[tint]?tones[tint]:intensity==='subtle'?['#FFFFFF','#EEF5FD'] as const:['#FFFFFF','#F8FBFF'] as const;
 return <Animated.View {...props} style={[styles.shell,{borderRadius:radius,transform:[{scale}]},pressable&&{minHeight:48},style]}>
  <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill,{borderRadius:radius,overflow:'hidden'}]}>
   <LinearGradient colors={fill} start={{x:0,y:0}} end={{x:0.65,y:1}} style={StyleSheet.absoluteFill}/>
   <View style={[StyleSheet.absoluteFill,{borderRadius:radius,borderWidth:2,borderTopColor:'#FFFFFF',borderLeftColor:'#FFFFFF',borderRightColor:selected?'#88B9DF':'#E3EDF8',borderBottomColor:selected?'#88B9DF':'#DCE8F5'}]}/>
   <View style={{position:'absolute',left:14,right:14,top:3,height:2,borderRadius:2,backgroundColor:'rgba(255,255,255,.9)'}}/>
  </View>{children}
 </Animated.View>;
}
const styles=StyleSheet.create({shell:{...shadow.card,backgroundColor:colors.surface}});
