'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AutoBidRule,
  BENEFIT_CARDS,
  BenefitCardId,
  Bid,
  CategoryId,
  FloatingReaction,
  FulfillmentStatus,
  GroupPoolMember,
  Message,
  Mission,
  MissionMode,
  Order,
  ProviderProfile,
  RadarNotification,
  Review,
  User,
  UserRole,
} from '@/types/domain';
import {
  createInitialSeedAuction,
  INITIAL_AUTO_BID_RULES,
  INITIAL_USER,
  SIMULATED_PROVIDERS,
  USER_PROVIDER_PROFILE,
} from '@/lib/seed-data';
import { calculateDistanceKm, computeBidValueScore, formatCLP } from '@/lib/geo-and-pricing';
import {
  isSoundEnabled,
  playBidChime,
  playExtraTimeSiren,
  playOutbidAlert,
  playRadarPing,
  playVictoryFanfare,
  setSoundEnabled,
  triggerHaptic,
} from '@/lib/feedback';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const STORAGE_KEY = 'pide_y_compite_state_v1';
const CHANNEL_NAME = 'pide_y_compite_realtime_v1';

interface PersistedState {
  user: User;
  userProvider: ProviderProfile;
  botProviders: ProviderProfile[];
  autoBidRules: AutoBidRule[];
  missions: Mission[];
  bids: Bid[];
  poolMembers: GroupPoolMember[];
  orders: Order[];
  messages: Message[];
  reviews: Review[];
}

interface CreateMissionInput {
  title: string;
  description: string;
  category: CategoryId;
  urgency_tags: string[];
  media_url?: string;
  address_label: string;
  mode: MissionMode;
  duration_seconds: number;
  max_budget: number;
  lat: number;
  lng: number;
  is_group_pool: boolean;
  host_initial_contribution?: number;
}

interface SubmitBidInput {
  mission_id: string;
  provider_id?: string;
  amount: number;
  benefit_cards: BenefitCardId[];
  eta_minutes: number;
  is_auto_bid?: boolean;
  note?: string;
}

interface AuctionContextValue {
  nowMs: number;
  user: User;
  userProvider: ProviderProfile;
  allProviders: ProviderProfile[];
  autoBidRules: AutoBidRule[];
  missions: Mission[];
  bids: Bid[];
  poolMembers: GroupPoolMember[];
  orders: Order[];
  messages: Message[];
  reviews: Review[];
  reactions: FloatingReaction[];
  notifications: RadarNotification[];
  activeMissionId: string | null;
  activeOrderId: string | null;
  botsEnabled: boolean;
  soundOn: boolean;
  isSupabaseLive: boolean;

  // Navigation & UI Controls
  setActiveMissionId: (id: string | null) => void;
  setActiveOrderId: (id: string | null) => void;
  setBotsEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  dismissNotification: (id: string) => void;
  resetDemoData: () => void;

  // User & Provider Role Actions
  switchRole: (role: UserRole) => void;
  updateUserProfile: (patch: Partial<User>) => void;
  updateUserLocation: (lat: number, lng: number, label?: string) => void;
  updateProviderProfile: (patch: Partial<ProviderProfile>) => void;
  withdrawProviderBalance: () => number;

  // Module A: Missions
  createMission: (input: CreateMissionInput) => Mission;
  cancelMission: (missionId: string) => void;
  jumpClockToLast10Seconds: (missionId: string) => void;
  spawnSimulatedRadarMission: () => Mission;

  // Module B: Group Pool ("Vaquita Grupal")
  joinOrContributePool: (
    missionId: string,
    guestName: string,
    avatarEmoji: string,
    amountToAdd: number,
    memberId?: string
  ) => GroupPoolMember;
  voteForBid: (missionId: string, memberId: string, bidId: string) => void;
  sendReaction: (missionId: string, bidId: string, emoji: string, senderName?: string) => void;
  simulateFriendContribution: (missionId: string) => void;

  // Module C: Live Bidding & Podium
  submitOrUpdateBid: (input: SubmitBidInput) => Bid | null;
  triggerInstantBotBid: (missionId: string) => void;

  // Module D: Escrow, Order Execution, Chat & QR Release
  acceptBidAndLockEscrow: (missionId: string, bidId: string) => Order | null;
  updateOrderFulfillmentStatus: (orderId: string, status: FulfillmentStatus) => void;
  sendOrderMessage: (orderId: string, content: string, imageUrl?: string) => void;
  verifyQrAndCompleteOrder: (orderId: string, scannedToken: string) => boolean;
  submitReview: (orderId: string, stars: number, tags: string[], comment: string) => void;

  // Module E: Autopilot Rules
  saveAutoBidRule: (rule: Omit<AutoBidRule, 'id'> & { id?: string }) => void;
  toggleAutoBidRule: (ruleId: string) => void;
  deleteAutoBidRule: (ruleId: string) => void;
}

const AuctionContext = createContext<AuctionContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function isWithinTimeWindow(start: string, end: string): boolean {
  const now = new Date();
  const hhmm = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
  if (start <= end) {
    return hhmm >= start && hhmm <= end;
  }
  return hhmm >= start || hhmm <= end;
}

