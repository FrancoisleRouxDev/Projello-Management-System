// NOTE: This file contains SignalR connection setup helpers (hub URL, JWT access token binding, reconnect behavior, and strongly-typed event wiring).

import {
	HubConnection,
	HubConnectionBuilder,
	HubConnectionState,
	IHttpConnectionOptions,
	LogLevel,
} from "@microsoft/signalr";

// Map of server event names to the tuple of argument types each event emits.
type EventMap = Record<string, unknown[]>;
type EventHandler<TArgs extends unknown[]> = (...args: TArgs) => void;

// Factory options to adapt the client to local/dev/prod environments.
export interface SignalRClientOptions {
	hubUrl?: string;
	getAccessToken?: () => string | Promise<string | null> | null;
	reconnectDelaysMs?: number[];
	logLevel?: LogLevel;
}

// Thin wrapper around HubConnection so the rest of the app uses one consistent API.
export interface SignalRClient<TEvents extends EventMap = EventMap> {
	readonly connection: HubConnection;
	readonly state: HubConnectionState;
	start: () => Promise<void>;
	stop: () => Promise<void>;
	invoke: <TResult = void>(methodName: string, ...args: unknown[]) => Promise<TResult>;
	send: (methodName: string, ...args: unknown[]) => Promise<void>;
	on: <K extends keyof TEvents & string>(
		eventName: K,
		handler: EventHandler<TEvents[K]>
	) => () => void;
	off: <K extends keyof TEvents & string>(
		eventName: K,
		handler?: EventHandler<TEvents[K]>
	) => void;
	onReconnecting: (handler: (error?: Error) => void) => () => void;
	onReconnected: (handler: (connectionId?: string) => void) => () => void;
	onClose: (handler: (error?: Error) => void) => () => void;
}

// Exponential-like retry schedule used by automatic reconnect.
const DEFAULT_RECONNECT_DELAYS_MS = [0, 2_000, 5_000, 10_000, 30_000];

// Resolves hub URL from explicit option first, then env variable, then local fallback.
// IMPORTANT: Backend is mapped to /hubs/project-call.
const resolveHubUrl = (explicitUrl?: string): string => {
	if (explicitUrl) return explicitUrl;

	const envUrl =
		(globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
			?.VITE_SIGNALR_HUB_URL || "";

	if (envUrl) return envUrl;

	return "/hubs/project-call";
};

// Creates a ready-to-use SignalR client with typed event subscriptions.
export const createSignalRClient = <TEvents extends EventMap = EventMap>(
	options: SignalRClientOptions = {}
): SignalRClient<TEvents> => {
	const {
		getAccessToken,
		reconnectDelaysMs = DEFAULT_RECONNECT_DELAYS_MS,
		logLevel = LogLevel.Information,
	} = options;

	const hubUrl = resolveHubUrl(options.hubUrl);

	// accessTokenFactory is called by SignalR when negotiating and reconnecting.
	const connectionOptions: IHttpConnectionOptions = {
		accessTokenFactory: async () => (await getAccessToken?.()) ?? "",
	};

	// Builds the underlying SignalR connection with auth + reconnect + logging settings.
	const connection = new HubConnectionBuilder()
		.withUrl(hubUrl, connectionOptions)
		.withAutomaticReconnect(reconnectDelaysMs)
		.configureLogging(logLevel)
		.build();

	// Stores wrapped callbacks so off(...) can unregister the exact function reference.
	const wrappedHandlers = new Map<string, Map<Function, (...args: unknown[]) => void>>();

	// Subscribes to server events and returns an unsubscribe function for cleanup.
	const on: SignalRClient<TEvents>["on"] = (eventName, handler) => {
		const wrapped = (...args: unknown[]) => handler(...(args as TEvents[typeof eventName]));
		const key = eventName as string;

		if (!wrappedHandlers.has(key)) wrappedHandlers.set(key, new Map());
		wrappedHandlers.get(key)!.set(handler, wrapped);

		connection.on(key, wrapped);
		return () => off(eventName, handler);
	};

	// Removes one handler or all handlers for a given event name.
	const off: SignalRClient<TEvents>["off"] = (eventName, handler) => {
		const key = eventName as string;
		if (!handler) {
			connection.off(key);
			wrappedHandlers.delete(key);
			return;
		}

		const perEvent = wrappedHandlers.get(key);
		const wrapped = perEvent?.get(handler);

		if (wrapped) {
			connection.off(key, wrapped);
			perEvent!.delete(handler);
			if (perEvent!.size === 0) wrappedHandlers.delete(key);
			return;
		}

		connection.off(key, handler as (...args: unknown[]) => void);
	};

	// Idempotent start prevents duplicate start calls while connected/connecting.
	const start = async () => {
		if (connection.state === HubConnectionState.Connected) return;
		if (connection.state === HubConnectionState.Connecting) return;
		await connection.start();
	};

	// Idempotent stop avoids throwing when already disconnected.
	const stop = async () => {
		if (connection.state === HubConnectionState.Disconnected) return;
		await connection.stop();
	};

	// Public wrapper object consumed by hooks/services in the realtime feature.
	return {
		connection,
		get state() {
			return connection.state;
		},
		start,
		stop,
		invoke: <TResult = void>(methodName: string, ...args: unknown[]) =>
			connection.invoke<TResult>(methodName, ...args),
		send: (methodName: string, ...args: unknown[]) => connection.send(methodName, ...args),
		on,
		off,
		onReconnecting: (handler) => {
			connection.onreconnecting(handler);
			return () => connection.onreconnecting(() => undefined);
		},
		onReconnected: (handler) => {
			connection.onreconnected(handler);
			return () => connection.onreconnected(() => undefined);
		},
		onClose: (handler) => {
			connection.onclose(handler);
			return () => connection.onclose(() => undefined);
		},
	};
};
