# 🌊 uWaver

[English](#english) | [Русский](#русский)

---

## English

Web-based configuration tool for [uWave](https://docs.unavlab.com/underwater_acoustic_modems_en.html#uwave) hydroacoustic modem.

### Features

- Device settings (code channels, salinity, gravity, command mode)
- Remote control commands (ping, depth, temperature, voltage) with auto mode
- Packet mode (data transmission, telemetry requests)
- Local sensors monitoring (pressure, temperature, depth, voltage, pitch, roll)
- AQ-PNG (Auto-Query / Pinger) configuration
- Full exchange logging
- RU/EN localization

### Usage

Open in Chrome/Edge: https://ucnl.github.io/uWaver/

Or run locally via any HTTP server (Web Serial API requires secure context).

### Protocol

[NMEA-like proprietary sentences](https://docs.unavlab.com/documentation/EN/uWAVE/uWAVE_Protocol_Specification_en.html) over UART (`$PUWVx,...`). 9600 baud, 8N1.

### License

GNU GPL v3.0 — see [LICENSE](LICENSE)

---
© 2026 [UC&NL](https://docs.unavlab.com/)

---

## Русский

Веб-инструмент для конфигурирования гидроакустического модема [uWave](https://docs.unavlab.com/underwater_acoustic_modems_ru.html#uwave).

### Возможности

- Настройки устройства (кодовые каналы, солёность, гравитация, командный режим)
- Команды удалённого управления (пинг, глубина, температура, напряжение) с авто-режимом
- Пакетный режим (передача данных, запросы телеметрии)
- Мониторинг локальных сенсоров (давление, температура, глубина, напряжение, крен, дифферент)
- Настройка AQ-PNG (Auto-Query / Pinger)
- Полное логирование обмена
- Локализация РУ/АНГ

### Использование

Откройте в Chrome/Edge: https://ucnl.github.io/uWaver/

Или запустите локально через любой HTTP-сервер (Web Serial API требует безопасного контекста).

### Протокол

[NMEA-подобные проприетарные сообщения](https://docs.unavlab.com/documentation/RU/uWAVE/uWAVE_Protocol_Specification_ru.html) по UART (`$PUWVx,...`). 9600 бод, 8N1.

### Лицензия

GNU GPL v3.0 — см. [LICENSE](LICENSE)

---
© 2026 [UC&NL](https://docs.unavlab.com/)