export function AuctionProvider({ children }: { children: React.ReactNode }) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [hydrated, setHydrated] = useState(false);

  const seed = useMemo(() => createInitialSeedAuction(), []);

  const [user, setUser] = useState<User>(INITIAL_USER);
  const [userProvider, setUserProvider] = useState<ProviderProfile>(USER_PROVIDER_PROFILE);
  const [botProviders, setBotProviders] = useState<ProviderProfile[]>(SIMULATED_PROVIDERS);
  const [autoBidRules, setAutoBidRules] = useState<AutoBidRule[]>(INITIAL_AUTO_BID_RULES);
  const [missions, setMissions] = useState<Mission[]>(seed.missions);
  const [bids, setBids] = useState<Bid[]>(seed.bids);
  const [poolMembers, setPoolMembers] = useState<GroupPoolMember[]>(seed.poolMembers);
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [activeMissionId, setActiveMissionId] = useState<string | null>(
    seed.missions[0]?.id ?? null
  );
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [notifications, setNotifications] = useState<RadarNotification[]>([]);
  const [botsEnabled, setBotsEnabled] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const scheduledTimeoutsRef = useRef<number[]>([]);
  const stateRef = useRef({
    user,
    userProvider,
    botProviders,
    autoBidRules,
    missions,
    bids,
    poolMembers,
    orders,
    messages,
    reviews,
    activeMissionId,
  });

  stateRef.current = {
    user,
    userProvider,
    botProviders,
    autoBidRules,
    missions,
    bids,
    poolMembers,
    orders,
    messages,
    reviews,
    activeMissionId,
  };

  const pushNotification = useCallback(
    (
      title: string,
      subtitle: string,
      type: RadarNotification['type'] = 'bid'
    ) => {
      const id = makeId('notif');
      setNotifications((prev) => [
        { id, title, subtitle, type, created_at: Date.now() },
        ...prev.slice(0, 3),
      ]);
      const tid = window.setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 4800);
      scheduledTimeoutsRef.current.push(tid);
    },
    []
  );

  // Hydrate from localStorage and open BroadcastChannel for real multi-tab sync
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (parsed.user) setUser(parsed.user);
        if (parsed.userProvider) setUserProvider(parsed.userProvider);
        if (parsed.botProviders?.length) setBotProviders(parsed.botProviders);
        if (parsed.autoBidRules?.length) setAutoBidRules(parsed.autoBidRules);
        if (parsed.missions?.length) {
          // Ensure at least one open demo mission hasn't expired in stale localStorage
          const now = Date.now();
          const hasLiveOpen = parsed.missions.some(
            (m) => m.status === 'open' && new Date(m.expires_at).getTime() > now + 30000
          );
          if (hasLiveOpen) {
            setMissions(parsed.missions);
            if (parsed.bids) setBids(parsed.bids);
            if (parsed.poolMembers) setPoolMembers(parsed.poolMembers);
            const firstOpen = parsed.missions.find((m) => m.status === 'open');
            if (firstOpen) setActiveMissionId(firstOpen.id);
          }
        }
        if (parsed.orders) setOrders(parsed.orders);
        if (parsed.messages) setMessages(parsed.messages);
        if (parsed.reviews) setReviews(parsed.reviews);
      }
    } catch {
      // Ignore corrupt localStorage
    }
    setHydrated(true);

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = bc;
      bc.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg || typeof msg !== 'object') return;
        if (msg.type === 'SYNC_STATE' && msg.payload) {
          const p = msg.payload as PersistedState;
          setMissions(p.missions);
          setBids(p.bids);
          setPoolMembers(p.poolMembers);
          setOrders(p.orders);
          setMessages(p.messages);
          setReviews(p.reviews);
          setAutoBidRules(p.autoBidRules);
          setBotProviders(p.botProviders);
        } else if (msg.type === 'REACTION' && msg.reaction) {
          setReactions((prev) => [...prev.slice(-18), msg.reaction]);
        }
      };
      return () => {
        bc.close();
      };
    }
  }, []);

  // Optional Supabase Realtime Channel bridge when env vars are set
  useEffect(() => {
    const sb = supabase;
    if (!isSupabaseConfigured || !sb) return;
    const channel = sb
      .channel('pide-y-compite-global')
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        if (payload) {
          setReactions((prev) => [...prev.slice(-18), payload as FloatingReaction]);
        }
      })
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, []);

  // Persist & broadcast across tabs
  const broadcastSync = useCallback((nextPartial?: Partial<PersistedState>) => {
    if (typeof window === 'undefined') return;
    const snapshot: PersistedState = {
      user: nextPartial?.user ?? stateRef.current.user,
      userProvider: nextPartial?.userProvider ?? stateRef.current.userProvider,
      botProviders: nextPartial?.botProviders ?? stateRef.current.botProviders,
      autoBidRules: nextPartial?.autoBidRules ?? stateRef.current.autoBidRules,
      missions: nextPartial?.missions ?? stateRef.current.missions,
      bids: nextPartial?.bids ?? stateRef.current.bids,
      poolMembers: nextPartial?.poolMembers ?? stateRef.current.poolMembers,
      orders: nextPartial?.orders ?? stateRef.current.orders,
      messages: nextPartial?.messages ?? stateRef.current.messages,
      reviews: nextPartial?.reviews ?? stateRef.current.reviews,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      channelRef.current?.postMessage({ type: 'SYNC_STATE', payload: snapshot });
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    broadcastSync();
  }, [
    hydrated,
    user,
    userProvider,
    botProviders,
    autoBidRules,
    missions,
    bids,
    poolMembers,
    orders,
    messages,
    reviews,
    broadcastSync,
  ]);

  // 1-second realtime clock tick & cleanup of old floating reactions
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setNowMs(now);
      setReactions((prev) => prev.filter((r) => now - r.created_at < 3800));
    }, 1000);
    return () => {
      window.clearInterval(interval);
      scheduledTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const allProviders = useMemo(
    () => [userProvider, ...botProviders],
    [userProvider, botProviders]
  );

  // Core Bid Submission + Anti-Sniping +30s Extra Time Rule
  const submitOrUpdateBid = useCallback(
    (input: SubmitBidInput): Bid | null => {
      const curr = stateRef.current;
      const mission = curr.missions.find((m) => m.id === input.mission_id);
      if (!mission || mission.status !== 'open') return null;

      const now = Date.now();
      const expiresMs = new Date(mission.expires_at).getTime();
      const remainingSec = (expiresMs - now) / 1000;
      if (remainingSec <= 0) return null;

      const providerId = input.provider_id || curr.userProvider.user_id;
      const provider =
        providerId === curr.userProvider.user_id
          ? curr.userProvider
          : curr.botProviders.find((p) => p.user_id === providerId);
      if (!provider) return null;

      // Check previous #1 leader to alert if user provider was overtaken
      const existingMissionBids = curr.bids
        .filter((b) => b.mission_id === mission.id)
        .sort((a, b) => b.value_score - a.value_score);
      const prevLeaderId = existingMissionBids[0]?.provider_id;

      const cards = input.benefit_cards.slice(0, 3);
      const distanceKm = calculateDistanceKm(
        mission.lat,
        mission.lng,
        provider.lat,
        provider.lng
      );

      const { score } = computeBidValueScore({
        maxBudget: mission.max_budget,
        bidAmount: input.amount,
        benefitCards: cards,
        providerRating: provider.rating_avg,
        etaMinutes: input.eta_minutes,
        distanceKm,
      });

      const existingIdx = curr.bids.findIndex(
        (b) => b.mission_id === mission.id && b.provider_id === provider.user_id
      );

      const newBid: Bid = {
        id: existingIdx >= 0 ? curr.bids[existingIdx].id : makeId('bid'),
        mission_id: mission.id,
        provider_id: provider.user_id,
        provider_name: provider.business_name,
        provider_avatar: provider.avatar_emoji,
        provider_rating: provider.rating_avg,
        provider_verified: provider.verified_status === 'verified',
        distance_km: distanceKm,
        amount: Math.round(input.amount),
        benefit_cards: cards,
        eta_minutes: input.eta_minutes,
        is_auto_bid: Boolean(input.is_auto_bid),
        value_score: score,
        note: input.note,
        created_at:
          existingIdx >= 0
            ? curr.bids[existingIdx].created_at
            : new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      };

      const nextBids =
        existingIdx >= 0
          ? curr.bids.map((b, i) => (i === existingIdx ? newBid : b))
          : [...curr.bids, newBid];

      setBids(nextBids);

      // Increment total_bids_count if first bid on this mission
      if (existingIdx < 0) {
        if (provider.user_id === curr.userProvider.user_id) {
          setUserProvider((p) => ({ ...p, total_bids_count: p.total_bids_count + 1 }));
        } else {
          setBotProviders((prev) =>
            prev.map((p) =>
              p.user_id === provider.user_id
                ? { ...p, total_bids_count: p.total_bids_count + 1 }
                : p
            )
          );
        }
      }

      // Check new #1 leader
      const newSorted = nextBids
        .filter((b) => b.mission_id === mission.id)
        .sort((a, b) => b.value_score - a.value_score);
      const newLeaderId = newSorted[0]?.provider_id;

      // Extra Time Rule: if offer arrives in the last 10 seconds, extend +30s!
      if (remainingSec <= 10 && remainingSec > 0) {
        const extendedIso = new Date(expiresMs + 30 * 1000).toISOString();
        setMissions((prev) =>
          prev.map((m) =>
            m.id === mission.id
              ? {
                  ...m,
                  expires_at: extendedIso,
                  extra_time_extensions: m.extra_time_extensions + 1,
                  last_extended_at: new Date(now).toISOString(),
                }
              : m
          )
        );
        playExtraTimeSiren();
        pushNotification(
          '⏱️ ¡Tiempo Extra +30s!',
          `${provider.business_name} pujó en los últimos 10s. El reloj se extendió para contra-ofertas.`,
          'extratime'
        );
      } else if (
        curr.user.role_active === 'provider' &&
        prevLeaderId === curr.userProvider.user_id &&
        newLeaderId !== curr.userProvider.user_id
      ) {
        playOutbidAlert();
        pushNotification(
          '⚠️ ¡Te superaron en el Podio!',
          `${provider.business_name} tomó el 1er lugar con ${formatCLP(newBid.amount)}. Mejora tu oferta o suma una Carta.`,
          'outbid'
        );
      } else if (mission.id === curr.activeMissionId || providerId === curr.userProvider.user_id) {
        playBidChime();
        if (input.is_auto_bid && providerId === curr.userProvider.user_id) {
          pushNotification(
            '🤖 Piloto Automático Ejecutado',
            `Tu negocio envió oferta automática por ${formatCLP(newBid.amount)} en "${mission.title}".`,
            'autopilot'
          );
        }
      }

      return newBid;
    },
    [pushNotification]
  );

  // Evaluate Autopilot Rules ("Cero Salas Vacías" in first 10 seconds)
  const scheduleAutopilotForMission = useCallback(
    (mission: Mission) => {
      const curr = stateRef.current;
      const providers = [curr.userProvider, ...curr.botProviders];

      curr.autoBidRules.forEach((rule) => {
        if (!rule.is_active) return;
        if (rule.category !== 'all' && rule.category !== mission.category) return;
        if (mission.max_budget < rule.min_budget) return;
        if (!isWithinTimeWindow(rule.time_window_start, rule.time_window_end)) return;

        const provider = providers.find((p) => p.user_id === rule.provider_id);
        if (!provider || !provider.is_online) return;
        if (provider.is_bot && !botsEnabled) return;

        const distKm = calculateDistanceKm(
          mission.lat,
          mission.lng,
          provider.lat,
          provider.lng
        );
        if (distKm > rule.max_distance_km || distKm > provider.coverage_radius_km) return;

        const delayMs = Math.min(10, Math.max(1, rule.delay_seconds)) * 1000;
        const tid = window.setTimeout(() => {
          const discounted =
            Math.round(
              (mission.max_budget * (1 - rule.discount_percent / 100)) / 100
            ) * 100;
          const eta = Math.max(14, Math.round(distKm * 6 + 12));
          submitOrUpdateBid({
            mission_id: mission.id,
            provider_id: provider.user_id,
            amount: Math.max(2000, discounted),
            benefit_cards: rule.default_benefits.slice(0, 3),
            eta_minutes: eta,
            is_auto_bid: true,
            note: 'Oferta instantánea vía Piloto Automático verificado',
          });
        }, delayMs);
        scheduledTimeoutsRef.current.push(tid);
      });
    },
    [botsEnabled, submitOrUpdateBid]
  );

  // Trigger competitive bot bid on an open mission
  const triggerInstantBotBid = useCallback(
    (missionId: string) => {
      const curr = stateRef.current;
      const mission = curr.missions.find((m) => m.id === missionId);
      if (!mission || mission.status !== 'open') return;

      const missionBids = curr.bids
        .filter((b) => b.mission_id === missionId)
        .sort((a, b) => b.value_score - a.value_score);

      const leaderId = missionBids[0]?.provider_id;

      // Pick an eligible bot not currently #1
      const eligibleBots = curr.botProviders.filter(
        (b) =>
          b.is_online &&
          b.user_id !== leaderId &&
          (b.categories.includes(mission.category) || b.categories.length >= 3)
      );
      const chosen =
        eligibleBots[Math.floor(Math.random() * eligibleBots.length)] ||
        curr.botProviders[0];
      if (!chosen) return;

      const existing = missionBids.find((b) => b.provider_id === chosen.user_id);
      const allCardIds = BENEFIT_CARDS.map((c) => c.id);

      let nextAmount = mission.max_budget;
      let nextCards: BenefitCardId[] = ['envio_gratis'];
      let nextEta = 22;

      if (existing) {
        // Strategy: 50% chance keep price & add a Benefit Card, 50% chance trim price 3-5%
        if (existing.benefit_cards.length < 3 && Math.random() < 0.58) {
          const unused = allCardIds.filter((c) => !existing.benefit_cards.includes(c));
          nextCards = [...existing.benefit_cards, unused[0] || 'atencion_prioritaria'].slice(0, 3);
          nextAmount = existing.amount;
        } else {
          nextAmount = Math.max(
            Math.round(mission.max_budget * 0.76),
            Math.round((existing.amount * 0.96) / 100) * 100
          );
          nextCards =
            existing.benefit_cards.length > 0
              ? existing.benefit_cards
              : ['envio_gratis', 'llego_20_min'];
        }
        nextEta = Math.max(14, existing.eta_minutes - 2);
      } else {
        const discount = [0, 0.03, 0.06, 0.08][Math.floor(Math.random() * 4)];
        nextAmount = Math.round((mission.max_budget * (1 - discount)) / 100) * 100;
        const shuffled = [...allCardIds].sort(() => Math.random() - 0.5);
        nextCards = shuffled.slice(0, discount === 0 ? 3 : 2);
        nextEta = 16 + Math.floor(Math.random() * 14);
      }

      const notes = [
        '¡Listos para salir ahora mismo con garantía total!',
        'Mejoramos beneficios manteniendo calidad primera línea.',
        'Stock confirmado y técnico/repartidor asignado a tu zona.',
        'Contra-oferta en vivo: sumamos beneficio extra sin costo.',
      ];

      submitOrUpdateBid({
        mission_id: missionId,
        provider_id: chosen.user_id,
        amount: nextAmount,
        benefit_cards: nextCards,
        eta_minutes: nextEta,
        is_auto_bid: false,
        note: notes[Math.floor(Math.random() * notes.length)],
      });
    },
    [submitOrUpdateBid]
  );

  // Live background competitive bot loop every 8.5s on the active open mission
  useEffect(() => {
    if (!botsEnabled || !hydrated) return;
    const timer = window.setInterval(() => {
      const curr = stateRef.current;
      const active = curr.missions.find(
        (m) => m.id === curr.activeMissionId && m.status === 'open'
      );
      if (!active) return;
      const rem = (new Date(active.expires_at).getTime() - Date.now()) / 1000;
      if (rem <= 1) return;
      triggerInstantBotBid(active.id);
    }, 8500);

    return () => window.clearInterval(timer);
  }, [botsEnabled, hydrated, triggerInstantBotBid]);

  const switchRole = useCallback((role: UserRole) => {
    triggerHaptic('medium');
    setUser((prev) => ({ ...prev, role_active: role }));
  }, []);

  const updateUserProfile = useCallback((patch: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...patch }));
  }, []);

  // Re-center user & nearby simulated businesses so GPS always yields realistic 0.8-4.2km distances
  const updateUserLocation = useCallback(
    (lat: number, lng: number, label = 'Ubicación GPS actual') => {
      setUser((prev) => ({
        ...prev,
        saved_addresses: [
          { id: 'addr-gps', label, street: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng },
          ...prev.saved_addresses.filter((a) => a.id !== 'addr-gps'),
        ],
      }));
      setUserProvider((prev) => ({
        ...prev,
        lat: lat + 0.004,
        lng: lng - 0.003,
      }));
      const offsets = [
        [0.0082, 0.0061],
        [-0.0124, 0.0095],
        [-0.0055, -0.0062],
        [0.0175, -0.014],
        [-0.021, 0.018],
      ];
      setBotProviders((prev) =>
        prev.map((b, idx) => ({
          ...b,
          lat: lat + (offsets[idx]?.[0] ?? 0.01),
          lng: lng + (offsets[idx]?.[1] ?? 0.01),
        }))
      );
      pushNotification(
        '📍 GPS Geoespacial Sincronizado',
        `Comercios en tu radio recalculados alrededor de ${label}.`,
        'mission'
      );
    },
    [pushNotification]
  );

  const updateProviderProfile = useCallback((patch: Partial<ProviderProfile>) => {
    triggerHaptic('light');
    setUserProvider((prev) => ({ ...prev, ...patch }));
  }, []);

  const withdrawProviderBalance = useCallback((): number => {
    const amount = stateRef.current.userProvider.balance;
    if (amount <= 0) return 0;
    triggerHaptic('success');
    playVictoryFanfare();
    setUserProvider((prev) => ({ ...prev, balance: 0 }));
    setUser((prev) => ({ ...prev, wallet_balance: prev.wallet_balance + amount }));
    pushNotification(
      '💸 Retiro Transferido',
      `${formatCLP(amount)} enviados desde tu saldo de Proveedor a tu cuenta principal.`,
      'escrow'
    );
    return amount;
  }, [pushNotification]);

  const createMission = useCallback(
    (input: CreateMissionInput): Mission => {
      const now = Date.now();
      const currUser = stateRef.current.user;
      const mission: Mission = {
        id: makeId('mission'),
        buyer_id: currUser.id,
        buyer_name: currUser.name,
        buyer_rating: currUser.rating_avg,
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        urgency_tags: input.urgency_tags,
        media_url: input.media_url,
        address_label: input.address_label,
        mode: input.mode,
        duration_seconds: input.duration_seconds,
        expires_at: new Date(now + input.duration_seconds * 1000).toISOString(),
        max_budget: Math.round(input.max_budget),
        lat: input.lat,
        lng: input.lng,
        is_group_pool: input.is_group_pool,
        status: 'open',
        extra_time_extensions: 0,
        created_at: new Date(now).toISOString(),
      };

      setMissions((prev) => [mission, ...prev]);
      setActiveMissionId(mission.id);

      if (input.is_group_pool) {
        const hostContribution =
          input.host_initial_contribution ?? Math.round(input.max_budget * 0.35);
        const hostMember: GroupPoolMember = {
          id: makeId('pool'),
          mission_id: mission.id,
          guest_name: `${currUser.name.split(' ')[0]} (Anfitrión)`,
          avatar_emoji: currUser.avatar_url || '🧑‍💻',
          contribution_amount: hostContribution,
          voted_bid_id: null,
          is_host: true,
        };
        setPoolMembers((prev) => [...prev, hostMember]);
      }

      playRadarPing();
      pushNotification(
        '📡 ¡Sala de Subasta Abierta!',
        `Alertando a comercios verificados en tu radio para "${mission.title}".`,
        'mission'
      );

      // Schedule Autopilot rules in the first 3-9 seconds
      scheduleAutopilotForMission(mission);

      return mission;
    },
    [pushNotification, scheduleAutopilotForMission]
  );

  const cancelMission = useCallback((missionId: string) => {
    triggerHaptic('warning');
    setMissions((prev) =>
      prev.map((m) => (m.id === missionId ? { ...m, status: 'cancelled' } : m))
    );
  }, []);

  const jumpClockToLast10Seconds = useCallback(
    (missionId: string) => {
      triggerHaptic('medium');
      const targetExpires = new Date(Date.now() + 9500).toISOString();
      setMissions((prev) =>
        prev.map((m) =>
          m.id === missionId && m.status === 'open'
            ? { ...m, expires_at: targetExpires }
            : m
        )
      );
      pushNotification(
        '⚡ Reloj adelantado a 00:09',
        'Si entra una puja ahora, verás activarse automáticamente la Regla de Tiempo Extra (+30s).',
        'extratime'
      );
    },
    [pushNotification]
  );

  const spawnSimulatedRadarMission = useCallback((): Mission => {
    const prov = stateRef.current.userProvider;
    const templates: Array<{
      title: string;
      description: string;
      category: CategoryId;
      mode: MissionMode;
      budget: number;
      tags: string[];
      buyer: string;
    }> = [
      {
        title: 'Cambio urgente de llave monomando lavamanos',
        description:
          'Se quebró la manilla del monomando del baño principal. Tengo el repuesto nuevo, necesito instalación limpia hoy.',
        category: 'gasfiteria',
        mode: 'scheduled',
        budget: 28000,
        tags: ['Urgencia hoy', 'Con garantía'],
        buyer: 'Camila Fuentes',
      },
      {
        title: 'Pedido Express: 3 Pizzas Napolitanas + Bebida 1.5L',
        description:
          'Reunión de equipo en oficina, buscamos masa artesanal recién salida del horno y entrega rápida.',
        category: 'comida',
        mode: 'flash',
        budget: 26500,
        tags: ['Caliente recién hecho', 'Sin demora'],
        buyer: 'Ignacio Araya',
      },
      {
        title: 'Revisión corto en enchufe cocina + cambio módulo',
        description:
          'Hizo chispa el enchufe donde va el microondas. Busco eléctrico certificado cercano.',
        category: 'electricidad',
        mode: 'scheduled',
        budget: 31000,
        tags: ['Técnico SEC', 'Traer materiales'],
        buyer: 'Fernanda Lagos',
      },
      {
        title: 'Kit Taladro + Brocas concreto 8mm y tarugos Fischer',
        description:
          'Necesito set de brocas SDS/concreto de 6 y 8mm más caja de tarugos y tornillos.',
        category: 'repuestos',
        mode: 'flash',
        budget: 19000,
        tags: ['Despacho express', 'Boleta/Factura'],
        buyer: 'Rodrigo Tapia',
      },
    ];

    const matching = templates.filter((t) => prov.categories.includes(t.category));
    const pick =
      (matching.length > 0
        ? matching[Math.floor(Math.random() * matching.length)]
        : templates[0]);

    const now = Date.now();
    const duration = pick.mode === 'flash' ? 300 : 2700;
    const mission: Mission = {
      id: makeId('mission'),
      buyer_id: makeId('neighbor'),
      buyer_name: pick.buyer,
      buyer_rating: 4.91,
      title: pick.title,
      description: pick.description,
      category: pick.category,
      urgency_tags: pick.tags,
      address_label: `Sector Residencial · A ${(1.1 + Math.random() * 1.8).toFixed(1)} km`,
      mode: pick.mode,
      duration_seconds: duration,
      expires_at: new Date(now + duration * 1000).toISOString(),
      max_budget: pick.budget,
      lat: prov.lat + (Math.random() - 0.5) * 0.016,
      lng: prov.lng + (Math.random() - 0.5) * 0.016,
      is_group_pool: false,
      status: 'open',
      extra_time_extensions: 0,
      created_at: new Date(now).toISOString(),
    };

    setMissions((prev) => [mission, ...prev]);
    playRadarPing();
    pushNotification(
      '🚨 ¡Nueva Misión en tu Radio!',
      `${pick.buyer} busca "${pick.title}" (Tope ${formatCLP(pick.budget)}).`,
      'mission'
    );

    scheduleAutopilotForMission(mission);
    return mission;
  }, [pushNotification, scheduleAutopilotForMission]);

  // Module B: Group Pool ("Vaquita Grupal")
  const joinOrContributePool = useCallback(
    (
      missionId: string,
      guestName: string,
      avatarEmoji: string,
      amountToAdd: number,
      memberId?: string
    ): GroupPoolMember => {
      triggerHaptic('light');
      playBidChime();
      const curr = stateRef.current.poolMembers;
      const existing = curr.find(
        (m) =>
          m.mission_id === missionId &&
          (memberId ? m.id === memberId : m.guest_name.toLowerCase() === guestName.trim().toLowerCase())
      );

      if (existing) {
        const updated: GroupPoolMember = {
          ...existing,
          contribution_amount: existing.contribution_amount + Math.max(0, Math.round(amountToAdd)),
        };
        setPoolMembers((prev) => prev.map((m) => (m.id === existing.id ? updated : m)));
        return updated;
      }

      const created: GroupPoolMember = {
        id: makeId('pool'),
        mission_id: missionId,
        guest_name: guestName.trim() || 'Invitado',
        avatar_emoji: avatarEmoji || '🙌',
        contribution_amount: Math.max(0, Math.round(amountToAdd)),
        voted_bid_id: null,
      };
      setPoolMembers((prev) => [...prev, created]);
      pushNotification(
        '🐮 ¡Nuevo aporte en la Vaquita!',
        `${created.guest_name} se unió aportando ${formatCLP(created.contribution_amount)}.`,
        'bid'
      );
      return created;
    },
    [pushNotification]
  );

  const voteForBid = useCallback((missionId: string, memberId: string, bidId: string) => {
    triggerHaptic('light');
    setPoolMembers((prev) =>
      prev.map((m) =>
        m.mission_id === missionId && m.id === memberId
          ? { ...m, voted_bid_id: m.voted_bid_id === bidId ? null : bidId }
          : m
      )
    );
  }, []);

  const sendReaction = useCallback(
    (missionId: string, bidId: string, emoji: string, senderName?: string) => {
      triggerHaptic('light');
      const reaction: FloatingReaction = {
        id: makeId('react'),
        mission_id: missionId,
        bid_id: bidId,
        emoji,
        sender_name: senderName || stateRef.current.user.name.split(' ')[0],
        created_at: Date.now(),
      };
      setReactions((prev) => [...prev.slice(-18), reaction]);
      channelRef.current?.postMessage({ type: 'REACTION', reaction });
      if (isSupabaseConfigured && supabase) {
        supabase.channel('pide-y-compite-global').send({
          type: 'broadcast',
          event: 'reaction',
          payload: reaction,
        });
      }
    },
    []
  );

  const simulateFriendContribution = useCallback(
    (missionId: string) => {
      const friends = [
        { name: 'Cata Rojas', emoji: '🦄', amount: 5500 },
        { name: 'Tomás Pizarro', emoji: '🏀', amount: 6000 },
        { name: 'Javi Núñez', emoji: '🎧', amount: 4500 },
        { name: 'Nico Bravo', emoji: '🍻', amount: 5000 },
      ];
      const existingNames = stateRef.current.poolMembers
        .filter((m) => m.mission_id === missionId)
        .map((m) => m.guest_name);
      const pick =
        friends.find((f) => !existingNames.includes(f.name)) ||
        friends[Math.floor(Math.random() * friends.length)];

      const member = joinOrContributePool(missionId, pick.name, pick.emoji, pick.amount);
      const topBid = stateRef.current.bids
        .filter((b) => b.mission_id === missionId)
        .sort((a, b) => b.value_score - a.value_score)[0];
      if (topBid) {
        window.setTimeout(() => {
          voteForBid(missionId, member.id, topBid.id);
          sendReaction(missionId, topBid.id, '🔥', pick.name.split(' ')[0]);
        }, 600);
      }
    },
    [joinOrContributePool, sendReaction, voteForBid]
  );

  // Module D: Accept Offer -> Escrow Lock -> Chat -> QR Verification -> Mutual Rating
  const acceptBidAndLockEscrow = useCallback(
    (missionId: string, bidId: string): Order | null => {
      const curr = stateRef.current;
      const mission = curr.missions.find((m) => m.id === missionId);
      const bid = curr.bids.find((b) => b.id === bidId);
      if (!mission || !bid) return null;

      const existingOrder = curr.orders.find((o) => o.mission_id === missionId);
      if (existingOrder) {
        setActiveOrderId(existingOrder.id);
        return existingOrder;
      }

      const token = `PYC-${missionId.slice(-4).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;

      const order: Order = {
        id: makeId('order'),
        mission_id: mission.id,
        winning_bid_id: bid.id,
        buyer_id: mission.buyer_id,
        provider_id: bid.provider_id,
        escrow_amount: bid.amount,
        benefit_cards: bid.benefit_cards,
        eta_minutes: bid.eta_minutes,
        qr_token: token,
        fulfillment_status: 'preparing',
        created_at: new Date().toISOString(),
      };

      setMissions((prev) =>
        prev.map((m) => (m.id === missionId ? { ...m, status: 'locked' } : m))
      );
      setOrders((prev) => [order, ...prev]);
      setActiveOrderId(order.id);

      playVictoryFanfare();
      pushNotification(
        '🛡️ Escudo Escrow Activado',
        `${formatCLP(bid.amount)} retenidos de forma segura. Se liberarán a ${bid.provider_name} al escanear tu QR.`,
        'escrow'
      );

      // Welcome system/provider message in the execution room
      const welcomeMsg: Message = {
        id: makeId('msg'),
        order_id: order.id,
        sender_id: bid.provider_id,
        sender_name: bid.provider_name,
        sender_role: 'provider',
        content: `¡Hola ${mission.buyer_name.split(' ')[0]}! Gracias por elegirnos. Ya activamos tu pedido con tus Cartas de Beneficio comprometidas. Te iremos avisando por aquí cada avance.`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, welcomeMsg]);

      return order;
    },
    [pushNotification]
  );

  const updateOrderFulfillmentStatus = useCallback(
    (orderId: string, status: FulfillmentStatus) => {
      triggerHaptic('medium');
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, fulfillment_status: status } : o))
      );
      const labels: Record<FulfillmentStatus, string> = {
        preparing: 'Preparando pedido / alistando herramientas',
        on_the_way: 'En camino a tu ubicación GPS',
        at_doorstep: '¡En la puerta! Muestra el código QR para finalizar',
        completed: 'Servicio completado y pago liberado',
      };
      pushNotification('📦 Estado Actualizado', labels[status], 'escrow');
    },
    [pushNotification]
  );

  const sendOrderMessage = useCallback(
    (orderId: string, content: string, imageUrl?: string) => {
      const curr = stateRef.current;
      const order = curr.orders.find((o) => o.id === orderId);
      if (!order) return;
      if (!content.trim() && !imageUrl) return;

      triggerHaptic('light');
      const isUserBuyer = curr.user.role_active === 'buyer';
      const senderId = isUserBuyer ? curr.user.id : order.provider_id;
      const providerObj = [curr.userProvider, ...curr.botProviders].find(
        (p) => p.user_id === order.provider_id
      );

      const newMsg: Message = {
        id: makeId('msg'),
        order_id: orderId,
        sender_id: senderId,
        sender_name: isUserBuyer
          ? curr.user.name
          : providerObj?.business_name || 'Proveedor',
        sender_role: curr.user.role_active,
        content: content.trim(),
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);

      // If buyer writes to a simulated local business, reply naturally in 1.8s
      if (isUserBuyer && providerObj?.is_bot) {
        const tid = window.setTimeout(() => {
          const replies = [
            '¡Perfecto! Recibido fuerte y claro. Vamos en excelente tiempo hacia tu ubicación.',
            'Todo confirmado, incluimos las Cartas de Beneficio prometidas en tu oferta ganadora.',
            '¡Genial! Apenas lleguemos al punto te aviso para escanear tu código QR de seguridad.',
          ];
          const botReply: Message = {
            id: makeId('msg'),
            order_id: orderId,
            sender_id: providerObj.user_id,
            sender_name: providerObj.business_name,
            sender_role: 'provider',
            content: imageUrl
              ? '¡Excelente foto de referencia! Nos ayuda muchísimo para llevar todo exacto.'
              : replies[Math.floor(Math.random() * replies.length)],
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, botReply]);
          playBidChime();
        }, 1700);
        scheduledTimeoutsRef.current.push(tid);
      }
    },
    []
  );

  const verifyQrAndCompleteOrder = useCallback(
    (orderId: string, scannedToken: string): boolean => {
      const curr = stateRef.current;
      const order = curr.orders.find((o) => o.id === orderId);
      if (!order) return false;
      if (order.qr_token.trim().toUpperCase() !== scannedToken.trim().toUpperCase()) {
        playOutbidAlert();
        return false;
      }
      if (order.fulfillment_status === 'completed') return true;

      const completedAt = new Date().toISOString();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, fulfillment_status: 'completed', completed_at: completedAt }
            : o
        )
      );
      setMissions((prev) =>
        prev.map((m) => (m.id === order.mission_id ? { ...m, status: 'completed' } : m))
      );

      // Release Escrow funds to winning provider balance!
      if (order.provider_id === curr.userProvider.user_id) {
        setUserProvider((prev) => ({
          ...prev,
          balance: prev.balance + order.escrow_amount,
          completed_orders_count: prev.completed_orders_count + 1,
        }));
      } else {
        setBotProviders((prev) =>
          prev.map((p) =>
            p.user_id === order.provider_id
              ? {
                  ...p,
                  balance: p.balance + order.escrow_amount,
                  completed_orders_count: p.completed_orders_count + 1,
                }
              : p
          )
        );
      }

      playVictoryFanfare();
      pushNotification(
        '✅ ¡QR Validado y Pago Liberado!',
        `Se liberaron ${formatCLP(order.escrow_amount)} del Escrow al proveedor exitosamente.`,
        'escrow'
      );
      return true;
    },
    [pushNotification]
  );

  const submitReview = useCallback(
    (orderId: string, stars: number, tags: string[], comment: string) => {
      const curr = stateRef.current;
      const order = curr.orders.find((o) => o.id === orderId);
      if (!order) return;

      triggerHaptic('success');
      const isBuyer = curr.user.role_active === 'buyer';
      const review: Review = {
        id: makeId('rev'),
        order_id: orderId,
        reviewer_id: isBuyer ? order.buyer_id : order.provider_id,
        target_id: isBuyer ? order.provider_id : order.buyer_id,
        stars,
        tags,
        comment: comment.trim(),
        created_at: new Date().toISOString(),
      };

      setReviews((prev) => [...prev, review]);
      pushNotification(
        '⭐ ¡Gracias por tu calificación!',
        `Tu reseña de ${stars} estrellas fortalece la confianza de la comunidad.`,
        'escrow'
      );
    },
    [pushNotification]
  );

  // Module E: Autopilot CRUD
  const saveAutoBidRule = useCallback(
    (ruleInput: Omit<AutoBidRule, 'id'> & { id?: string }) => {
      triggerHaptic('success');
      if (ruleInput.id) {
        setAutoBidRules((prev) =>
          prev.map((r) => (r.id === ruleInput.id ? { ...(ruleInput as AutoBidRule) } : r))
        );
      } else {
        const created: AutoBidRule = {
          ...ruleInput,
          id: makeId('rule'),
        };
        setAutoBidRules((prev) => [created, ...prev]);
      }
      pushNotification(
        '🤖 Regla de Piloto Automático Guardada',
        'Responderá automáticamente en los primeros segundos cuando nazca un pedido compatible.',
        'autopilot'
      );
    },
    [pushNotification]
  );

  const toggleAutoBidRule = useCallback((ruleId: string) => {
    triggerHaptic('light');
    setAutoBidRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, is_active: !r.is_active } : r))
    );
  }, []);

  const deleteAutoBidRule = useCallback((ruleId: string) => {
    triggerHaptic('warning');
    setAutoBidRules((prev) => prev.filter((r) => r.id !== ruleId));
  }, []);

  const toggleSound = useCallback(() => {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    setSoundOn(next);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const resetDemoData = useCallback(() => {
    triggerHaptic('medium');
    const fresh = createInitialSeedAuction();
    setUser(INITIAL_USER);
    setUserProvider(USER_PROVIDER_PROFILE);
    setBotProviders(SIMULATED_PROVIDERS);
    setAutoBidRules(INITIAL_AUTO_BID_RULES);
    setMissions(fresh.missions);
    setBids(fresh.bids);
    setPoolMembers(fresh.poolMembers);
    setOrders([]);
    setMessages([]);
    setReviews([]);
    setActiveOrderId(null);
    setActiveMissionId(fresh.missions[0]?.id ?? null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    pushNotification(
      '🔄 Simulación Reiniciada',
      'Se restauraron las misiones en vivo, los 5 negocios locales y las pujas iniciales.',
      'mission'
    );
  }, [pushNotification]);

  const value: AuctionContextValue = {
    nowMs,
    user,
    userProvider,
    allProviders,
    autoBidRules,
    missions,
    bids,
    poolMembers,
    orders,
    messages,
    reviews,
    reactions,
    notifications,
    activeMissionId,
    activeOrderId,
    botsEnabled,
    soundOn,
    isSupabaseLive: isSupabaseConfigured,

    setActiveMissionId,
    setActiveOrderId,
    setBotsEnabled,
    toggleSound,
    dismissNotification,
    resetDemoData,

    switchRole,
    updateUserProfile,
    updateUserLocation,
    updateProviderProfile,
    withdrawProviderBalance,

    createMission,
    cancelMission,
    jumpClockToLast10Seconds,
    spawnSimulatedRadarMission,

    joinOrContributePool,
    voteForBid,
    sendReaction,
    simulateFriendContribution,

    submitOrUpdateBid,
    triggerInstantBotBid,

    acceptBidAndLockEscrow,
    updateOrderFulfillmentStatus,
    sendOrderMessage,
    verifyQrAndCompleteOrder,
    submitReview,

    saveAutoBidRule,
    toggleAutoBidRule,
    deleteAutoBidRule,
  };

  return <AuctionContext.Provider value={value}>{children}</AuctionContext.Provider>;
}

export function useAuction() {
  const ctx = useContext(AuctionContext);
  if (!ctx) {
    throw new Error('useAuction debe usarse dentro de <AuctionProvider>');
  }
  return ctx;
}
