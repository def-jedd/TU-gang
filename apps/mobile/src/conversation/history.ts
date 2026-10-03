import type { ExplainRequest, ExplainResponse, ConversationMessage } from '../types/tutor';
export type ConversationTurn = { id: string; request: ExplainRequest; response: ExplainResponse };
export const MAX_SAVED_TURNS = 50;
export function appendTurn(turns: ConversationTurn[], request: ExplainRequest, response: ExplainResponse): ConversationTurn[] {
 const {history: _history, ...plainRequest}=request;
 return [...turns,{id:response.request_id,request:plainRequest,response}].slice(-MAX_SAVED_TURNS);
}
/** Six recent exchanges, bounded independently of the visible saved transcript. */
export function contextMessages(turns: ConversationTurn[]): ConversationMessage[] {
 return turns.slice(-6).flatMap(turn=>[
  {role:'user' as const,content:turn.request.question.slice(0,4000)},
  {role:'assistant' as const,content:[turn.response.explanation,turn.response.example,...turn.response.key_points].filter(Boolean).join('\n').slice(0,4000)},
 ]);
}
export function parseSavedConversation(raw: string | null): ConversationTurn[] {
 try { const data=JSON.parse(raw ?? '[]'); if(!Array.isArray(data))return [];
 return data.filter((turn):turn is ConversationTurn => !!turn && typeof turn.id==='string' && typeof turn.request?.question==='string' && ['bikol_daet','tagalog','english'].includes(turn.request.language) && ['very_simple','simple','normal'].includes(turn.request.difficulty) && ['teacher','friend','ate_kuya'].includes(turn.request.style) && ['explain','explain_differently'].includes(turn.request.action) && typeof turn.response?.explanation==='string' && typeof turn.response?.example==='string' && Array.isArray(turn.response?.key_points) && turn.response.key_points.every((p:unknown)=>typeof p==='string') && Array.isArray(turn.response?.source_ids) && typeof turn.response?.request_id==='string').slice(-MAX_SAVED_TURNS);
 } catch { return []; }
}
