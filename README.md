# 🌊 uWaver

Web-based configuration tool for uWave hydroacoustic modem.

## Features

- Device settings (code channels, salinity, gravity, command mode)
- Remote control commands (ping, depth, temperature, voltage) with auto mode
- Packet mode (data transmission, telemetry requests)
- Local sensors monitoring (pressure, temperature, depth, voltage, pitch, roll)
- AQ-PNG (Auto-Query / Pinger) configuration
- Full exchange logging
- RU/EN localization

## Usage

Open in Chrome/Edge: https://ucnl.github.io/uWaver/

Or run locally via any HTTP server (Web Serial API requires secure context).

## Protocol

NMEA-like proprietary sentences over UART (`$PUWVx,...`). 9600 baud, 8N1.

## License

GNU GPL v3.0 — see [LICENSE](LICENSE)

---
© 2026 [UC&NL](https://docs.unavlab.com/)