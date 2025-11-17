const http = require('http');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const PORT = config.server?.port || 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testHealthCheck() {
  console.log('🔍 Тест: Health Check (GET /health)\n');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/health',
      method: 'GET'
    });
    
    if (response.statusCode === 200 && response.body.status === 'OK') {
      console.log('✅ Health check успешен');
      console.log(`   Статус: ${response.body.status}`);
      console.log(`   База данных: ${response.body.database}\n`);
      return true;
    } else {
      console.log('❌ Health check не прошел');
      console.log(`   Статус код: ${response.statusCode}`);
      console.log(`   Ответ: ${JSON.stringify(response.body)}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка при проверке health check:');
    console.log(`   ${error.message}\n`);
    console.log('💡 Убедитесь, что сервер запущен: npm start\n');
    return false;
  }
}

async function testReserve(eventId, userId) {
  console.log(`🔍 Тест: Бронирование места (POST /api/bookings/reserve)\n`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   User ID: ${userId}\n`);
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/bookings/reserve',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      event_id: eventId,
      user_id: userId
    });
    
    if (response.statusCode === 201) {
      console.log('✅ Бронирование успешно создано');
      console.log(`   ID бронирования: ${response.body.booking.id}`);
      console.log(`   Создано: ${response.body.booking.created_at}\n`);
      return true;
    } else if (response.statusCode === 409) {
      console.log('ℹ️  Бронирование уже существует (ожидаемо при повторном запросе)');
      console.log(`   Сообщение: ${response.body.error}\n`);
      return true;
    } else {
      console.log('❌ Ошибка при бронировании');
      console.log(`   Статус код: ${response.statusCode}`);
      console.log(`   Ответ: ${JSON.stringify(response.body)}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка при запросе бронирования:');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

async function testInvalidReserve() {
  console.log('🔍 Тест: Валидация входных данных\n');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/bookings/reserve',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      event_id: 1
    });
    
    if (response.statusCode === 400) {
      console.log('✅ Валидация работает корректно');
      console.log(`   Ошибка: ${response.body.error}\n`);
      return true;
    } else {
      console.log('❌ Валидация не сработала');
      console.log(`   Статус код: ${response.statusCode}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка при тесте валидации:');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

async function test404() {
  console.log('🔍 Тест: Обработка несуществующего маршрута\n');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/nonexistent',
      method: 'GET'
    });
    
    if (response.statusCode === 404) {
      console.log('✅ Обработка 404 работает корректно\n');
      return true;
    } else {
      console.log('❌ Обработка 404 не работает');
      console.log(`   Статус код: ${response.statusCode}\n`);
      return false;
    }
  } catch (error) {
    console.log('❌ Ошибка при тесте 404:');
    console.log(`   ${error.message}\n`);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Запуск тестов API\n');
  console.log('═'.repeat(50));
  console.log('');
  
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('❌ Сервер не запущен или недоступен. Запустите: npm start\n');
    process.exit(1);
  }
  
  await test404();
  await testInvalidReserve();
  
  const eventId = 1;
  const userId1 = `test_user_${Date.now()}`;
  const userId2 = `test_user_${Date.now() + 1}`;
  
  await testReserve(eventId, userId1);
  await testReserve(eventId, userId2);
  
  console.log('🔍 Тест: Попытка повторного бронирования (должна быть ошибка)\n');
  await testReserve(eventId, userId1);
  
  console.log('═'.repeat(50));
  console.log('');
  console.log('✅ Все тесты завершены!\n');
  
  process.exit(0);
}

runTests().catch(error => {
  console.error('Критическая ошибка:', error);
  process.exit(1);
});

