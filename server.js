const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const DATA_FILE = path.join(__dirname, 'data.json');

// Base de datos en memoria (simulada)
let users = [
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
      return data.products || defaultProducts;
    }
  } catch (error) {
    console.error('Error al cargar datos:', error);
  }
  return [...defaultProducts];
}

// Guardar datos en archivo
function saveData(products) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ products }, null, 2));
  } catch (error) {
    console.error('Error al guardar datos:', error);
  }
}

let products = loadData();

// VULNERABILIDAD: No hay logging de eventos de seguridad
// LOGIN sin logging de intentos fallidos
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  // No se registra el intento de login
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    // No se registra el login exitoso
    res.json({ success: true, token: 'fake-token-' + user.id, username: user.username });
  } else {
    // VULNERABILIDAD: No se registra el intento fallido de autenticación
    // No se detectan ataques de fuerza bruta
    res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  }
});

// CRUD de productos sin auditoría
app.get('/api/products', (req, res) => {
  // No se registra quién accede a los datos
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const { name, price } = req.body;
  const newProduct = { id: products.length + 1, name, price: parseFloat(price) };
  products.push(newProduct);
  saveData(products);
  // VULNERABILIDAD: No se registra quién creó el producto
  res.json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const { name, price } = req.body;
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (product) {
    product.name = name;
    product.price = parseFloat(price);
    saveData(products);
    // VULNERABILIDAD: No se registra la modificación ni quién la hizo
    res.json(product);
  } else {
    res.status(404).json({ message: 'Producto no encontrado' });
  }
});

app.delete('/api/products/:id', (req, res) => {
  const index = products.findIndex(p => p.id === parseInt(req.params.id));
  if (index !== -1) {
    products.splice(index, 1);
    saveData(products);
    // VULNERABILIDAD: No se registra la eliminación crítica de datos
    res.json({ message: 'Producto eliminado' });
  } else {
    res.status(404).json({ message: 'Producto no encontrado' });
  }
});

// Endpoint vulnerable - cambio de contraseña sin logging
app.post('/api/change-password', (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  const user = users.find(u => u.username === username);
  
  if (user && user.password === oldPassword) {
    user.password = newPassword;
    // VULNERABILIDAD: No se registra el cambio de contraseña
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
  // VULNERABILIDAD: No hay sistema de alertas configurado
  // No se monitorean eventos críticos de seguridad
});
