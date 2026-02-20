export const API_URL = 'http://localhost:8000/api/v1';

let refreshPromise: Promise<string | null> | null = null;

const buildHeaders = (opts: RequestInit, token?: string | null): Record<string, string> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((opts.headers as Record<string, string>) || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
};

const shouldSkipRefresh = (url: string): boolean => {
    return url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');
};

const clearSession = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
};

const refreshAccessToken = async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return null;

        try {
            const res = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (!res.ok) {
                clearSession();
                return null;
            }

            const data = (await res.json()) as TokenResponse;
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('username', data.username);
            return data.access_token;
        } catch {
            clearSession();
            return null;
        }
    })();

    const token = await refreshPromise;
    refreshPromise = null;
    return token;
};

// ── Authenticated Fetch Helper ──
export async function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const initial = await fetch(url, { ...opts, headers: buildHeaders(opts, token) });

    if (initial.status !== 401 || shouldSkipRefresh(url)) {
        return initial;
    }

    const nextToken = await refreshAccessToken();
    if (!nextToken) {
        return initial;
    }

    return fetch(url, { ...opts, headers: buildHeaders(opts, nextToken) });
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    user_id: string;
    username: string;
}

export interface UserProfile {
    id: string;
    username: string;
    public_key: string | null;
    balance: number;
    offline_credit_limit: number;
    trust_score: number;
    is_merchant: boolean;
}

export interface KeyPairResponse {
    public_key: string;
    private_key: string;
}

// ── Auth ──
export const login = async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json() as Promise<TokenResponse>;
};

export const register = async (username: string, password: string, is_merchant: boolean) => {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, is_merchant }),
    });
    if (!res.ok) throw new Error('Registration failed');
    return res.json() as Promise<TokenResponse>;
};

