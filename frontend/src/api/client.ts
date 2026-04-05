import type {
  CreateGameRequest,
  CreateGameResponse,
  GetGameStateRequest,
  GetGameStateResponse,
  GetLegalActionsRequest,
  GetLegalActionsResponse,
  JoinGameRequest,
  JoinGameResponse,
  PingResponse,
  SetReadyRequest,
  SetReadyResponse,
  SubmitActionRequest,
  SubmitActionResponse,
} from '../types/api';

export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
}

export type ApiErrorType =
  | 'ServerError'
  | 'NotFoundError'
  | 'GameFullError'
  | 'IllegalActionError'
  | 'ValidationException'
  | 'Unknown';

export class ApiError extends Error {
  readonly status: number;
  readonly errorType: ApiErrorType;

  constructor(status: number, message: string, errorType: ApiErrorType) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorType = errorType;
  }
}

function classifyError(status: number): ApiErrorType {
  switch (status) {
    case 400:
      return 'IllegalActionError';
    case 404:
      return 'NotFoundError';
    case 409:
      return 'GameFullError';
    case 500:
      return 'ServerError';
    default:
      return status >= 400 && status < 500
        ? 'ValidationException'
        : 'Unknown';
  }
}

export class MtgApiClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
      this.headers['Authorization'] = `Bearer ${config.apiKey}`;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let message = res.statusText;
      try {
        const err: { message?: string } = await res.json();
        if (err.message) message = err.message;
      } catch {
        // use statusText
      }
      throw new ApiError(res.status, message, classifyError(res.status));
    }

    return res.json() as Promise<T>;
  }

  async ping(): Promise<PingResponse> {
    return this.request('GET', '/ping');
  }

  async createGame(req: CreateGameRequest): Promise<CreateGameResponse> {
    return this.request('POST', '/games', {
      format: req.format,
      playerName: req.playerName,
      decklist: req.decklist,
    });
  }

  async joinGame(req: JoinGameRequest): Promise<JoinGameResponse> {
    return this.request('POST', `/games/${encodeURIComponent(req.gameId)}/join`, {
      playerName: req.playerName,
      decklist: req.decklist,
    });
  }

  async setReady(req: SetReadyRequest): Promise<SetReadyResponse> {
    return this.request('POST', `/games/${encodeURIComponent(req.gameId)}/ready`, {
      playerId: req.playerId,
      ready: req.ready,
    });
  }

  async getGameState(req: GetGameStateRequest): Promise<GetGameStateResponse> {
    const params = new URLSearchParams();
    if (req.perspectivePlayerId) {
      params.set('perspective', req.perspectivePlayerId);
    }
    const qs = params.toString();
    const path = `/games/${encodeURIComponent(req.gameId)}${qs ? `?${qs}` : ''}`;
    return this.request('GET', path);
  }

  async submitAction(req: SubmitActionRequest): Promise<SubmitActionResponse> {
    return this.request(
      'POST',
      `/games/${encodeURIComponent(req.gameId)}/actions`,
      {
        playerId: req.playerId,
        action: req.action,
        holdPriority: req.holdPriority,
      },
    );
  }

  async getLegalActions(
    req: GetLegalActionsRequest,
  ): Promise<GetLegalActionsResponse> {
    const params = new URLSearchParams({ playerId: req.playerId });
    return this.request(
      'GET',
      `/games/${encodeURIComponent(req.gameId)}/legal-actions?${params.toString()}`,
    );
  }
}
