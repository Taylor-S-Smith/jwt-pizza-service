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


test('add item to menu', async () => {
    let item = await randomItem();

    const addRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminUserAuthToken}`).send(item);
    expect(addRes.status).toBe(200);

    const matchingObjects = addRes.body.filter( x => 
        x.description === item.description &&
        x.image === item.image &&
        x.price === item.price &&
        x.title === item.title
    )
    expect(matchingObjects.length).toBe(1);
})


async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
  
    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
}

function expectValidJwt(potentialJwt) {
    expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}
  
function randomName() {
    return Math.random().toString(36).substring(2, 12);
}

function randomFloat() {
    return Math.round(Math.random() * 100) / 100;
}

function randomItem() {
    return {
        title: randomName(), 
        description: randomName(), 
        image: randomName(),
        price: randomFloat()
    }
} 
