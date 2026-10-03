import { SheetArtwork, type SheetAssetName } from './SheetArtwork';
import Feather from '@expo/vector-icons/Feather';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type Props={name:IconName;size:number;color:string};
const names:Record<string,ComponentProps<typeof Feather>['name']>={
 'phone':'phone','phone-hangup':'phone-off','volume-high':'volume-2','volume-off':'volume-x','microphone':'mic','microphone-off':'mic-off',
 'keyboard-outline':'edit-3','nfc-variant':'radio','translate':'globe','gesture-tap':'mouse-pointer','account-voice':'users','stairs':'bar-chart-2',
 'account-question':'user','account-switch':'users','account-group':'users','arrow-left':'arrow-left','arrow-right':'arrow-right','arrow-up-bold':'arrow-up',
 'chevron-down':'chevron-down','chevron-right':'chevron-right','close':'x','close-circle':'x-circle','check-circle':'check-circle','check':'check','star-circle':'star',
 'map-marker-radius':'map-pin','map-marker':'map-pin','flag':'flag','earth':'globe','chart-bar':'bar-chart-2','signal-cellular-1':'bar-chart-2','signal-cellular-2':'bar-chart-2','signal-cellular-3':'bar-chart-2',
 'human-male-board':'book-open','human-male-board-poll':'book-open','hand-wave':'smile','account-heart':'heart','chat-question':'message-circle',
 'lightbulb-on':'zap','lightbulb-outline':'zap','lightbulb-on-outline':'zap','turtle':'feather','replay':'rotate-ccw','swap-horizontal':'repeat',
 'shape':'image','image-multiple':'image','image':'image','information-outline':'info','alert-circle-outline':'alert-circle','alert':'alert-triangle',
 'cog':'settings','cog-outline':'settings','book-open-variant':'book-open','content-copy':'copy','content-save':'save','account-plus':'user-plus',
 'cat':'github','dog':'github','rabbit':'feather','owl':'eye','panda':'smile','bear':'smile','fox':'smile','rocket-launch':'send',
 'sprout':'feather','apple':'globe','chart-pie':'pie-chart','snowflake-melt':'droplet','slope-downhill':'trending-down','flask':'compass','closed-caption':'type',
 'format-size':'type','format-font-size-increase':'plus','format-font-size-decrease':'minus','refresh':'refresh-cw','restore':'rotate-ccw','tortoise':'feather','waveform':'activity','closed-caption-outline':'type','stop':'square','tune-variant':'sliders','circle':'circle','bookmark-outline':'bookmark'
};
const artwork:Partial<Record<IconName,SheetAssetName>>={'cards':'icon-environment','sprout':'icon-environment','apple':'icon-history','chart-pie':'icon-math','chat-question':'icon-language','lightbulb-on':'lightbulb','lightbulb-outline':'lightbulb','account-heart':'icon-life-skills','earth':'icon-history','flag':'flag-filipino','map-marker-radius':'flag-bikol','map-marker':'flag-bikol','flag-variant':'flag-filipino','shape':'icon-general','cog':'utility-settings','cog-outline':'utility-settings','book-open-variant':'icon-general','account-question':'nav-profile','account-switch':'nav-profile','keyboard-outline':'icon-technology','nfc-variant':'icon-language','tune-variant':'nav-progress','star-circle':'icon-star','chat-plus':'icon-language','lightbulb-on-outline':'lightbulb'};
export function Icon({name,size,color}:Props){
 const asset=artwork[name];if(asset)return <SheetArtwork name={asset} width={size} height={size}/>;
 if(name==='cards')return <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}><Defs><LinearGradient id="leafA" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#EFFFFF"/><Stop offset="1" stopColor="#4DDEEB"/></LinearGradient><LinearGradient id="leafB" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#EEE4FF"/><Stop offset="1" stopColor="#9376F5"/></LinearGradient></Defs><Path d="M24 43Q5 33 8 14Q22 13 27 28Z" fill="url(#leafA)" stroke="#EEFFFF"/><Path d="M24 43Q15 25 26 5Q42 21 24 43" fill="url(#leafA)" stroke="#EEFFFF"/><Path d="M24 43Q24 21 43 17Q45 37 24 43" fill="url(#leafB)" stroke="#EEFFFF"/></Svg>;
 return <Feather name={names[name]??'circle'} size={size} color={color} accessibilityElementsHidden importantForAccessibility="no"/>;
}
export const iconFont=Feather.font;