export const fetchProfile = async (): Promise<UserProfile | null> => {
    try {
        const res = await authFetch(`${API_URL}/auth/profile`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
};

export const generateKeys = async (): Promise<KeyPairResponse> => {
    const res = await authFetch(`${API_URL}/auth/generate-keys`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to generate keys');
    return res.json();
};

// ── Merchant ──
export interface Transaction {
    transaction_id: string;
    sender_id: string;
    merchant_id?: string;
    receiver_id?: string;
    amount: number;
    timestamp: string;
    risk_score?: number;
    classification?: string;
    risk_flags?: string[];
    synced: boolean;
    category?: string;
}

export interface LedgerResponse {
    user_id: string;
    transactions: Transaction[];
}

/** Matches backend merchant_store.get_transaction_summary() */
export interface MerchantSummary {
    merchant_id: string;
    total_transactions: number;
    total_amount: number;           // backend returns total_amount
    flagged_transactions: number;   // backend returns flagged_transactions
}

export const fetchMerchantSummary = async (merchantId: string): Promise<MerchantSummary | null> => {
    try {
        const res = await authFetch(`${API_URL}/merchant/${merchantId}/summary`);
        if (!res.ok) return null;
        return res.json();
    } catch { return null; }
};

export const fetchMerchantTransactions = async (merchantId: string): Promise<Transaction[]> => {
    try {
        const res = await authFetch(`${API_URL}/merchant/${merchantId}/transactions`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.transactions || [];
    } catch {
        return [];
    }
};

export const fetchLedger = async (userId: string): Promise<LedgerResponse | null> => {
    try {
        const res = await authFetch(`${API_URL}/ledger/${userId}`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
};

// ── Spend Analyzer ──
/** Matches backend SpendSummary / CategoryBreakdown Pydantic models */
export interface CategoryBreakdown {
    category: string;
    amount: number;       // backend field name
    percentage: number;
    budget_limit?: number | null;
}

export interface SpendSummary {
    period: string;
    total_amount: number;  // backend field name
    currency: string;
    trend_pct: number;
    trend_direction: string; // up, down, flat
    breakdown: CategoryBreakdown[];
}

export interface SpendAlert {
    id: string;
    type: string;       // ANOMALY, BUDGET, PREDICTION
    severity: string;   // low, medium, high
    message: string;
    created_at: string;
    category?: string;
}

export interface SpendAnalysisResponse {
    summary: SpendSummary;
    alerts: SpendAlert[];
}

export interface ConfidenceFactor {
    name: string;
    score: number;
    impact: string;
    description: string;
}

export interface CreditScoreForLenders {
    score: number;
    band: string;
    summary: string;
    factors: ConfidenceFactor[];
    utilization_pct: number;
    on_time_payment_ratio: number;
    income_stability_ratio: number;
    savings_buffer_ratio: number;
    txn_history_months: number;
    recommended_limit?: number | null;
    risk_level: string;
    is_insufficient_data: boolean;
}

export interface ConfidenceScoreResponse {
    user_id: string;
    lookback_months: number;
    generated_at: string;
    credit_score: CreditScoreForLenders;
}

export type LoanConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
export type LoanApplicationStatus = 'PENDING_BANK' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ApplyLoanApnaRashiRequest {
    requested_amount: number;
    requested_tenor_months: number;
    consent: boolean;
}

export interface ApplyLoanApnaRashiResponse {
    application_id: string;
    status: LoanApplicationStatus;
    confidence_score: number;
    confidence_band: LoanConfidenceBand;
    lookback_period_months: number;
}

export interface LoanApplicationListItem {
    application_id: string;
    partner: string;
    requested_amount: number;
    requested_tenor_months: number;
    confidence_score: number;
    confidence_band: LoanConfidenceBand;
    status: LoanApplicationStatus;
    created_at: string;
}

export interface LoanApplicationListResponse {
    applications: LoanApplicationListItem[];
    total: number;
}

export interface SimulateApnaRashiStatusRequest {
    application_id: string;
    status: LoanApplicationStatus;
}

export const fetchSpendAnalysis = async (userId: string): Promise<SpendAnalysisResponse | null> => {
    try {
        const res = await authFetch(`${API_URL}/spend/analyze/${userId}`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
};

export const fetchSpendSummary = async (userId: string, period: string = 'monthly'): Promise<SpendSummary | null> => {
    try {
        const res = await authFetch(`${API_URL}/spend/summary/${userId}?period=${period}`);
        if (!res.ok) return null;
        return res.json();
    } catch { return null; }
};

export const fetchConfidenceScore = async (
    userId: string,
    lookbackMonths: number = 6,
): Promise<ConfidenceScoreResponse | null> => {
    try {
        const res = await authFetch(`${API_URL}/spend/credit-score/${userId}?lookback_months=${lookbackMonths}`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
};

export const seedDemoActivityForUser = async (
    userId: string,
    count: number = 24,
): Promise<{ status: string; user_id: string; created_count: number } | null> => {
    try {
        const res = await authFetch(`${API_URL}/spend/seed-demo/${userId}?count=${count}`, {
            method: 'POST',
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
};

/** Backend returns List[SpendAlert] directly (not wrapped) */
export const fetchSpendAlerts = async (userId: string): Promise<SpendAlert[]> => {
    try {
        const res = await authFetch(`${API_URL}/spend/alerts/${userId}`);
        if (!res.ok) return [];
        return res.json();  // flat array
    } catch { return []; }
};

export const applyLoanApnaRashi = async (
    payload: ApplyLoanApnaRashiRequest,
): Promise<ApplyLoanApnaRashiResponse> => {
    let res = await authFetch(`${API_URL}/loans/apply-apnarashi`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (res.status === 404) {
        res = await authFetch(`${API_URL}/spend/loan/apply-apnarashi`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
    if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || 'Failed to send loan application');
    }
    return res.json();
};

export const fetchLoanApplications = async (): Promise<LoanApplicationListResponse | null> => {
    try {
        let res = await authFetch(`${API_URL}/loans/applications`);
        if (res.status === 404) {
            res = await authFetch(`${API_URL}/spend/loan/applications`);
        }
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
};

export const simulateApnaRashiStatusUpdate = async (
    payload: SimulateApnaRashiStatusRequest,
): Promise<ApplyLoanApnaRashiResponse> => {
    const partnerToken = process.env.NEXT_PUBLIC_APNA_RASHI_PARTNER_TOKEN || 'apna-rashi-dev-token';
    let res = await fetch(`${API_URL}/loans/apnarashi-callback`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-partner-token': partnerToken,
        },
        body: JSON.stringify(payload),
    });
    if (res.status === 404) {
        res = await fetch(`${API_URL}/spend/loan/apnarashi-callback`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-partner-token': partnerToken,
            },
            body: JSON.stringify(payload),
        });
    }
    if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || 'Failed to simulate status update');
    }
    return res.json();
};

// ── AI Insights ──
export type AIInsightType = 'anomaly' | 'budget' | 'prediction' | 'positive' | 'recurring' | 'savings' | 'category_shift' | 'trend';
export type AIInsightSeverity = 'low' | 'medium' | 'high' | 'info';

export interface AIInsight {
    id: string;
    type: AIInsightType;
    severity: AIInsightSeverity;
    title: string;
    message: string;
    icon: string;
    category?: string | null;
    amount?: number | null;
    pct_change?: number | null;
    actionable: boolean;
    created_at: string;
}

export interface AIInsightsResponse {
    user_id: string;
    generated_at: string;
    insights: AIInsight[];
    total: number;
}

export const fetchAIInsights = async (
    userId: string,
    period: string = 'monthly',
): Promise<AIInsightsResponse | null> => {
    try {
        const res = await authFetch(`${API_URL}/spend/insights/${userId}?period=${period}`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
};

export const setBudgetThreshold = async (userId: string, category: string, monthlyLimit: number) => {
    const res = await authFetch(`${API_URL}/spend/budget/${userId}`, {
        method: 'POST',
        body: JSON.stringify({ category, monthly_limit: monthlyLimit }),
    });
    if (!res.ok) throw new Error('Failed to set budget');
    return res.json();
};

// ── Gossip / Network ──
/** Matches backend gossip_service.get_gossip_stats() */
export interface GossipStats {
    total_messages: number;
    unique_transactions: number;
    avg_hops: number | null;         // backend field name
    active_peers?: number;           // enriched field (added by backend)
    avg_propagation_time?: number;   // enriched field (added by backend)
}

export const fetchGossipStats = async (): Promise<GossipStats | null> => {
    try {
        const res = await authFetch(`${API_URL}/gossip/stats`);
        if (!res.ok) return null;
        return res.json();
    } catch { return null; }
};

export interface GossipReconstruction {
    transaction_id: string;
    source_peer_id?: string;
    hops?: number;
    confidence?: number;
    [key: string]: unknown;
}

export interface GossipSubmitPayload {
    message_id: string;
    transaction_id: string;
    source_peer_id: string;
    payload: Record<string, unknown>;
    hops: number;
}

export const submitGossip = async (payload: GossipSubmitPayload) => {
    const res = await authFetch(`${API_URL}/gossip`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit gossip');
    return res.json();
};

export const fetchGossipReconstruction = async (transactionId: string): Promise<GossipReconstruction | null> => {
    try {
        const res = await authFetch(`${API_URL}/gossip/reconstruct/${transactionId}`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
};

export interface SyncTransactionPayload {
    transaction_id: string;
    sender_id: string;
    receiver_id: string;
    merchant_id?: string;
    invoice_id?: string;
    amount: number;
    timestamp: string;
    token_id: string;
    signature: string;
    propagated_to_peers?: number;
    synced?: boolean;
}

// ── Sync ──
/** Backend endpoint: POST /api/v1/sync (not /sync/batch) */
export const syncTransactions = async (transactions: SyncTransactionPayload[]) => {
    const res = await authFetch(`${API_URL}/sync`, {
        method: 'POST',
        body: JSON.stringify(transactions),
    });
    if (!res.ok) throw new Error('Sync failed');
    return res.json();
};

// ── Recovery ──
/** Backend endpoint: POST /api/v1/initiate-recovery */
export const requestRecovery = async (userId: string, newPublicKey?: string) => {
    const res = await authFetch(`${API_URL}/initiate-recovery`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, new_public_key: newPublicKey }),
    });
    if (!res.ok) throw new Error('Recovery request failed');
    return res.json();
};

export const createRecoveryRequest = requestRecovery;

/** Backend endpoint: POST /api/v1/approve-recovery */
export const approveRecovery = async (recoveryId: string) => {
    const res = await authFetch(`${API_URL}/approve-recovery`, {
        method: 'POST',
        body: JSON.stringify({ recovery_id: recoveryId }),
    });
    if (!res.ok) throw new Error('Approval failed');
    return res.json();
};

export const fetchPendingRecoveries = async () => {
    try {
        const res = await authFetch(`${API_URL}/pending-recoveries`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.pending || [];
    } catch { return []; }
};

export const fetchRecoveryStatus = async (recoveryId: string) => {
    try {
        const res = await authFetch(`${API_URL}/recovery/${recoveryId}`);
        if (!res.ok) return null;
        return res.json();
    } catch { return null; }
};

// ── Guardians ──
export interface GuardianInfo {
    guardian_id: string;
    guardian_name?: string;
    status: string;
}

export const fetchGuardians = async () => {
    try {
        const res = await authFetch(`${API_URL}/guardians`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.guardians || [];
    } catch { return []; }
};

export const registerGuardians = async (guardianIds: string[]) => {
    const res = await authFetch(`${API_URL}/register-guardians`, {
        method: 'POST',
        body: JSON.stringify({ guardian_ids: guardianIds }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || 'Failed to register guardians');
    }
    return res.json();
};

// ── AI Anomaly Detection ──
export interface AnomalyReport {
    type: string;       // COLLUSION, CIRCULAR_LOOP, BURST_ABUSE
    severity: string;
    [key: string]: unknown;
}

export const fetchAnomalies = async (windowHours: number = 24): Promise<AnomalyReport[]> => {
    try {
        const res = await authFetch(`${API_URL}/ai/anomalies?window_hours=${windowHours}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.anomalies || [];
    } catch { return []; }
};

export const fetchTrustScore = async (userId: string): Promise<number | null> => {
    try {
        const res = await authFetch(`${API_URL}/ai/trust-score/${userId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.adjustment ?? null;
    } catch { return null; }
};

