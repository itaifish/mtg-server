import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MtgApiClient, ApiError } from '../client';

function mockFetchOk(body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  } as Response);
}

function mockFetchErr(status: number, body?: { message?: string }) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: false,
    status,
    statusText: 'Error',
    json: body ? () => Promise.resolve(body) : () => Promise.reject(new Error('no json')),
  } as Response);
}

describe('MtgApiClient', () => {
  let client: MtgApiClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new MtgApiClient({ baseUrl: 'http://localhost:13734/' });
  });

  it('strips trailing slash from baseUrl', async () => {
    const spy = mockFetchOk({ status: 'ok' });
    await client.ping();
    expect(spy).toHaveBeenCalledWith('http://localhost:13734/ping', expect.objectContaining({ method: 'GET' }));
  });

  it('sets x-api-key header when apiKey provided', async () => {
    const authed = new MtgApiClient({ baseUrl: 'http://localhost:13734', apiKey: 'secret' });
    const spy = mockFetchOk({ status: 'ok' });
    await authed.ping();
    expect(spy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      headers: expect.objectContaining({ 'x-api-key': 'secret' }),
    }));
  });

  describe('ping', () => {
    it('returns response', async () => {
      mockFetchOk({ status: 'ok' });
      expect(await client.ping()).toEqual({ status: 'ok' });
    });
  });

  describe('createGame', () => {
    it('sends POST with body', async () => {
      const spy = mockFetchOk({ gameId: 'g1', playerId: 'p1' });
      const res = await client.createGame({ format: 'STANDARD', gameName: 'Test Game', playerName: 'Alice', decklist: [{ count: 4, cardName: 'Bolt' }] });
      expect(res.gameId).toBe('g1');
      expect(spy).toHaveBeenCalledWith('http://localhost:13734/games', expect.objectContaining({ method: 'POST' }));
    });
  });

  describe('joinGame', () => {
    it('URL-encodes gameId', async () => {
      const spy = mockFetchOk({ playerId: 'p2' });
      await client.joinGame({ gameId: 'a/b', playerName: 'Bob', decklist: [{ count: 1, cardName: 'X' }] });
      expect(spy).toHaveBeenCalledWith('http://localhost:13734/games/a%2Fb/join', expect.anything());
    });
  });

  describe('setReady', () => {
    it('sends POST', async () => {
      mockFetchOk({ gameId: 'g1', allReady: true, status: 'IN_PROGRESS' });
      const res = await client.setReady({ gameId: 'g1', playerId: 'p1', ready: true });
      expect(res.allReady).toBe(true);
    });
  });

  describe('getGameState', () => {
    it('adds perspective query param', async () => {
      const spy = mockFetchOk({ gameId: 'g1', status: 'IN_PROGRESS', players: [], turnNumber: 1, actionCount: 0 });
      await client.getGameState({ gameId: 'g1', perspectivePlayerId: 'p1' });
      expect(spy).toHaveBeenCalledWith('http://localhost:13734/games/g1?perspective=p1', expect.anything());
    });

    it('omits query param when no perspective', async () => {
      const spy = mockFetchOk({ gameId: 'g1', status: 'IN_PROGRESS', players: [], turnNumber: 1, actionCount: 0 });
      await client.getGameState({ gameId: 'g1' });
      expect(spy).toHaveBeenCalledWith('http://localhost:13734/games/g1', expect.anything());
    });
  });

  describe('submitAction', () => {
    it('sends POST with action body', async () => {
      const spy = mockFetchOk({ gameId: 'g1', actionCount: 6, status: 'IN_PROGRESS' });
      await client.submitAction({ gameId: 'g1', playerId: 'p1', action: { passPriority: {} }, holdPriority: true });
      const body = JSON.parse(spy.mock.calls[0][1]?.body as string);
      expect(body.holdPriority).toBe(true);
    });
  });

  describe('getLegalActions', () => {
    it('sends GET with playerId query param', async () => {
      const spy = mockFetchOk({ gameId: 'g1', actions: [] });
      await client.getLegalActions({ gameId: 'g1', playerId: 'p1' });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('playerId=p1'), expect.anything());
    });
  });

  describe('error handling', () => {
    it('throws ApiError with message from body on 400', async () => {
      mockFetchErr(400, { message: 'Illegal' });
      await expect(client.ping()).rejects.toThrow(ApiError);
      try { await client.ping(); } catch (e) {
        const err = e as ApiError;
        expect(err.status).toBe(400);
        expect(err.message).toBe('Illegal');
        expect(err.errorType).toBe('IllegalActionError');
      }
    });

    it('classifies 404 as NotFoundError', async () => {
      mockFetchErr(404, { message: 'Not found' });
      try { await client.ping(); } catch (e) { expect((e as ApiError).errorType).toBe('NotFoundError'); }
    });

    it('classifies 409 as GameFullError', async () => {
      mockFetchErr(409, { message: 'Full' });
      try { await client.ping(); } catch (e) { expect((e as ApiError).errorType).toBe('GameFullError'); }
    });

    it('classifies 500 as ServerError', async () => {
      mockFetchErr(500, { message: 'Oops' });
      try { await client.ping(); } catch (e) { expect((e as ApiError).errorType).toBe('ServerError'); }
    });

    it('classifies 422 as ValidationException', async () => {
      mockFetchErr(422, { message: 'Invalid' });
      try { await client.ping(); } catch (e) { expect((e as ApiError).errorType).toBe('ValidationException'); }
    });

    it('classifies 502 as Unknown', async () => {
      mockFetchErr(502);
      try { await client.ping(); } catch (e) { expect((e as ApiError).errorType).toBe('Unknown'); }
    });

    it('falls back to statusText when json parse fails', async () => {
      mockFetchErr(500);
      try { await client.ping(); } catch (e) { expect((e as ApiError).message).toBe('Error'); }
    });
  });

  describe('ApiError', () => {
    it('has correct name and properties', () => {
      const err = new ApiError(404, 'Not found', 'NotFoundError');
      expect(err.name).toBe('ApiError');
      expect(err.status).toBe(404);
      expect(err.message).toBe('Not found');
      expect(err.errorType).toBe('NotFoundError');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
