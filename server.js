const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const winston = require('winston');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de Winston para logging de seguridad
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Logger general de aplicación
const appLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/app.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Sistema de alertas - contador de intentos fallidos
const failedAttempts = new Map();
const ALERT_THRESHOLD = 3; // Número de intentos fallidos antes de generar alerta
const ALERT_WINDOW = 5 * 60 * 1000; // Ventana de tiempo: 5 minutos

function checkFailedAttempts(username, ip) {
  const key = `${username}-${ip}`;
  const now = Date.now();
  
  if (!failedAttempts.has(key)) {
    failedAttempts.set(key, []);
  }
  
  const attempts = failedAttempts.get(key);
  // Limpiar intentos antiguos
  const recentAttempts = attempts.filter(time => now - time < ALERT_WINDOW);
  recentAttempts.push(now);
  failedAttempts.set(key, recentAttempts);
  
  if (recentAttempts.length >= ALERT_THRESHOLD) {
    securityLogger.error('🚨 ALERTA DE SEGURIDAD: Múltiples intentos fallidos detectados', {
      event: 'BRUTE_FORCE_ALERT',
      username,
      ip,
      attempts: recentAttempts.length,
      timeWindow: `${ALERT_WINDOW / 1000 / 60} minutos`,
      severity: 'HIGH'
    });
    return true;
  }
  return false;
}

function clearFailedAttempts(username, ip) {
  const key = `${username}-${ip}`;
  failedAttempts.delete(key);
}

const DATA_FILE = path.join(__dirname, 'data.json');

// Usuarios por defecto
const defaultUsers = [
  { id: 1, username: 'admin', password: 'admin123', role: 'admin' },
  { id: 2, username: 'user', password: 'user123', role: 'user' }
];

// Productos iniciales por defecto
const defaultProducts = [
  { id: 1, name: 'Laptop HP', price: 999 },
  { id: 2, name: 'Mouse Logitech', price: 25 },
  { id: 3, name: 'Teclado Mecánico', price: 89 },
  { id: 4, name: 'Monitor 24"', price: 299 },
  { id: 5, name: 'Webcam HD', price: 59 },
  { id: 6, name: 'Auriculares Bluetooth', price: 79 },
  { id: 7, name: 'Disco Duro 1TB', price: 55 },
  { id: 8, name: 'Memoria RAM 16GB', price: 75 },
  { id: 9, name: 'Tarjeta Gráfica', price: 499 },
  { id: 10, name: 'Cable HDMI', price: 12 }
];

// Cargar datos desde archivo o usar defaults
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      return {
        products: data.products || defaultProducts,
        users: data.users || defaultUsers
      };
    }
  } catch (error) {
    console.error('Error al cargar datos:', error);
  }
  return {
    products: [...defaultProducts],
    users: [...defaultUsers]
  };
}

// Guardar datos en archivo
function saveData(products, users) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ products, users }, null, 2));
  } catch (error) {
    console.error('Error al guardar datos:', error);
  }
}

const data = loadData();
let products = data.products;
let users = data.users;

// Crear directorio de logs si no existe
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// SEGURIDAD: Login con logging completo
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  
  // Registrar intento de login
  appLogger.info('Intento de login', {
    event: 'LOGIN_ATTEMPT',
    username,
    ip,
    timestamp: new Date().toISOString()
  });
  
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    // Login exitoso - limpiar intentos fallidos
    clearFailedAttempts(username, ip);
    
    securityLogger.info('✅ Login exitoso', {
      event: 'LOGIN_SUCCESS',
      username: user.username,
      role: user.role,
      ip,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, token: 'fake-token-' + user.id, username: user.username });
  } else {
    // Login fallido - registrar y verificar alertas
    securityLogger.warn('❌ Login fallido', {
      event: 'LOGIN_FAILED',
      username,
      ip,
      timestamp: new Date().toISOString()
    });
    
    checkFailedAttempts(username, ip);
    
    res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  }
});

// CRUD de productos con auditoría completa
app.get('/api/products', (req, res) => {
  appLogger.info('Consulta de productos', {
    event: 'PRODUCTS_READ',
    timestamp: new Date().toISOString()
  });
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const { name, price } = req.body;
  const newProduct = { id: products.length + 1, name, price: parseFloat(price) };
  products.push(newProduct);
  saveData(products, users);
  
  securityLogger.info('Producto creado', {
    event: 'PRODUCT_CREATED',
    productId: newProduct.id,
    productName: name,
    price,
    timestamp: new Date().toISOString()
  });
  
  res.json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const { name, price } = req.body;
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (product) {
    const oldData = { ...product };
    product.name = name;
    product.price = parseFloat(price);
    saveData(products, users);
    
    securityLogger.info('Producto modificado', {
      event: 'PRODUCT_UPDATED',
      productId: product.id,
      oldData: { name: oldData.name, price: oldData.price },
      newData: { name, price },
      timestamp: new Date().toISOString()
    });
    
    res.json(product);
  } else {
    res.status(404).json({ message: 'Producto no encontrado' });
  }
});

app.delete('/api/products/:id', (req, res) => {
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index !== -1) {
    const deletedProduct = products[index];
    products.splice(index, 1);
    saveData(products, users);
    
    securityLogger.warn('Producto eliminado', {
      event: 'PRODUCT_DELETED',
      productId: deletedProduct.id,
      productName: deletedProduct.name,
      price: deletedProduct.price,
      timestamp: new Date().toISOString(),
      severity: 'MEDIUM'
    });
    
    res.json({ message: 'Producto eliminado' });
  } else {
    res.status(404).json({ message: 'Producto no encontrado' });
  }
});

// Endpoint seguro - cambio de contraseña con logging completo
app.post('/api/change-password', (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const user = users.find(u => u.username === username);
  
  if (user && user.password === oldPassword) {
    user.password = newPassword;
    saveData(products, users);
    
    securityLogger.warn('Contraseña cambiada', {
      event: 'PASSWORD_CHANGED',
      username,
      ip,
      timestamp: new Date().toISOString(),
      severity: 'HIGH'
    });
    
    res.json({ success: true });
  } else {
    securityLogger.warn('Intento fallido de cambio de contraseña', {
      event: 'PASSWORD_CHANGE_FAILED',
      username,
      ip,
      timestamp: new Date().toISOString(),
      reason: user ? 'Contraseña actual incorrecta' : 'Usuario no encontrado'
    });
    
    res.status(401).json({ success: false });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  appLogger.info('Servidor iniciado', {
    event: 'SERVER_START',
    port: PORT,
    timestamp: new Date().toISOString()
  });
  securityLogger.info('Sistema de seguridad activo', {
    event: 'SECURITY_SYSTEM_ACTIVE',
    features: ['Login tracking', 'Brute force detection', 'CRUD audit', 'Password change monitoring'],
    alertThreshold: ALERT_THRESHOLD,
    alertWindow: `${ALERT_WINDOW / 1000 / 60} minutos`
  });
});
