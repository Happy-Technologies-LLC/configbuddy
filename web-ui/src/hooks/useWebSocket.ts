// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * WebSocket Hook
 * Provides real-time updates for AI patterns and discovery sessions
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/utils/logger';

export interface WebSocketMessage {
  type: 'pattern_update' | 'pattern_approved' | 'pattern_learned' | 'session_update' | 'cost_alert';
  data: any;
  timestamp: string;
}

export interface UseWebSocketOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    reconnect = true,
    reconnectInterval = 5000,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    try {
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.REACT_APP_API_HOST || window.location.host.replace(':3001', ':3000');
      const wsUrl = `${protocol}//${host}/ws`;

      logger.info('Connecting to WebSocket', { url: wsUrl });

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        logger.info('WebSocket connected');
        setIsConnected(true);
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          logger.debug('WebSocket message received', { type: message.type });
          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', { error });
        }
      };

      ws.onclose = () => {
        logger.info('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        onDisconnect?.();

        // Attempt reconnection if enabled
        if (reconnect && shouldReconnectRef.current) {
          logger.info(`Reconnecting in ${reconnectInterval}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        logger.error('WebSocket error', { error });
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      logger.error('Failed to create WebSocket connection', { error });
    }
  }, [reconnect, reconnectInterval, onMessage, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    logger.warn('WebSocket not connected, cannot send message');
    return false;
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    send,
    disconnect,
    reconnect: connect,
  };
}

/**
 * Hook for listening to specific WebSocket message types
 */
export function useWebSocketSubscription<T = any>(
  messageType: WebSocketMessage['type'],
  callback: (data: T) => void,
  deps: React.DependencyList = []
) {
  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type === messageType) {
        callback(message.data);
      }
    },
    [messageType, callback, ...deps]
  );

  return useWebSocket({
    onMessage: handleMessage,
  });
}
