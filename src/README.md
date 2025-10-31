# Lumina Backend

API backend desarrollada con Node.js, Express, TypeScript y MongoDB. Incluye sistema completo de autenticación de usuarios, gestión de perfiles, recuperación de contraseñas e integración preparada con la API de Pexels para gestión de videos.

## 🚀 Características

### ✅ Autenticación y Usuarios
- **Registro de usuarios** con validación completa de campos
- **Login seguro** con JWT tokens 
- **Recuperación de contraseña** por email con tokens temporales
- **Gestión de perfiles** de usuario completa
- **Middleware de autenticación** para rutas protegidas
- **Validación de emails** únicos y campos requeridos

### 🎬 Videos y Multimedia (En desarrollo)
- **Controlador de Pexels** preparado para integración
- **Búsqueda de videos** por palabras clave y términos múltiples
- **Videos populares** y contenido curado
- **Endpoints en español** para mejor UX local

## 🛠️ Stack Tecnológico

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web minimalista y flexible
- **TypeScript** - JavaScript con tipado estático
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM elegante para MongoDB
- **JWT** - JSON Web Tokens para autenticación
- **bcryptjs** - Hash seguro de contraseñas
- **Nodemailer** - Envío de emails transaccionales
- **CORS** - Cross-Origin Resource Sharing configurado

## 📁 Arquitectura del Proyecto

```
src/
├── controllers/           # Lógica de negocio
│   ├── auth.controller.ts    # Autenticación (signup, login, recovery)
│   ├── user.controller.ts    # Gestión de usuarios y perfiles
│   └── pexels.controller.ts  # Videos y multimedia (preparado)
├── middleware/
│   └── auth.ts              # Verificación JWT y protección de rutas
├── models/
│   └── User.ts              # Esquema de usuario en MongoDB
├── routes/
│   ├── auth.ts              # Endpoints de autenticación
│   ├── users.ts             # Endpoints de usuarios
│   └── pexels               # Endpoints de videos (preparado)
├── utils/
│   └── mail.ts              # Configuración y envío de emails
└── index.ts                 # Servidor Express y configuración
```

## 🚀 Instalación y Configuración

### 1. Clonar e instalar
```bash
git clone <repository-url>
cd lumina-backend
npm install
```

### 2. Variables de entorno
Crea un archivo `.env` en la raíz:

```env
# Servidor
PORT=3000

# Base de datos
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/lumina

# Autenticación
JWT_SECRET=tu_jwt_secret_super_seguro_aqui

# Email (para recuperación de contraseñas)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password_de_gmail

# Frontend
CLIENT_URL=http://localhost:5173

# Pexels API (opcional para videos)
PEXELS_API_KEY=tu_pexels_api_key
```

### 3. Ejecutar el proyecto
```bash
# Desarrollo con hot reload
npm run dev

# Compilar TypeScript
npm run build

# Producción
npm start
```

## 📋 Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Desarrollo con tsx watch (hot reload) |
| `npm run build` | Compilar TypeScript a JavaScript |
| `npm start` | Ejecutar aplicación compilada |

## 🌐 API Endpoints

### 🔐 Autenticación (`/api/auth`)

| Método | Endpoint | Descripción | Cuerpo |
|--------|----------|-------------|---------|
| `POST` | `/api/auth/register` | Registrar nuevo usuario | `{firstName, lastName, age, email, password}` |
| `POST` | `/api/auth/login` | Iniciar sesión | `{email, password}` |
| `POST` | `/api/auth/forgot` | Solicitar recuperación | `{email}` |
| `POST` | `/api/auth/reset` | Resetear contraseña | `{token, newPassword}` |

### 👤 Usuarios (`/api/users`)

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| `GET` | `/api/users/profile` | Obtener perfil del usuario | ✅ Requerida |
| `PUT` | `/api/users/profile` | Actualizar perfil | ✅ Requerida |

### 🎬 Videos (`/api/pexels`) - En desarrollo

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/pexels/videos/popular` | Videos populares |
| `GET` | `/api/pexels/videos/search` | Buscar videos |
| `GET` | `/api/pexels/videos/:id` | Video específico |

## 📝 Ejemplos de Uso

### Registro de usuario
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Pérez", 
    "age": 25,
    "email": "juan@example.com",
    "password": "miPassword123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@example.com",
    "password": "miPassword123"
  }'
```

### Acceder a perfil (con token)
```bash
curl -X GET http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer TU_JWT_TOKEN_AQUI"
```

## 🔒 Seguridad

### Autenticación JWT
- Tokens seguros con expiración configurable
- Headers de autorización: `Authorization: Bearer <token>`
- Middleware que protege rutas sensibles

### Contraseñas
- Hash con bcrypt (10 rounds)
- Validación de fuerza de contraseña en frontend
- Recuperación segura con tokens temporales

### CORS
```javascript
// Configurado para aceptar requests desde:
origin: process.env.CLIENT_URL || "http://localhost:5173"
credentials: true
```

## 📦 Dependencias

### Producción
```json
{
  "express": "^4.19.2",      // Framework web
  "mongoose": "^8.6.0",      // ODM MongoDB  
  "jsonwebtoken": "^9.0.2",  // JWT auth
  "bcryptjs": "^2.4.3",      // Hash passwords
  "nodemailer": "^6.9.14",   // Email sending
  "cors": "^2.8.5",          // CORS middleware
  "dotenv": "^16.4.5"        // Environment vars
}
```

### Desarrollo
```json
{
  "typescript": "^5.5.4",    // TypeScript compiler
  "tsx": "^4.19.1",          // TypeScript executor
  "@types/*": "..."          // Type definitions
}
```

## 🧪 Estado del Proyecto

- ✅ **Autenticación completa** - Sistema robusto implementado
- ✅ **Base de datos** - MongoDB configurada con Mongoose  
- ✅ **Emails** - Nodemailer configurado para recuperación
- ✅ **TypeScript** - Tipado completo en toda la aplicación
- 🚧 **Videos** - Controladores preparados, pendiente integración
- 🚧 **Tests** - Pendiente implementación
- 🚧 **Docker** - Pendiente containerización

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.
