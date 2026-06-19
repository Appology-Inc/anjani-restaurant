/**
 * @file MemoizedChatBubble.tsx
 * @description A performance-optimized, memoized chat bubble component used for rendering 
 * individual chat messages between the rider and the customer.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { ChatMessage } from '../state/AppStore';

/**
 * Props for the MemoizedChatBubble component.
 */
interface ChatBubbleProps {
  /** The chat message data object. */
  item: ChatMessage;
  /** Function to format the timestamp into a readable string. */
  formatTime: (ts: number) => string;
}

/**
 * Renders a single chat message bubble.
 * Uses React.memo to prevent unnecessary re-renders when the parent list updates,
 * comparing messages by their unique ID.
 * 
 * @param props - The chat bubble properties.
 */
export const MemoizedChatBubble = React.memo(({ item, formatTime }: ChatBubbleProps) => {
  const isRider = item.senderRole === 'rider';
  return (
    <View style={[ss.msgRow, isRider ? ss.msgRowRight : ss.msgRowLeft]}>
      <View style={[ss.msgBubble, isRider ? ss.msgBubbleRiderSent : ss.msgBubbleCustomer]}>
        {/* Only show "Customer" label for incoming messages */}
        {!isRider && <Text style={ss.msgSenderLbl}>Customer</Text>}
        <Text style={[ss.msgTxt, isRider ? { color: Colors.white } : { color: Colors.text }]}>{item.text}</Text>
        <Text style={[ss.msgTime, isRider ? { color: 'rgba(255,255,255,0.65)', textAlign: 'right' } : { color: Colors.muted }]}>{formatTime(item.timestamp)}</Text>
      </View>
    </View>
  );
}, (prev, next) => prev.item.id === next.item.id);

const ss = StyleSheet.create({
  msgRow: { flexDirection: 'row', marginBottom: 8 },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '78%', padding: 10, borderRadius: 14 },
  msgBubbleRiderSent: { backgroundColor: '#FF6B00', borderBottomRightRadius: 4 },
  msgBubbleCustomer: { backgroundColor: '#2A1F12', borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)', borderBottomLeftRadius: 4 },
  msgSenderLbl: { fontSize: 9, color: '#9A8A72', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
  msgTxt: { fontSize: 13, lineHeight: 18 },
  msgTime: { fontSize: 9, marginTop: 3 },
});
