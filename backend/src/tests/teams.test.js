import request from 'supertest';
import { createApp } from '../app.js';
import { TeamMember } from '../models/index.js';
import { resetDatabase, closeDatabase, mockPokeApi } from './helpers.js';

const app = createApp();

const POKEMONS = [
  { id: 1, name: 'bulbasaur' },
  { id: 4, name: 'charmander' },
  { id: 6, name: 'charizard' },
  { id: 7, name: 'squirtle' },
  { id: 25, name: 'pikachu' },
  { id: 39, name: 'jigglypuff' },
  { id: 143, name: 'snorlax' },
];

async function authToken(email = 'teams@axiosmobile.mx') {
  const res = await request(app).post('/api/auth/register').send({
    email,
    name: 'Teams Tester',
    password: 'secret123',
  });
  return res.body.token;
}

function createTeam(token, body) {
  return request(app).post('/api/teams').set('Authorization', `Bearer ${token}`).send(body);
}

function listTeams(token) {
  return request(app).get('/api/teams').set('Authorization', `Bearer ${token}`);
}

beforeEach(async () => {
  await resetDatabase();
  mockPokeApi(POKEMONS);
});

afterAll(async () => {
  await closeDatabase();
});

describe('Equipos (Teams)', () => {
  test('crea un equipo validado contra PokeAPI con nombres canónicos', async () => {
    const token = await authToken();
    const res = await createTeam(token, { name: '  Kanto  ', pokemon: ['Pikachu', 6] });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Kanto');
    expect(res.body.members.map((m) => [m.pokemonId, m.pokemonName])).toEqual([
      [25, 'pikachu'],
      [6, 'charizard'],
    ]);
  });

  test('rechaza el 7º miembro con 422 y no crea nada', async () => {
    const token = await authToken();
    const res = await createTeam(token, {
      name: 'Demasiados',
      pokemon: POKEMONS.map((p) => p.name),
    });

    expect(res.status).toBe(422);
    const list = await listTeams(token);
    expect(list.body.data).toHaveLength(0);
  });

  test('valida la cantidad de miembros antes de consultar la PokeAPI', async () => {
    const token = await authToken();
    const mockedFetch = global.fetch;
    let pokeApiCalls = 0;
    global.fetch = (...args) => {
      pokeApiCalls += 1;
      return mockedFetch(...args);
    };

    // Nombres inexistentes: los 404 no se cachean, así que cualquier consulta llegaría a fetch.
    const res = await createTeam(token, {
      name: 'Demasiados',
      pokemon: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7'],
    });

    expect(res.status).toBe(422);
    expect(pokeApiCalls).toBe(0);
  });

  test('rechaza un equipo vacío con 422', async () => {
    const token = await authToken();
    const res = await createTeam(token, { name: 'Vacío', pokemon: [] });

    expect(res.status).toBe(422);
  });

  test('rechaza un pokémon inexistente con 422', async () => {
    const token = await authToken();
    const res = await createTeam(token, { name: 'Fantasma', pokemon: ['pikachu', 'noexiste'] });

    expect(res.status).toBe(422);
    const list = await listTeams(token);
    expect(list.body.data).toHaveLength(0);
  });

  test('responde 502 si la PokeAPI no está disponible', async () => {
    const token = await authToken();
    global.fetch = async () => {
      throw new Error('network down');
    };

    // 'ditto' no se usa en otros tests, así que no está en la caché del servicio.
    const res = await createTeam(token, { name: 'Sin red', pokemon: ['ditto'] });

    expect(res.status).toBe(502);
  });

  test('rechaza el mismo pokémon repetido (por nombre e id) con 409', async () => {
    const token = await authToken();
    const res = await createTeam(token, { name: 'Clones', pokemon: ['pikachu', 25] });

    expect(res.status).toBe(409);
  });

  test.each([
    ['sin name', { pokemon: ['pikachu'] }],
    ['pokemon no es arreglo', { name: 'X', pokemon: 'pikachu' }],
    ['elemento inválido', { name: 'X', pokemon: ['pikachu', -1] }],
  ])('responde 400 ante cuerpo mal formado (%s)', async (_caso, body) => {
    const token = await authToken();
    const res = await createTeam(token, body);

    expect(res.status).toBe(400);
  });

  test('responde 400 ante JSON con sintaxis inválida', async () => {
    const token = await authToken();
    const res = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send('{bad json');

    expect(res.status).toBe(400);
  });

  test('un usuario no ve ni puede borrar equipos ajenos (404)', async () => {
    const ownerToken = await authToken('owner@axiosmobile.mx');
    const otherToken = await authToken('other@axiosmobile.mx');
    const created = await createTeam(ownerToken, { name: 'Mío', pokemon: ['snorlax'] });

    const otherList = await listTeams(otherToken);
    expect(otherList.body.data).toHaveLength(0);

    const del = await request(app)
      .delete(`/api/teams/${created.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(del.status).toBe(404);

    const ownerList = await listTeams(ownerToken);
    expect(ownerList.body.data).toHaveLength(1);
  });

  test('lista y elimina los equipos del propio usuario', async () => {
    const token = await authToken();
    const created = await createTeam(token, {
      name: 'Iniciales',
      pokemon: ['bulbasaur', 'charmander', 'squirtle'],
    });

    const list = await listTeams(token);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].members).toHaveLength(3);

    const del = await request(app)
      .delete(`/api/teams/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const after = await listTeams(token);
    expect(after.body.data).toHaveLength(0);
    // La cascada borra también los miembros.
    expect(await TeamMember.count()).toBe(0);
  });

  test('responde 404 ante ids no enteros sin borrar nada', async () => {
    const token = await authToken();
    const created = await createTeam(token, { name: 'Uno', pokemon: ['pikachu'] });
    expect(created.body.id).toBe(1);

    for (const id of ['1.0', '1abc', 'abc']) {
      const del = await request(app)
        .delete(`/api/teams/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(del.status).toBe(404);
    }

    const list = await listTeams(token);
    expect(list.body.data).toHaveLength(1);
  });
});
