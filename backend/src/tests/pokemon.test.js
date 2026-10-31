import request from 'supertest';
import { createApp } from '../app.js';
import { resetDatabase, closeDatabase, mockPokeApi } from './helpers.js';

const app = createApp();

const POKEMONS = [
  { id: 1, name: 'bulbasaur', sprite: 'bulba.png', types: ['grass', 'poison'] },
  { id: 4, name: 'charmander', sprite: 'char.png', types: ['fire'] },
];

async function authToken() {
  const res = await request(app).post('/api/auth/register').send({
    email: 'pokedex@axiosmobile.mx',
    name: 'Pokedex Tester',
    password: 'secret123',
  });
  return res.body.token;
}

beforeEach(async () => {
  await resetDatabase();
  mockPokeApi(POKEMONS);
});

afterAll(async () => {
  await closeDatabase();
});

describe('Listado de pokémon', () => {
  test('sin details devuelve el listado original (retrocompatible)', async () => {
    const token = await authToken();
    const res = await request(app)
      .get('/api/pokemon?limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.results[0]).toEqual({ name: 'bulbasaur', url: 'mock://pokemon/1' });
  });

  test('con details=true devuelve id, nombre, foto y tipos', async () => {
    const token = await authToken();
    const res = await request(app)
      .get('/api/pokemon?limit=2&offset=0&details=true')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.results).toEqual([
      { id: 1, name: 'bulbasaur', sprite: 'bulba.png', types: ['grass', 'poison'] },
      { id: 4, name: 'charmander', sprite: 'char.png', types: ['fire'] },
    ]);
  });
});
