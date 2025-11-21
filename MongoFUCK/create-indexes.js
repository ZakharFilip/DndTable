use myapp;
db.users.createIndex({ 'email': 1 }, { unique: true });
db.users.createIndex({ 'nickname': 1 });
print('Индексы созданы успешно!');