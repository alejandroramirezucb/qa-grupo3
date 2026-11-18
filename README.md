# Proyecto QA 2 - Grupo 3

Proyecto del bloque 2 de QA 2 (ISW-212), Universidad Católica Boliviana.

**Integrantes:** Abuawad Velasco Oscar Santiago · Balbontin Ugarteche Josue Galo · Catorceno Orellana Camila Alison · Ramirez Vallejos Alejandro

| Parte | Qué se hizo |
|---|---|
| Parte 1 | Evaluación heurística de [takenos.com/bolivia](https://takenos.com/bolivia) con un checklist de 30 preguntas (10 heurísticas) |
| Parte 2 | Pruebas de performance con k6 sobre la API [Eowyn Library](https://github.com/analiacasas/eowyn-library), con monitoreo en tiempo real en InfluxDB + Grafana |

Los **informes (.docx), las diapositivas (.html y .pdf) y los reportes de k6** están en [Releases](https://github.com/alejandroramirezucb/qa-grupo3/releases). Este repositorio contiene solo la implementación.

---

## Contenido del repositorio

```
qa-grupo3/
├── eowyn-library/            API del proyecto (Node.js + Express + Knex + PostgreSQL)
├── postman/
│   ├── eowyn-library.postman_collection.json
│   └── eowyn_enviroment.postman_environment.json
└── performance-k6/
    ├── rampUpSteadyState.js  Ramp-Up / Steady State
    ├── rampUpRampDown.js     Ramp-Up / Ramp-Down
    ├── cargaConstante.js     Constant Load
    ├── cargaPico.js          Spike Load
    ├── influxdb/             Dockerfile + init.iql (base k6db y usuario k6user)
    ├── grafana/              eowyn-dashboard.json (dashboard propio)
    └── comandos.txt          Todos los comandos en un solo lugar
```

## Requisitos

| Herramienta | Para qué | Instalación |
|---|---|---|
| Node.js 18 o superior | Ejecutar la API | https://nodejs.org |
| Docker Desktop | PostgreSQL, InfluxDB y Grafana | https://www.docker.com/products/docker-desktop |
| k6 | Pruebas de carga | `choco install k6` (consola de administrador) |
| Postman | Validar los endpoints | https://www.postman.com/downloads |

## Configuración

### Puertos

| Servicio | URL / puerto | Nota |
|---|---|---|
| API Eowyn Library | http://localhost:3000 | `PORT` en `.env` |
| PostgreSQL (Docker) | localhost:5433 | Se cambió de 5432 a 5433 en `docker-compose.yml` porque el 5432 estaba ocupado |
| InfluxDB (Docker) | http://localhost:8086 | Base `k6db` |
| Grafana (Docker) | http://localhost:3001 | Usa 3001 porque la API ocupa el 3000 |
| Reporte web de k6 | http://localhost:5665 | Solo mientras corre una prueba con `K6_WEB_DASHBOARD=true` |

### Usuarios y contraseñas (solo ambiente local)

| Dónde | Usuario | Contraseña |
|---|---|---|
| Login de la API | `admin@example.com` | `123456` |
| Grafana | `admin` | `admin` (en el primer ingreso se puede presionar "Skip") |
| InfluxDB | `k6user` | `k6pass` |
| PostgreSQL | `gandalf` | `123456` |

### Variables de entorno (`eowyn-library/.env`)

Se crea copiando `.env.template`:

```
PORT=3000
NODE_ENV=development
PG_URL=postgresql://gandalf:123456@localhost:5433/eowyn-library
JWT_SEED=semilla-local-dev
TOKEN_EXPIRES_IN=2h
```

---

## Uso paso a paso

### 1. Levantar la API

```bash
cd eowyn-library
cp .env.template .env
```

Editar `.env` con los valores de arriba y luego:

```bash
npm install
docker compose up -d
npm run migrate:latest
npm run dev
```

La API queda en http://localhost:3000. Las migraciones crean las tablas `users`, `categories`, `books` y `loans` con datos de ejemplo.

`npm run migrate:make` solo se usa para crear migraciones nuevas; no es necesario para levantar el proyecto.

### 2. Probar la API con Postman

1. Importar los dos archivos de la carpeta `postman/`.
2. Elegir el environment **eowyn_enviroment** (`host = http://localhost:3000`).
3. Ejecutar primero **Login**: guarda el token en la variable `{{token}}`.
4. El resto de peticiones protegidas usan `{{token}}` automáticamente. El token dura 2 horas; si vence, volver a ejecutar Login.

Algunas peticiones responden **400** por los datos fijos de la colección (descripción menor a 10 caracteres, id inexistente, fecha de devolución pasada o registros que ya existen). Son validaciones correctas de la API.

### 3. Levantar InfluxDB y Grafana

Solo la primera vez:

```bash
cd performance-k6
docker build -t influxdb-k6 influxdb
docker run -d --name influxdb -p 8086:8086 influxdb-k6
docker run -d --name grafana -p 3001:3000 grafana/grafana
```

Las siguientes veces:

```bash
docker start influxdb grafana
```

Configurar Grafana en http://localhost:3001:

1. **Connections → Data sources → Add data source → InfluxDB**

   | Campo | Valor |
   |---|---|
   | URL | `http://host.docker.internal:8086` |
   | Database | `k6db` |
   | User / Password | `k6user` / `k6pass` |
   | Query language | InfluxQL |

   Guardar con **Save & test**. Se usa `host.docker.internal` porque dentro del contenedor de Grafana `localhost` es el propio contenedor.

2. **Dashboards → New → Import**:
   - Subir `performance-k6/grafana/eowyn-dashboard.json` (dashboard propio).
   - Opcional: importar los dashboards de clase **14801** y **2587** por ID.

### 4. Ejecutar las pruebas de carga

Con la API levantada, desde `performance-k6`:

```bash
k6 run --out influxdb=http://k6user:k6pass@localhost:8086/k6db --tag prueba=rampUpSteadyState rampUpSteadyState.js
k6 run --out influxdb=http://k6user:k6pass@localhost:8086/k6db --tag prueba=rampUpRampDown rampUpRampDown.js
k6 run --out influxdb=http://k6user:k6pass@localhost:8086/k6db --tag prueba=cargaConstante cargaConstante.js
k6 run --out influxdb=http://k6user:k6pass@localhost:8086/k6db --tag prueba=cargaPico cargaPico.js
```

- `--out influxdb=...` envía las métricas a InfluxDB para verlas en Grafana.
- `--tag prueba=...` permite filtrar cada prueba en el dashboard.

Reporte web de k6 visto en clase (ejecutar en **cmd**):

```
set K6_WEB_DASHBOARD=true&& k6 run cargaPico.js
```

### 5. Ver el dashboard en tiempo real

1. Abrir http://localhost:3001 → **Dashboards → Eowyn Library - Pruebas de Performance k6**.
2. Elegir el rango de tiempo arriba a la derecha (por ejemplo **Last 15 minutes**). Si la última prueba fue antes de ese rango, el dashboard aparece vacío.
3. Filtrar por **Prueba** y **Endpoint** con los selectores de arriba.

---

## Diseño de las pruebas

### Scripts

Todos siguen la estructura vista en clase (`options`, `check()`, `sleep(1)`). Como la API corre en local, se usan entre 20 y 60 usuarios para encontrar el punto de saturación:

| Script | Carga | Flujo |
|---|---|---|
| `rampUpSteadyState.js` | 0 → 30 usuarios en 20 s, se mantiene 40 s | login → `GET /api/books` |
| `rampUpRampDown.js` | 0 → 40 en 20 s, 20 s estable, 40 → 0 en 20 s | login → `GET /api/categories` |
| `cargaConstante.js` | 20 usuarios durante 40 s | `POST /api/auth/login` |
| `cargaPico.js` | base de 10, sube a 60 en 5 s, 10 s en 60, baja a 10 | login → `GET /api/books` |

### KPIs y umbrales

| KPI | Umbral |
|---|---|
| Tiempo promedio | < 500 ms |
| Percentil 95 | < 1000 ms |
| Throughput | > 3 req/s |
| Tasa de error | < 1% |
| Checks correctos | 100% |
| CPU / Memoria de la API | < 75% / < 512 MB |

### Dashboard de Grafana

| Sección | Paneles |
|---|---|
| Resumen | VUs, requests, iteraciones, throughput, promedio, p95, errores y checks (verde / amarillo / rojo según el umbral) |
| Carga vs tiempo de respuesta | Usuarios virtuales vs throughput; promedio, p90, p95 y máximo con líneas de umbral |
| Detalle por endpoint | p95 y req/s por endpoint, tabla resumen y códigos HTTP |
| Calidad | Checks por validación, tasa de error en el tiempo |
| Desglose HTTP | Fases de la petición (espera del servidor, conexión, etc.), duración de iteración y datos transferidos |

## Resultados (18/11/2026)

| Prueba | Usuarios | Promedio | p95 | Req/s | Errores | Checks |
|---|---|---|---|---|---|---|
| Ramp-Up / Steady State | 30 | 2492 ms | 5438 ms | 8.40 | 0% | 100% |
| Ramp-Up / Ramp-Down | 40 | 3024 ms | 6558 ms | 7.99 | 0% | 100% |
| Carga Constante | 20 | 2942 ms | 3272 ms | 4.85 | 0% | 100% |
| Carga Pico | 60 | 3832 ms | 9759 ms | 7.64 | 0% | 100% |

La API no da errores, pero no cumple los umbrales de tiempo: el throughput se queda en unas 8 req/s sin importar los usuarios. El cuello de botella es el login: `src/config/bcrypst.adapter.ts` usa `compareSync` de bcryptjs, que bloquea el único hilo de Node.js y deja en cola al resto de peticiones.

---

## Problemas comunes

| Problema | Solución |
|---|---|
| El dashboard de Grafana aparece vacío | Ampliar el rango de tiempo o ejecutar una prueba con `--out influxdb` |
| `password authentication failed for user "gandalf"` | Otro PostgreSQL usa el 5432; usar el puerto 5433 en `docker-compose.yml` y en `PG_URL` |
| Postman responde 401 | Ejecutar primero **Login** con el environment `eowyn_enviroment` seleccionado |
| Grafana no conecta con InfluxDB | Usar `http://host.docker.internal:8086`, no `localhost` |
| `failed to connect to the docker API` | Abrir Docker Desktop y esperar a que inicie |
| Grafana no inicia en el puerto 3000 | Es normal: está publicado en el 3001 |
