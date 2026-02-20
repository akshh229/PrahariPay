// Gossip Service
// P2P transaction propagation via backend gossip endpoint

import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS } from './apiConfig';
import { generateUUID } from '../utils/uuid';

const gossipClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT_MS,
});

export const broadcastTransaction = async (tx) => {
    try {
        const payload = {
            message_id: generateUUID(),
            transaction_id: tx.transaction_id,
            source_peer_id: tx.sender_id,
            payload: {
                amount: tx.amount,
                receiver_id: tx.receiver_id,
                timestamp: tx.timestamp,
            },
            hops: 1,
        };
        const response = await gossipClient.post('/gossip', payload);
        return response.data;
    } catch (error) {
        console.warn('Gossip broadcast failed (best-effort):', error?.message);
        return { propagated_to_peers: 0 };
    }
};
