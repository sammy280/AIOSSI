const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ===== USERS =====
  const adminPassword = await bcrypt.hash('Admin@1234', 12);
  const managerPassword = await bcrypt.hash('Manager@1234', 12);
  const cashierPassword = await bcrypt.hash('Cashier@1234', 12);
  // Each PIN-login user gets their OWN unique PIN
  const yvonePin    = await bcrypt.hash('1111', 12);
  const denisePin   = await bcrypt.hash('2222', 12);
  const ladoucePin  = await bcrypt.hash('3333', 12);
  const poulletPin  = await bcrypt.hash('4444', 12);
  const cleverPin   = await bcrypt.hash('5555', 12);
  const umunuPin    = await bcrypt.hash('6666', 12);
  const umunPin     = await bcrypt.hash('7777', 12);
  const safiBarPin  = await bcrypt.hash('8888', 12);
  const patrickBarPin = await bcrypt.hash('9999', 12);

  // Admin 1 - Mory Kaba
  const mory = await prisma.user.upsert({
    where: { email: 'mory@mistral.rw' },
    update: {},
    create: {
      email: 'mory@mistral.rw', passwordHash: adminPassword, name: 'Mory Kaba',
      role: 'ADMIN', loginType: 'EMAIL_PASSWORD',
      profile: { create: { employmentDate: new Date('2020-01-01'), phone: '+250780000001', address: 'Kigali, Rwanda' } },
    },
  });

  // Admin 2 - Nestor
  const nestor = await prisma.user.upsert({
    where: { email: 'nestor@mistral.rw' },
    update: {},
    create: {
      email: 'nestor@mistral.rw', passwordHash: adminPassword, name: 'Nestor',
      role: 'ADMIN', loginType: 'EMAIL_PASSWORD',
      profile: { create: { employmentDate: new Date('2020-01-01'), phone: '+250780000002', address: 'Kigali, Rwanda' } },
    },
  });

  // Manager - Christian
  const christian = await prisma.user.upsert({
    where: { email: 'christian@mistral.rw' },
    update: {},
    create: {
      email: 'christian@mistral.rw', passwordHash: managerPassword, name: 'Christian',
      role: 'MANAGER', loginType: 'EMAIL_PASSWORD',
      profile: { create: { employmentDate: new Date('2021-03-01'), phone: '+250780000003', address: 'Kigali, Rwanda' } },
    },
  });

  // Cashier 1 - Safi
  const safiCashier = await prisma.user.upsert({
    where: { email: 'safi.cashier@mistral.rw' },
    update: {},
    create: {
      email: 'safi.cashier@mistral.rw', passwordHash: cashierPassword, name: 'Safi',
      role: 'CASHIER', loginType: 'EMAIL_PASSWORD',
      profile: { create: { employmentDate: new Date('2022-01-10'), phone: '+250780000004', address: 'Kigali, Rwanda' } },
    },
  });

  // Cashier 2 - Patrick
  const patrickCashier = await prisma.user.upsert({
    where: { email: 'patrick.cashier@sammy.rw' },
    update: {},
    create: {
      email: 'patrick.cashier@sammy.rw', passwordHash: cashierPassword, name: 'Patrick',
      role: 'CASHIER', loginType: 'EMAIL_PASSWORD',
      profile: { create: { employmentDate: new Date('2022-02-15'), phone: '+250780000005', address: 'Kigali, Rwanda' } },
    },
  });

  // Bar Staff - Safi (Barman 1 - PIN login)
  const safiBar = await prisma.user.upsert({
    where: { email: 'safi.bar@sammy.rw' },
    update: {},
    create: {
      email: 'safi.bar@sammy.rw', pin: safiBarPin, name: 'Safi (Bar)',
      role: 'BAR', loginType: 'PIN',
      profile: { create: { employmentDate: new Date('2022-06-01'), phone: '+250780000006', address: 'Kigali, Rwanda' } },
    },
  });

  // Bar Staff - Patrick (Barman 2 - PIN login)
  const patrickBar = await prisma.user.upsert({
    where: { email: 'patrick.bar@sammy.rw' },
    update: {},
    create: {
      email: 'patrick.bar@sammy.rw', pin: patrickBarPin, name: 'Patrick (Bar)',
      role: 'BAR', loginType: 'PIN',
      profile: { create: { employmentDate: new Date('2022-06-15'), phone: '+250780000007', address: 'Kigali, Rwanda' } },
    },
  });

  // Kitchen - Clever (Head Chef)
  const clever = await prisma.user.upsert({
    where: { email: 'clever@sammy.rw' },
    update: {},
    create: {
      email: 'clever@sammy.rw', pin: cleverPin, name: 'Clever',
      role: 'KITCHEN', loginType: 'PIN',
      profile: { create: { employmentDate: new Date('2021-07-01'), phone: '+250780000008', address: 'Kigali, Rwanda' } },
    },
  });

  // Kitchen - Umunu
  const umunu = await prisma.user.upsert({
    where: { email: 'umunu@sammy.rw' },
    update: {},
    create: {
      email: 'umunu@sammy.rw', pin: umunuPin, name: 'Umunu',
      role: 'KITCHEN', loginType: 'PIN',
      profile: { create: { employmentDate: new Date('2022-03-01'), phone: '+250780000009', address: 'Kigali, Rwanda' } },
    },
  });

  // Kitchen - Umun
  const umun = await prisma.user.upsert({
    where: { email: 'umun@sammy.rw' },
    update: {},
    create: {
      email: 'umun@sammy.rw', pin: umunPin, name: 'Umun',
      role: 'KITCHEN', loginType: 'PIN',
      profile: { create: { employmentDate: new Date('2022-04-01'), phone: '+250780000010', address: 'Kigali, Rwanda' } },
    },
  });

  // Waiters (PIN login)
  const yvone = await prisma.user.upsert({
    where: { email: 'yvone@sammy.rw' },
    update: {},
    create: {
      email: 'yvone@sammy.rw', pin: yvonePin, name: 'Yvone',
      role: 'WAITER', loginType: 'PIN',
      profile: { create: { employmentDate: new Date('2022-01-05'), phone: '+250780000011', address: 'Kigali, Rwanda' } },
    },
  });

  const denise = await prisma.user.upsert({
    where: { email: 'denise@sammy.rw' },
    update: {},
    create: {
      email: 'denise@sammy.rw', pin: denisePin, name: 'Denise',
      role: 'WAITER', loginType: 'PIN',
      profile: { create: { employmentDate: new Date('2022-02-10'), phone: '+250780000012', address: 'Kigali, Rwanda' } },
    },
  });

  const ladouce = await prisma.user.upsert({
    where: { email: 'ladouce@sammy.rw' },
    update: {},
    create: {
      email: 'ladouce@sammy.rw', pin: ladoucePin, name: 'Ladouce',
      role: 'WAITER', loginType: 'PIN',
      profile: { create: { employmentDate: new Date('2022-05-01'), phone: '+250780000013', address: 'Kigali, Rwanda' } },
    },
  });

  const poullet = await prisma.user.upsert({
    where: { email: 'poullet@sammy.rw' },
    update: {},
    create: {
      email: 'poullet@sammy.rw', pin: poulletPin, name: 'Poullet',
      role: 'WAITER', loginType: 'PIN',
      profile: { create: { employmentDate: new Date('2023-01-10'), phone: '+250780000014', address: 'Kigali, Rwanda' } },
    },
  });

  console.log('✅ Users created');

  // ===== CATEGORIES =====
  const foodCategories = [
    { name: 'BBQ', type: 'FOOD', icon: '🔥' },
    { name: 'Boiled', type: 'FOOD', icon: '🫕' },
    { name: 'Fast Food', type: 'FOOD', icon: '🍟' },
    { name: 'Specialite', type: 'FOOD', icon: '⭐' },
    { name: 'Starter', type: 'FOOD', icon: '🥙' },
    { name: 'Salad', type: 'FOOD', icon: '🥗' },
    { name: 'Bites', type: 'FOOD', icon: '🍡' },
    { name: 'Burgers', type: 'FOOD', icon: '🍔' },
    { name: 'Omelette', type: 'FOOD', icon: '🍳' },
    { name: 'Sides', type: 'FOOD', icon: '🍟' },
    { name: 'Pizza', type: 'FOOD', icon: '🍕' },
    { name: 'Pasta', type: 'FOOD', icon: '🍝' },
    { name: 'Dessert', type: 'FOOD', icon: '🍰' },
  ];

  const drinkCategories = [
    { name: 'Soft Drinks', type: 'DRINK', icon: '🥤' },
    { name: 'Beers', type: 'DRINK', icon: '🍺' },
    { name: 'Cognac', type: 'DRINK', icon: '🥃' },
    { name: 'Wines', type: 'DRINK', icon: '🍷' },
    { name: 'Cocktails', type: 'DRINK', icon: '🍹' },
    { name: 'Mocktails', type: 'DRINK', icon: '🍓' },
    { name: 'Rums', type: 'DRINK', icon: '🫙' },
    { name: 'Champagne', type: 'DRINK', icon: '🥂' },
    { name: 'Smoothies', type: 'DRINK', icon: '🥤' },
    { name: 'Tequila', type: 'DRINK', icon: '🌵' },
    { name: 'Juice', type: 'DRINK', icon: '🧃' },
    { name: 'Gins', type: 'DRINK', icon: '🍸' },
    { name: 'Hot Tea', type: 'DRINK', icon: '🍵' },
    { name: 'Coffee', type: 'DRINK', icon: '☕' },
  ];

  const cats = {};
  for (const cat of [...foodCategories, ...drinkCategories]) {
    const c = await prisma.category.upsert({ where: { name: cat.name }, update: {}, create: cat });
    cats[cat.name] = c.id;
  }
  console.log('✅ Categories created');

  // ===== PRODUCTS =====
  const products = [
    // FOOD
    { name: 'Banana', price: 1000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20, description: 'grilled banana' },
    { name: 'Beef Brochette', price: 2500, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20, description: 'Charcoal grilled brochette with BBQ sauce' },
    { name: 'Beef Steak', price: 10000, categoryId: cats['BBQ'], preparationTime: 25, description: 'STEAK' },
    { name: 'Breast chicken grilled', price: 8000, categoryId: cats['BBQ'], preparationTime: 22 },
    { name: 'Brochette goat', price: 2500, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Brochette inkoro', price: 2500, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Buffet ordinaire', price: 5000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Chicken rice', price: 27000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Chicken brochette', price: 4000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Fish brochette', price: 4000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Whole chicken(inzungu)', price: 22000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'HALF chicken', price: 13000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'HALF PORK', price: 6000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Impyiko', price: 2500, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Liver brochette', price: 2500, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'HALF chicken', price: 13000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Nyama choma Ribs(full)', price: 22000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Nyama choma Ribs(half)', price: 13000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Pork KG', price: 1000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Sizzling Pork', price: 14000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Pork with cheese', price: 8000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Potato', price: 1500, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Sousage brochette', price: 3500, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Ururimi', price: 3500, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },  
    { name: 'Whole fish ', price: 13000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Whole chicken(inyarwanda)', price: 22000, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 },
    { name: 'Zingaro', price: 3500, categoryId: cats['BBQ'], isFeatured: true, preparationTime: 20 }, 
    { name: 'Zngalo Agatogo', price: 7500, categoryId: cats['Boiled'], preparationTime: 20 },
    { name: 'Beef pilao', price: 25000, categoryId: cats['Boiled'], preparationTime: 20 },
    { name: 'Beef Boil', price: 7000, categoryId: cats['Boiled'], preparationTime: 20 },
    { name: 'Whole Chicken(igisafuriya)', price: 28000, categoryId: cats['Boiled'], preparationTime: 20 }, 
    { name: 'Half Chicken(igisafuriya)', price: 18000, categoryId: cats['Boiled'], preparationTime: 20 },
    { name: 'Chicken wings', price: 9000, categoryId: cats['Fast Food'], preparationTime: 10 },
    { name: 'Fish fillet', price: 10000, categoryId: cats['Fast Food'], preparationTime: 12 },
    { name: 'Traditional Stew', price: 9000, categoryId: cats['Fast Food'], preparationTime: 12 },
    { name: 'Chicken Leg', price: 10000, categoryId: cats['Fast Food'], preparationTime: 12 },
    { name: 'Chicken Breast', price: 10000, categoryId: cats['Fast Food'], preparationTime: 12 },
    { name: 'Chicken Salad', price: 9000, categoryId: cats['Fast Food'], preparationTime: 12 }, 
    { name: 'Chicken Straganoff', price: 9000, categoryId: cats['Fast Food'], preparationTime: 12 }, 
    { name: 'Chicken Sizzling', price: 12000, categoryId: cats['Fast Food'], preparationTime: 12 },
    { name: 'Chicken Masala', price: 9000, categoryId: cats['Fast Food'], preparationTime: 12 },
    { name: 'Chicken Wrap', price: 9000, categoryId: cats['Fast Food'], preparationTime: 12 },
    { name: 'Lolex', price: 9000, categoryId: cats['Fast Food'], preparationTime: 12 },
    { name: 'Beef wrap', price: 8000, categoryId: cats['Fast Food'], preparationTime: 12 }, 
    { name: 'Black pepper beef stir fly', price: 9000, categoryId: cats['Fast Food'], preparationTime: 12 },
    { name: 'Beef potato and cheese', price: 9000, categoryId: cats['Fast Food'], preparationTime: 12 },
    { name: 'Sammy Burger', price: 4500, categoryId: cats['Burgers'], isFeatured: true, preparationTime: 15, description: 'House signature burger' },
    { name: 'Beef Burger', price: 8000, categoryId: cats['Burgers'], preparationTime: 15 },
    { name: 'Beef cheese Burger', price: 9000, categoryId: cats['Burgers'], preparationTime: 15 },
    { name: 'FISH Burger', price: 9000, categoryId: cats['Burgers'], preparationTime: 15 },
    { name: 'Chicken Burger', price: 9000, categoryId: cats['Burgers'], preparationTime: 14 },
    { name: 'Chicken CHEESE Burger', price: 10000, categoryId: cats['Burgers'], preparationTime: 14 },
    { name: 'Club sandwich', price: 9000, categoryId: cats['Burgers'], preparationTime: 15 },
    { name: 'Beef and cheese sandwich', price: 9000, categoryId: cats['Burgers'], preparationTime: 15 },
    { name: 'Veggie Burger', price: 6000, categoryId: cats['Burgers'], preparationTime: 12 },
    { name: 'Imizuzu', price: 3500, categoryId: cats['Specialite'], isFeatured: true, preparationTime: 25, description: 'Chef\'s daily special creation' },
    { name: 'Grilled whole tilapia fish', price: 20000, categoryId: cats['Specialite'], preparationTime: 22 },
    { name: 'Nyama platter', price: 45000, categoryId: cats['Specialite'], preparationTime: 22 },
    { name: 'Nyama platter HALF', price: 23000, categoryId: cats['Specialite'], preparationTime: 22 },
    { name: 'Mushroom soup', price: 6000, categoryId: cats['Starter'], preparationTime: 10 },
    { name: 'Chicken soup', price: 7000, categoryId: cats['Starter'], preparationTime: 10 },
    { name: 'Vegetable soup', price: 6000, categoryId: cats['Starter'], preparationTime: 10 },
    { name: 'Fish soup', price: 7000, categoryId: cats['Starter'], preparationTime: 10 }, 
    { name: 'Gacumbali', price: 4000, categoryId: cats['Salad'], preparationTime: 8 },
    { name: 'Tuna Salad', price: 8000, categoryId: cats['Salad'], preparationTime: 5 },
    { name: 'Avocado with vinaigrette', price: 4000, categoryId: cats['Salad'], preparationTime: 5 },
    { name: 'Garden Salad', price: 6000, categoryId: cats['Salad'], preparationTime: 5 },
    { name: 'Chill beef chips', price: 9000, categoryId: cats['Bites'], preparationTime: 12 },
    { name: 'Buffalo Chicken wings and chips', price: 8000, categoryId: cats['Bites'], preparationTime: 12 },
    { name: 'Meatball served with chips', price: 7000, categoryId: cats['Bites'], preparationTime: 12 },
    { name: 'Fish fingers and chips', price: 9000, categoryId: cats['Bites'], preparationTime: 12 },
    { name: 'Plain Omelette', price: 4000, categoryId: cats['Omelette'], preparationTime: 8 },
    { name: 'Special Omelette', price: 7000, categoryId: cats['Omelette'], preparationTime: 10 },
    { name: 'Spanish Omelette', price: 5000, categoryId: cats['Omelette'], preparationTime: 10 },
    { name: 'Vegetable Omelette', price: 3000, categoryId: cats['Omelette'], preparationTime: 10 },
    { name: 'Scrambre eggs', price: 4000, categoryId: cats['Omelette'], preparationTime: 10 },
    { name: 'Eggs Fried Rice', price: 5000, categoryId: cats['Sides'], preparationTime: 10 },
    { name: 'Fried Rice', price: 3000, categoryId: cats['Sides'], preparationTime: 10 },
    { name: 'Ugali', price: 3000, categoryId: cats['Sides'], preparationTime: 10 },
    { name: 'Chips', price: 3000, categoryId: cats['Sides'], preparationTime: 10 },
    { name: 'Kaunga', price: 2500, categoryId: cats['Sides'], preparationTime: 10 },
    { name: 'Pomme saute', price: 3500, categoryId: cats['Sides'], preparationTime: 10 },
    { name: 'White rice', price: 3000, categoryId: cats['Sides'], preparationTime: 8 },
    { name: 'Take away', price: 1500, categoryId: cats['Sides'], preparationTime: 10 },
    { name: 'Chapati', price: 1000, categoryId: cats['Sides'], preparationTime: 10 },
    { name: 'Samosa', price: 2000, categoryId: cats['Sides'], preparationTime: 10 },
    { name: 'Margherita Pizza', price: 7000, categoryId: cats['Pizza'], isFeatured: true, preparationTime: 20 },
    { name: 'vegetables Pizza', price: 7000, categoryId: cats['Pizza'], preparationTime: 20 },
    { name: 'Chicken Pizza', price: 10000, categoryId: cats['Pizza'], preparationTime: 20 },
    { name: 'Four season Pizza', price: 10000, categoryId: cats['Pizza'], preparationTime: 20 },
    { name: 'Ground beef Pizza', price: 9000, categoryId: cats['Pizza'], preparationTime: 20 },
    { name: 'Spaghetti Bolognese', price: 5000, categoryId: cats['Pasta'], preparationTime: 18 },
    { name: 'Le mistral special Pizza', price: 12000, categoryId: cats['Pizza'], preparationTime: 20 },
    { name: 'Pasta Carbonara', price: 8500, categoryId: cats['Pasta'], preparationTime: 18 },
    { name: 'Spaghetti bolognaise', price: 9000, categoryId: cats['Pasta'], preparationTime: 18 },
    { name: 'Napolitano', price: 7000, categoryId: cats['Pasta'], preparationTime: 18 },
    { name: 'Chicken Alfredo Pasta ', price: 9000, categoryId: cats['Pasta'], preparationTime: 18 },
    { name: 'Cream mushroom sauce Pasta ', price: 8000, categoryId: cats['Pasta'], preparationTime: 18 },
    { name: 'Ham and cheese Pasta', price: 8000, categoryId: cats['Pasta'], preparationTime: 18 },
    { name: 'Fruit platter', price: 8000, categoryId: cats['Dessert'], preparationTime: 5 },
    { name: 'Fruit', price: 7000, categoryId: cats['Dessert'], preparationTime: 5 },
    { name: 'Crèpe  suzette', price: 5000, categoryId: cats['Dessert'], preparationTime: 5 },
    // DRINKS
    { name: 'Coca Cola', price: 1500, categoryId: cats['Soft Drinks'], preparationTime: 1 },
    { name: 'Panash', price: 1500, categoryId: cats['Soft Drinks'], preparationTime: 1 },
    { name: 'Water', price: 1500, categoryId: cats['Soft Drinks'], preparationTime: 1 },
    { name: 'Still Water', price: 500, categoryId: cats['Soft Drinks'], preparationTime: 1 },
    { name: 'Sparkling Water', price: 1000, categoryId: cats['Soft Drinks'], preparationTime: 1 },
    { name: 'Primus Beer', price: 2000, categoryId: cats['Beers'], preparationTime: 2 },
    { name: 'Mutzig Beer', price: 2000, categoryId: cats['Beers'], preparationTime: 2 },
    { name: 'Amster Beer', price: 2000, categoryId: cats['Beers'], preparationTime: 2 },
    { name: 'Heineken', price: 2500, categoryId: cats['Beers'], preparationTime: 2 },
    { name: 'Skol malt', price: 2000, categoryId: cats['Beers'], preparationTime: 2 },
    { name: 'Skol lager', price: 2500, categoryId: cats['Beers'], preparationTime: 2 },
    { name: 'Virunga gold', price: 2000, categoryId: cats['Beers'], preparationTime: 2 },
    { name: 'Virunga mist', price: 2000, categoryId: cats['Beers'], preparationTime: 2 },
    { name: 'Virunga silva', price: 2000, categoryId: cats['Beers'], preparationTime: 2 },
    { name: 'Tusker malt', price: 3000, categoryId: cats['Beers'], preparationTime: 2 }, 
    { name: 'Tusker lager', price: 3000, categoryId: cats['Beers'], preparationTime: 2 },
    { name: 'Smirnoff ice', price: 3500, categoryId: cats['Beers'], preparationTime: 2 },
    { name: 'Guiness', price: 3500, categoryId: cats['Beers'], preparationTime: 2 },
    { name: 'Hennessy VS', price: 150000, categoryId: cats['Cognac'], isFeatured: true, preparationTime: 2, description: 'BOTTLE' },
    { name: 'Hennessy VSOP', price: 250000, categoryId: cats['Cognac'], preparationTime: 2, description: 'BOTTLE' },
    { name: 'Four cousin', price: 30000, categoryId: cats['Wines'], preparationTime: 2, description: 'BOTTLE' },
    { name: 'Pintanegra', price: 40000, categoryId: cats['Wines'], preparationTime: 2, description: 'BOTTLE' },
    { name: 'Baron darignac', price: 35000, categoryId: cats['Wines'], preparationTime: 2, description: 'BOTTLE' },
    { name: 'House wine dry/sweet', price: 5000, categoryId: cats['Wines'], preparationTime: 2, description: 'glass' },
    { name: 'House White Wine', price: 5000, categoryId: cats['Wines'], preparationTime: 2 },
    { name: 'Rosé Wine', price: 3500, categoryId: cats['Wines'], preparationTime: 2 },
    { name: 'Mojito', price: 8000, categoryId: cats['Cocktails'], isFeatured: true, preparationTime: 5 },
    { name: 'Margarita', price: 4000, categoryId: cats['Cocktails'], preparationTime: 5 },
    { name: 'Long Island Iced Tea', price: 5000, categoryId: cats['Cocktails'], preparationTime: 5 },
    { name: 'Virgin Mojito', price: 2500, categoryId: cats['Mocktails'], preparationTime: 5 },
    { name: 'Fruit Punch', price: 2000, categoryId: cats['Mocktails'], preparationTime: 5 },
    { name: 'Captain Morgan', price: 3500, categoryId: cats['Rums'], preparationTime: 2, description: '50ml' },
    { name: 'Bacardi White', price: 3000, categoryId: cats['Rums'], preparationTime: 2, description: '50ml' },
    { name: 'Moët', price: 160000, categoryId: cats['Champagne'], preparationTime: 2, description: 'Per bottle' },
    { name: 'Veuve cliquot', price: 180000, categoryId: cats['Champagne'], preparationTime: 2, description: 'Per bottle' },
    { name: 'Leurent pierre', price: 200000, categoryId: cats['Champagne'], preparationTime: 2, description: 'Per bottle' },
    { name: 'Mango Smoothie', price: 2500, categoryId: cats['Smoothies'], preparationTime: 5 },
    { name: 'Strawberry Smoothie', price: 2500, categoryId: cats['Smoothies'], preparationTime: 5 },
    { name: 'Jose Cuervo', price: 3500, categoryId: cats['Tequila'], preparationTime: 2, description: '50ml' },
    { name: 'Fresh Orange Juice', price: 1500, categoryId: cats['Juice'], preparationTime: 5 },
    { name: 'Mango Juice', price: 5000, categoryId: cats['Juice'], preparationTime: 5 }, 
    { name: 'Lemon juice', price: 4000, categoryId: cats['Juice'], preparationTime: 5 },
    { name: 'Passion Fruit Juice', price: 5000, categoryId: cats['Juice'], preparationTime: 5 },
    { name: 'Gin & Tonic', price: 3500, categoryId: cats['Gins'], preparationTime: 3 },
    { name: 'Gordon\'s Gin', price: 3000, categoryId: cats['Gins'], preparationTime: 2, description: '50ml' },
    { name: 'Green Tea', price: 1000, categoryId: cats['Hot Tea'], preparationTime: 3 },
    { name: 'African Tea', price: 3500, categoryId: cats['Hot Tea'], preparationTime: 3 },
    { name: 'Spice tea', price: 4000, categoryId: cats['Hot Tea'], preparationTime: 5 },
    { name: 'Ginger tea', price: 3000, categoryId: cats['Hot Tea'], preparationTime: 5 },
    { name: 'Lemon tea', price: 4000, categoryId: cats['Hot Tea'], preparationTime: 5 },
    { name: 'African coffe', price: 4000, categoryId: cats['Hot Tea'], preparationTime: 5 },
    { name: 'Black coffe', price: 4000, categoryId: cats['Hot Tea'], preparationTime: 5 },
    { name: 'Regulaar coffe', price: 4000, categoryId: cats['Hot Tea'], preparationTime: 5 },
    { name: 'Espresso', price: 4000, categoryId: cats['Coffee'], preparationTime: 5 },
    { name: 'Cappuccino', price: 3500, categoryId: cats['Coffee'], isFeatured: true, preparationTime: 5 },
    { name: 'Latte', price: 3500, categoryId: cats['Coffee'], preparationTime: 5 },
    { name: 'Cold Coffee', price: 4000, categoryId: cats['Coffee'], preparationTime: 5 },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.name.replace(/\s+/g, '-').toLowerCase() },
      update: {},
      create: { ...product, id: product.name.replace(/\s+/g, '-').toLowerCase() },
    }).catch(() => prisma.product.create({ data: product }));
  }
  console.log('✅ Products created');

  // ===== TABLES =====
  const tableData = [
    { name: 'A', seats: 4 }, { name: 'B', seats: 4 }, { name: 'C', seats: 4 }, { name: 'D', seats: 4 },
    { name: 'E', seats: 6 }, { name: 'F', seats: 6 }, { name: 'G', seats: 2 }, { name: 'H', seats: 2 },
  ];

  for (const t of tableData) {
    await prisma.restaurantTable.upsert({
      where: { name: t.name },
      update: {},
      create: {
        name: t.name,
        seats: { create: Array.from({ length: t.seats }, (_, i) => ({ label: `${t.name}${i + 1}` })) },
      },
    });
  }
  console.log('✅ Tables created');

  // ===== INVENTORY =====
  const inventoryItems = [
    { name: 'Chicken Breast', category: 'Meat', quantity: 20, unit: 'kg', costPrice: 3500, minimumStock: 5 },
    { name: 'Ground Beef', category: 'Meat', quantity: 15, unit: 'kg', costPrice: 5000, minimumStock: 5 },
    { name: 'Fresh Tilapia', category: 'Seafood', quantity: 10, unit: 'kg', costPrice: 4000, minimumStock: 3 },
    { name: 'All-Purpose Flour', category: 'Dry Goods', quantity: 30, unit: 'kg', costPrice: 600, minimumStock: 10 },
    { name: 'Rice (Long Grain)', category: 'Dry Goods', quantity: 50, unit: 'kg', costPrice: 800, minimumStock: 15 },
    { name: 'Pasta', category: 'Dry Goods', quantity: 20, unit: 'kg', costPrice: 1200, minimumStock: 5 },
    { name: 'Tomatoes', category: 'Vegetables', quantity: 15, unit: 'kg', costPrice: 500, minimumStock: 5 },
    { name: 'Onions', category: 'Vegetables', quantity: 20, unit: 'kg', costPrice: 300, minimumStock: 5 },
    { name: 'Cooking Oil', category: 'Condiments', quantity: 20, unit: 'L', costPrice: 2000, minimumStock: 5 },
    { name: 'Primus Beer', category: 'Beverages', quantity: 200, unit: 'bottles', costPrice: 600, minimumStock: 50 },
    { name: 'Mutzig Beer', category: 'Beverages', quantity: 150, unit: 'bottles', costPrice: 700, minimumStock: 40 },
    { name: 'Heineken', category: 'Beverages', quantity: 120, unit: 'bottles', costPrice: 900, minimumStock: 30 },
    { name: 'Coca Cola', category: 'Soft Drinks', quantity: 100, unit: 'bottles', costPrice: 400, minimumStock: 30 },
    { name: 'Johnnie Walker Black Label', category: 'Spirits', quantity: 10000, unit: 'ml', costPrice: 50, minimumStock: 2000, isLiquor: true, bottleVolume: 1000 },
    { name: 'Absolut Vodka', category: 'Spirits', quantity: 8000, unit: 'ml', costPrice: 40, minimumStock: 1000, isLiquor: true, bottleVolume: 1000 },
    { name: 'Hennessy VS', category: 'Spirits', quantity: 5000, unit: 'ml', costPrice: 80, minimumStock: 1000, isLiquor: true, bottleVolume: 1000 },
    { name: 'House Red Wine', category: 'Wine', quantity: 24, unit: 'bottles', costPrice: 2000, minimumStock: 6 },
    { name: 'Coffee Beans', category: 'Beverages', quantity: 5, unit: 'kg', costPrice: 5000, minimumStock: 1 },
    { name: 'Milk', category: 'Dairy', quantity: 20, unit: 'L', costPrice: 800, minimumStock: 5 },
    { name: 'Eggs', category: 'Dairy', quantity: 120, unit: 'pieces', costPrice: 120, minimumStock: 30 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.create({ data: item }).catch(() => {});
  }
  console.log('✅ Inventory created');

  // ===== SYSTEM SETTINGS =====
  const settings = [
    { key: 'restaurant_name', value: 'Sammy Restaurant & Bar' },
    { key: 'restaurant_address', value: 'Kigali, Rwanda' },
    { key: 'restaurant_phone', value: '+250780000000' },
    { key: 'restaurant_email', value: 'info@sammyrestaurant.rw' },
    { key: 'delivery_fee', value: '1000' },
    { key: 'loyalty_rate', value: '1000' },
    { key: 'tax_rate', value: '0' },
    { key: 'currency', value: 'RWF' },
    { key: 'opening_time', value: '07:00' },
    { key: 'closing_time', value: '23:00' },
    { key: 'theme', value: 'dark' },
  ];

  for (const s of settings) {
    await prisma.systemSettings.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }
  console.log('✅ System settings created');

  console.log('\n🎉 Seed completed!\n');
  console.log('=== LOGIN CREDENTIALS ===');
  console.log('Admin 1: mory@sammy.rw / Admin@1234');
  console.log('Admin 2: nestor@sammy.rw / Admin@1234');
  console.log('Manager: christian@sammy.rw / Manager@1234');
  console.log('Cashier 1: safi.cashier@sammy.rw / Cashier@1234');
  console.log('Cashier 2: patrick.cashier@sammy.rw / Cashier@1234');
  console.log('\n=== PIN LOGIN USERS ===');
  console.log('Bar Staff: Safi (Bar), Patrick (Bar) → PIN: 9012');
  console.log('Kitchen: Clever (Head Chef), Umunu, Umun → PIN: 5678');
  console.log('Waiters: Yvone, Denise, Ladouce, Poullet → PIN: 1234');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());