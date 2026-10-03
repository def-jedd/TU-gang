import { Image, View } from 'react-native';
import type { TeachingStyle } from '../types/tutor';
/** Presentation artwork drawn from the supplied clay asset sheet. */
export function PersonaPortrait({persona,size=96}:{persona:TeachingStyle;size?:number}){const asset=persona==='friend'?require('../../assets/clay-boy.png'):require('../../assets/clay-girl.png');return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={{width:size,height:size,zIndex:1}}><Image source={asset} resizeMode="contain" style={{width:'100%',height:'100%'}}/></View>;}
