import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 2 },
    { duration: '5s', target: 10 },
    { duration: '10s', target: 10 },
    { duration: '5s', target: 2 },
    { duration: '10s', target: 2 },
    { duration: '5s', target: 0 },
  ],
};

export default function () {
  const login = http.post('http://localhost:3000/api/auth/login', { email: 'admin@example.com', password: '123456' });
  const token = login.json().token;
  const respuesta = http.get('http://localhost:3000/api/books?limit=30', {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(respuesta, {
    'el estado es 200': (r) => r.status === 200,
    'devuelve libros': (r) => r.json().books.length > 0,
  });
  sleep(1);
}
