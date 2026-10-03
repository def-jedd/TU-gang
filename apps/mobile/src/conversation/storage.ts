import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { parseSavedConversation, type ConversationTurn } from './history';
const keyFor=(student:string)=>'tugang-conversation-'+encodeURIComponent(student);
export async function loadConversation(student:string):Promise<ConversationTurn[]> {
 try { if(Platform.OS==='web')return parseSavedConversation(globalThis.localStorage.getItem(keyFor(student)));
 const file=new File(Paths.document,keyFor(student)+'.json'); return file.exists?parseSavedConversation(await file.text()):[];
 } catch {return [];}
}
export function saveConversation(student:string,turns:ConversationTurn[]) {
 try {const raw=JSON.stringify(turns);if(Platform.OS==='web'){globalThis.localStorage.setItem(keyFor(student),raw);return;}
 const file=new File(Paths.document,keyFor(student)+'.json');if(!file.exists)file.create();file.write(raw);
 } catch {console.warn('[conversation] History is available for this session but could not be saved.');}
}
