const { spawn } = require('child_process');
const os = require('os');

// Find local IP
const interfaces = os.networkInterfaces();
let localIp = 'localhost';

// Iterate over network interfaces to find the first non-internal IPv4 address
Object.keys(interfaces).forEach((ifname) => {
  interfaces[ifname].forEach((iface) => {
    // Skip internal (i.e. 127.0.0.1) and non-ipv4 addresses
    if ('IPv4' !== iface.family || iface.internal !== false) {
      return;
    }
    localIp = iface.address;
  });
});

console.log('\n');
console.log('\x1b[36m%s\x1b[0m', '------------------------------------------------------------');
console.log('\x1b[32m%s\x1b[0m', `   Local:   http://localhost:3000`);
console.log('\x1b[32m%s\x1b[0m', `   Network: http://${localIp}:3000`);
console.log('\x1b[36m%s\x1b[0m', '------------------------------------------------------------');
console.log('\nStarting Next.js server...\n');

// Run next dev
const nextDev = spawn('npx', ['next', 'dev', '-H', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true
});

nextDev.on('close', (code) => {
  process.exit(code);
});
