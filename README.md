# Demo: A09:2025 - Security Logging & Alerting Failures

## 🎯 Objetivo
Esta aplicación demuestra la vulnerabilidad **A09:2025 - Security Logging & Alerting Failures** del OWASP Top 10.

## ⚠️ Vulnerabilidades Implementadas

### 1. **No hay registro de intentos de autenticación fallidos**
- Los intentos de login fallidos no se registran
- No se detectan ataques de fuerza bruta
- No hay alertas de múltiples intentos fallidos

### 2. **Sin auditoría de operaciones CRUD**
- Las creaciones, modificaciones y eliminaciones no se registran
- No se sabe quién realizó cada acción
- Imposible rastrear cambios en los datos

### 3. **No hay monitoreo de eventos críticos**
- Cambios de contraseña sin registro
- Accesos a datos sensibles sin traza
- Sin sistema de alertas configurado

### 4. **Falta de contexto en logs**
- No se registra IP del usuario
- No hay timestamps detallados
- Sin información de sesión

## 🚀 Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start
```

Abrir navegador en: http://localhost:3000

## 👤 Credenciales de Prueba

- **Admin**: username: `admin` / password: `admin123`
- **User**: username: `user` / password: `user123`

## 🧪 Cómo Probar la Vulnerabilidad

1. **Intenta login con credenciales incorrectas varias veces**
   - ❌ No se registra ningún evento
   - ❌ No hay protección contra fuerza bruta

2. **Crea, modifica y elimina productos**
   - ❌ No queda registro de quién hizo cada acción
   - ❌ Imposible auditar cambios

3. **Observa la consola del servidor**
   - ❌ Solo hay un mensaje de inicio
   - ❌ No hay logs de seguridad

## ✅ Cómo Corregir Esta Vulnerabilidad

1. **Implementar logging estructurado** (Winston, Pino, etc.)
2. **Registrar todos los eventos de seguridad**:
   - Intentos de login (exitosos y fallidos)
   - Cambios en datos críticos
   - Accesos a recursos sensibles
   - Cambios de permisos/contraseñas
3. **Incluir contexto**: usuario, IP, timestamp, acción
4. **Configurar alertas** para eventos sospechosos
5. **Proteger los logs** de manipulación
6. **Retención adecuada** de logs para auditoría

## 📝 Ejemplo de Log Seguro

```javascript
logger.warn({
  event: 'LOGIN_FAILED',
  username: 'admin',
  ip: '192.168.1.100',
  timestamp: '2025-01-10T12:30:00Z',
  attempts: 3
});
```

## ⚠️ ADVERTENCIA
Esta aplicación es solo para demostración educativa. **NO usar en producción**.
