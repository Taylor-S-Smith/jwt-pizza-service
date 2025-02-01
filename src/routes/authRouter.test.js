const request = require('supertest');
const app = require('../service');

const testUser = { id: '', name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = randomName() + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUser.id = registerRes.body.user.id;
  expectValidJwt(testUserAuthToken);

  if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
  }
});

test('login', async () => {
  const loginRes = await loginTestUser()
  expect(loginRes.status).toBe(200);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('fail to update user', async () => {
  const updateRes = await request(app).put(`/api/auth/${testUser.id}`).send(testUser);
  expect(updateRes.status).toBe(401);
  expect(updateRes.body.message).toBe('unauthorized');
})

test('logout user', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(logoutRes.body.message).toBe('logout successful');

  await loginTestUser();
 })

test('user updates themselves', async () => {
  testUser.email = randomName() + '@test.com';
  testUser.password = randomName();
  const updateRes = await request(app).put(`/api/auth/${testUser.id}`).set('Authorization', `Bearer ${testUserAuthToken}`).send(testUser);
  expect(updateRes.status).toBe(200);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(updateRes.body).toMatchObject(expectedUser);
})

async function loginTestUser() {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  testUserAuthToken = loginRes.body.token;
  expectValidJwt(testUserAuthToken);

  return loginRes;
}

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}