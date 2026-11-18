import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '40s',
};

export default function () {
  const respuesta = http.post('http://localhost:3000/api/auth/login', { email: 'admin@example.com', password: '123456' });
  check(respuesta, {
    'el estado es 200': (r) => r.status === 200,
    'devuelve el token': (r) => r.json().token !== undefined,
  });
  sleep(1);
}
