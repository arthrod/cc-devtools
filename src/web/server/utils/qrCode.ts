/**
 * QR Code generator utility for authentication
 */

import os from 'os';

import * as logger from './logger.js';

/**
 * Get local network IP addresses
 */
function getLocalIPAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const addr of iface) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (addr.family === 'IPv4' && !addr.internal) {
        addresses.push(addr.address);
      }
    }
  }

  return addresses;
}

/**
 * Generate authentication URL with token
 */
export function generateAuthUrl(port: number, token: string): string {
  const addresses = getLocalIPAddresses();

  // Prefer local network address (192.168.x.x or 10.x.x.x)
  const localAddress = addresses.find(
    (addr) => addr.startsWith('192.168.') || addr.startsWith('10.')
  );

  const host = localAddress ?? addresses[0] ?? 'localhost';

  return `http://${host}:${port}/login?token=${token}`;
}

/**
 * Display QR code in terminal
 * Note: Requires 'qrcode-terminal' package to be installed
 * Falls back to displaying URL if package not available
 */
export async function displayQRCode(url: string): Promise<void> {
  try {
    // Try to load qrcode-terminal dynamically
    const { default: qrcodeTerminal } = await import('qrcode-terminal');

    logger.info('📱 Scan this QR code with your mobile device:');

    qrcodeTerminal.generate(url, { small: true }, (qrcode: string) => {
      // QR code needs console.log for proper rendering
      // eslint-disable-next-line no-console
      console.log(qrcode);
    });

    logger.info('');
  } catch {
    // If qrcode-terminal is not installed, just display the URL
    logger.info('📱 Mobile Setup URL:');
    logger.info(`   ${url}`);
    logger.info('   (Install qrcode-terminal package to display QR code)');
  }
}

/**
 * Display server startup information
 */
export function displayServerInfo(port: number, token: string): void {
  const authUrl = generateAuthUrl(port, token);
  const addresses = getLocalIPAddresses();

  logger.info('✅ Web server started successfully!');
  logger.info('📍 Server URLs:');
  logger.info(`   Local:   http://localhost:${port}`);

  if (addresses.length > 0) {
    for (const addr of addresses) {
      logger.info(`   Network: http://${addr}:${port}`);
    }
  }

  logger.info('🔐 Authentication:');
  logger.info(`   Token: ${token}`);
  logger.info(`   Include in requests: Authorization: Bearer ${token}`);

  logger.info('📱 Mobile Setup:');

  // Display QR code (async, but don't wait for it)
  void displayQRCode(authUrl);
}
