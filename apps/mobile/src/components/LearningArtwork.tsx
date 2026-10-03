import type { CardDef } from '../nfc/cards';
import { colors } from '../theme/tokens';
import { Icon } from './Icon';
import { SheetArtwork, type SheetAssetName } from './SheetArtwork';
export function LearningArtwork({card}:{card:CardDef}){if(card.category!=='topic')return <Icon name={card.icon} size={26} color={colors.primary}/>;const asset:SheetAssetName=card.icon==='sprout'?'icon-environment':card.icon==='apple'?'icon-history':card.icon==='chart-pie'?'icon-math':'icon-science';return <SheetArtwork name={asset} width={102} height={102}/>;}
