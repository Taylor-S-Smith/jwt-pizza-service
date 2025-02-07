const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let adminUser = {};
let adminUserAuthToken;

beforeAll(async () => {
  adminUser = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send(adminUser);
  adminUserAuthToken = loginRes.body.token;
  expectValidJwt(adminUserAuthToken);

  if (process.env.VSCODE_INSPECTOR_OPTIONS) {
    jest.setTimeout(60 * 1000 * 5); // 5 minutes
  }
});

test('get all franchises', async () => {
    let franchise1 = await createFranchise();
    let franchise2 = await createFranchise();
    delete franchise1.admins;
    delete franchise2.admins;

    const getAllRes = await request(app).get('/api/franchise');

    expect(getAllRes.status).toBe(200);
    expect(getAllRes.body).toEqual(expect.arrayContaining([franchise1, franchise2]));

    await DB.deleteFranchise(franchise1.id);
    await DB.deleteFranchise(franchise2.id);
})

test("get user's franchises", async () => {
    let franchise1 = await createFranchise();
    let franchise2 = await createFranchise();
    delete franchise1.admins[0].password;
    delete franchise1.admins[0].roles;
    delete franchise2.admins[0].password;
    delete franchise2.admins[0].roles;

    const getAllRes = await request(app).get(`/api/franchise/${adminUser.id}`).set('Authorization', `Bearer ${adminUserAuthToken}`);

    expect(getAllRes.status).toBe(200);
    expect(getAllRes.body).toEqual(expect.arrayContaining([franchise1, franchise2]));

    await DB.deleteFranchise(franchise1.id);
    await DB.deleteFranchise(franchise2.id);
})

test('Create a new franchise', async () => {
    const franchise = randomFranchise();
    const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminUserAuthToken}`).send(franchise);
    expect(createRes.status).toBe(200);

    franchise.id = createRes.body.id;
    expect(createRes.body).toMatchObject(franchise);

    await DB.deleteFranchise(franchise.id);
})

test('delete franchises', async () => {
    let franchise1 = await createFranchise();
    let franchise2 = await createFranchise();
    delete franchise2.admins;

    const deleteRes = await request(app).delete(`/api/franchise/${franchise1.id}`).set('Authorization', `Bearer ${adminUserAuthToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toBe("franchise deleted");

    const getAllRes = await request(app).get('/api/franchise');
    expect(getAllRes.body).toEqual(expect.arrayContaining([franchise2]));

    await DB.deleteFranchise(franchise2.id);
})


afterAll(async () => {
    const franchises = await DB.getFranchises();
    for (const index in franchises) {
        const id = franchises[index].id;
        await DB.deleteFranchise(id);
    }
});


async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
}

async function createFranchise() {
    const franchise = randomFranchise();

    return await DB.createFranchise(franchise);
} 

function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}
  
function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

function randomFranchise() {
    return {
        name: randomName(), 
        admins: [ adminUser ], 
        stores: [] 
    }
} 
